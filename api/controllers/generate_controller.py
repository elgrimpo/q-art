# Libraries Import
import qrcode
import httpx
from dotenv import load_dotenv
import os
from novita_client import *
import aioboto3
import base64
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
import motor.motor_asyncio as motor
import certifi
from io import BytesIO
from PIL import Image
import asyncio
import functools
import logging
import time
import contextlib
from contextlib import asynccontextmanager

# App imports
from api.controllers.images_controller import (
    create_image_doc,
    upload_image_to_s3,
    update_image,
)
from api.utils.utils import (
    prepare_img2img_request,
    create_watermark,
    normalize_qr_url,
)
from api.controllers.users_controller import increment_user_count
from api.utils.structural_score import structural_score


load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MONGO DB
mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
client = motor.AsyncIOMotorClient(mongo_url, **_tls)
db = client.get_database("QART")
images = db.get_collection("images")

# S3
api_url = os.environ["S3_URL"]
s3_bucket_name = "qrartimages"
s3_bucket_watermarked_name = "qrartimageswatermarked"
s3_session = aioboto3.Session()
# Novita
client = NovitaClient(os.environ["NOVITA_KEY"])

# Bound how long we wait on the generated-image download from Novita's CDN.
# Without a cap, one slow or hung upstream response blocks the async event loop
# and can stall every concurrent request on the worker (QRAI-39).
IMAGE_DOWNLOAD_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# ---------------------------------------------------------------------------- #
#                          GENERATION PROGRESS TRACKING                        #
# ---------------------------------------------------------------------------- #

# Module-level job store. A single Heroku dyno runs this process, so an
# in-memory dict is enough — no Redis/Mongo needed, and job state has no
# value once the client has read the final result.
_jobs: dict[str, dict] = {}

_JOB_RETENTION_SECONDS = 600  # 10 minutes past a terminal state

# Weight given to each pipeline stage's share of overall progress, derived
# from real timing logs (4-run range in seconds): Novita 5.97-15.0 (mid 10.5),
# download 1.05-1.76 (mid 1.4), S3 uploads 3.16-7.98 (mid 5.6). First-pass
# constants — easy to retune later against real logs, not meant to be exact.
STAGE_ORDER = ["prep", "novita", "download", "processing", "upload", "finishing"]
STAGE_WEIGHTS = {
    "prep": 3,        # QR build, request build (credit-check removed)
    "novita": 55,     # img2img_v3 submit + poll — real progress_percent signal
    "download": 8,    # downloading the generated image
    "processing": 2,  # scannability score, create_image_doc, create_watermark
    "upload": 30,     # concurrent S3 uploads (original + watermarked)
    "finishing": 2,   # update_image_doc, increment_user_count
}

# Expected duration (seconds) for stages that get a synthetic time-based ramp
# instead of a real progress signal (see _progress_ramp below).
STAGE_EXPECTED_SECONDS = {
    "download": 1.4,
    "upload": 5.6,
}


def _stage_bounds(stage_name: str) -> tuple[int, int]:
    """Return (start_percent, end_percent) for a stage, based on cumulative
    STAGE_WEIGHTS in STAGE_ORDER."""
    start = 0
    for name in STAGE_ORDER:
        end = start + STAGE_WEIGHTS[name]
        if name == stage_name:
            return start, end
        start = end
    raise KeyError(f"Unknown stage: {stage_name}")


def _update_job(job_id: str, **fields) -> None:
    """Upsert fields into a job's state. Doesn't require seed_job() to have
    run first, so predict() can be called directly (as the test suite does)
    without KeyError-ing on a missing entry."""
    job = _jobs.setdefault(job_id, {})
    job.update(fields)
    if "updated_at" not in fields:
        job["updated_at"] = time.time()


def seed_job(job_id: str, user_id: str) -> None:
    """Called by the /api/generate/start route before firing the background
    generation task, so a poll arriving before predict() writes anything
    still sees a valid (queued) job."""
    _jobs[job_id] = {
        "user_id": user_id,
        "status": "queued",
        "percent": 0,
        "stage": "prep",
        "eta": None,
        "result": None,
        "error": None,
        "updated_at": time.time(),
    }


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def sweep_old_jobs() -> None:
    """Drop terminal jobs older than _JOB_RETENTION_SECONDS. Called once per
    new job start — no TTL infra needed for a dict this small."""
    now = time.time()
    stale_ids = [
        jid for jid, job in _jobs.items()
        if job.get("status") in ("succeeded", "failed")
        and now - job.get("updated_at", now) > _JOB_RETENTION_SECONDS
    ]
    for jid in stale_ids:
        del _jobs[jid]


@asynccontextmanager
async def _progress_ramp(job_id: str, stage_name: str):
    """Advance a job's progress with a time-based ramp while an operation
    with no fine-grained real signal (image download, S3 upload) is in
    flight. Ticks every 0.3s, capped at 95% of the stage's budget until the
    operation actually finishes, then jumps to the stage's end percent."""
    start, end = _stage_bounds(stage_name)
    expected = STAGE_EXPECTED_SECONDS[stage_name]
    began = time.perf_counter()

    async def _tick():
        while True:
            elapsed = time.perf_counter() - began
            fraction = min(elapsed / expected, 0.95)
            _update_job(
                job_id,
                status="processing",
                stage=stage_name,
                percent=round(start + fraction * (end - start)),
            )
            await asyncio.sleep(0.3)

    ticker = asyncio.create_task(_tick())
    try:
        yield
    finally:
        ticker.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await ticker
        _update_job(job_id, stage=stage_name, percent=end)


async def download_image_bytes(image_url):
    """Download the generated image asynchronously with explicit timeouts.

    Replaces a blocking ``requests.get`` that ran inline on the event loop.
    Awaiting an httpx client keeps the loop free and guarantees the call can't
    hang indefinitely on a slow Novita/CDN response.
    """
    async with httpx.AsyncClient(timeout=IMAGE_DOWNLOAD_TIMEOUT) as http_client:
        response = await http_client.get(image_url)
        response.raise_for_status()
        return response.content


# ---------------------------------------------------------------------------- #
#                                    PREDICT                                   #
# ---------------------------------------------------------------------------- #


async def predict(
    job_id: str,
    prompt: str,
    website: str,
    negative_prompt: str,
    seed: int,
    sd_model: str,
    user_id: str,
    style_id: str,
    style_title: str,
    style_prompt: str,
    loras: list,
    qr_weight: int = 0,
    style_modifier: float = 0,
):
    timings = {}
    request_start = time.perf_counter()

    def mark(step_name, since):
        timings[step_name] = round(time.perf_counter() - since, 3)
        return time.perf_counter()

    _update_job(job_id, status="processing", stage="prep", percent=0)

    try:
        t = time.perf_counter()

        # ------------------------------ CREATE QR CODE ------------------------------ #
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(normalize_qr_url(website))

        qr_image = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        # PNG (lossless) keeps the QR edges crisp — JPEG compression softens the
        # sharp module borders that ControlNet depends on, hurting scannability.
        qr_image.save(buffer, format="PNG")
        buffer.seek(0)
        image_base64_str = base64.b64encode(buffer.getvalue()).decode("ascii")

        t = mark("qr_code_build", t)

        # -------------------------- GENERATE IMAGE AND SAVE ------------------------- #

        # Log what we're *asking* Novita to apply. This is the only
        # ground-truth record of intent — Novita's response doesn't echo
        # back a "loras applied" flag, so this is also what you'd compare
        # against debug_info.request_info below to catch a silently
        # dropped/unresolved LoRA name.
        logger.info(
            "Requesting loras for style '%s': %s",
            style_title,
            [{"model_name": l.model_name, "strength": l.strength} for l in loras],
        )

        req = prepare_img2img_request(
                    prompt,
                    negative_prompt,
                    sd_model,
                    seed,
                    image_base64_str,
                    qr_weight,
                    style_prompt,
                    loras=loras,
                    style_modifier=style_modifier,
                )

        t = mark("build_img2img_request", t)
        _update_job(job_id, stage="prep", percent=_stage_bounds("prep")[1])

        def _novita_progress_callback(progress):
            task = progress.task
            if task.progress_percent is None:
                return
            start, end = _stage_bounds("novita")
            overall = start + (task.progress_percent / 100) * (end - start)
            _update_job(
                job_id,
                status="processing",
                stage="novita",
                percent=round(overall),
                eta=task.eta,
            )

        try:
            # Novita calls are network I/O — run in a thread pool so the event
            # loop stays free. ProcessPoolExecutor (the old approach) spawns new
            # OS processes for each request, which is expensive and unnecessary
            # for I/O-bound work (QRAI-40).
            #
            # img2img_v3() already submits, polls wait_for_task_v3() internally,
            # and returns the finished response — calling wait_for_task_v3()
            # again ourselves was a redundant extra round trip. download_images
            # is set False because the client's default behavior
            # downloads+base64-encodes every result image before returning,
            # which we then discarded anyway since we re-download the bytes
            # ourselves below via download_image_bytes(). callback fires on
            # every poll with a real progress_percent/eta from Novita.
            res = await asyncio.to_thread(
                functools.partial(
                    client.img2img_v3,
                    download_images=False,
                    callback=_novita_progress_callback,
                    **req,
                )
            )

            if res is None:
                raise NovitaResponseError(
                    f"Text to Image generation failed with response {res}, code: Unknown"
                )

            task_id = res.task.task_id

            logger.debug("Novita task id: %s", task_id)

            t = mark("novita_generate", t)
            _update_job(job_id, stage="novita", percent=_stage_bounds("novita")[1])

            # Novita's response has no explicit "loras applied" field, but
            # debug_info.request_info is the request as Novita actually
            # resolved/executed it — if a LoRA name didn't resolve, it will
            # either be missing here or the task will fail with a reason
            # below. Compare this against the "Requesting loras" line above.
            debug_info = res.extra.debug_info if res.extra else None
            logger.info(
                "Novita task %s resolved request_info: %s",
                task_id,
                debug_info.request_info if debug_info else None,
            )

            # After waiting for task completion
            if res.task.status != V3TaskResponseStatus.TASK_STATUS_SUCCEED:
                logger.error(
                    "Novita task %s failed; requested loras were: %s",
                    task_id,
                    [{"model_name": l.model_name, "strength": l.strength} for l in loras],
                )
                raise Exception(f"Failed to generate image with error: {res.task.reason}")

            # Extract seed and image
            seed = res.extra.seed if res.extra else None
            image_url = res.get_image_urls()[0]  # Or iterate if multiple

            # Download image (async + timed out so a slow CDN can't hang the loop)
            async with _progress_ramp(job_id, "download"):
                image_bytes = await download_image_bytes(image_url)
            generated_image = Image.open(BytesIO(image_bytes))

            t = mark("image_download", t)

            # Score the styled image structurally. Non-fatal — a failure must
            # never block delivery.
            try:
                score_result = await asyncio.to_thread(
                    structural_score, generated_image, normalize_qr_url(website)
                )
                scannability_score = score_result.score
            except Exception:
                logger.warning("Scannability scoring failed", exc_info=True)
                scannability_score = None

            t = mark("structural_score", t)

        except Exception as generation_error:
            logger.error("Image generation failed", exc_info=True)
            raise HTTPException(status_code=500, detail="Image generation failed")

        # ------------------------------ UPDATE DATABASE ----------------------------- #
        try:
            inserted_image_id = await create_image_doc(
                req,
                seed,
                website,
                qr_weight,
                user_id,
                prompt,
                style_prompt,
                style_title,
                style_id,
            )

            t = mark("create_image_doc", t)

            # Apply watermark to the original image
            watermarked_image = create_watermark(generated_image)

            t = mark("create_watermark", t)
            _update_job(job_id, stage="processing", percent=_stage_bounds("processing")[1])

            # Create name for image files
            object_name = f"{inserted_image_id}.png"

            # Upload original + watermarked images to S3 concurrently — they're
            # independent uploads to different buckets, so there's no reason
            # to wait on one before starting the other.
            async with _progress_ramp(job_id, "upload"):
                original_image_url, watermarked_image_url = await asyncio.gather(
                    upload_image_to_s3(generated_image, object_name, s3_bucket_name),
                    upload_image_to_s3(
                        watermarked_image, object_name, s3_bucket_watermarked_name
                    ),
                )

            t = mark("s3_uploads", t)

            # Update the image document with image URLs
            updated_data = {
                "image_url": original_image_url,
                "watermarked_image_url": watermarked_image_url,
                "scannability_score": scannability_score,
            }

            updated_image = await update_image(inserted_image_id, updated_data)

            t = mark("update_image_doc", t)

        except Exception as db_error:
            logger.error("Database insertion failed", exc_info=True)
            raise HTTPException(status_code=500, detail="Database insertion failed")

        # ---------------------- UPDATE USER CREDITS AND COUNT ---------------------- #
        try:
            if not str(user_id).startswith("guest_"):
                await increment_user_count(user_id, {"generate": "1"})
        except Exception:
            # Handle user count update error
            raise HTTPException(status_code=500, detail="User count update failed")

        t = mark("increment_user_count", t)
        _update_job(job_id, stage="finishing", percent=100)

        timings["total"] = round(time.perf_counter() - request_start, 3)
        logger.info("predict() step timings (seconds): %s", timings)

        return updated_image

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception:
        logger.error("Unexpected error in predict", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def start_generation(
    job_id,
    prompt,
    website,
    negative_prompt,
    seed,
    sd_model,
    user_id,
    style_id,
    style_title,
    style_prompt,
    loras,
    qr_weight=0,
    style_modifier=0,
):
    """Fire-and-forget wrapper around predict(), run via asyncio.create_task
    from the /api/generate/start route. Always leaves _jobs[job_id] in a
    terminal state, even if predict() raises — otherwise an exception here
    would just be an unretrieved asyncio task error, logged but invisible to
    the client, which would then poll forever."""
    try:
        result = await predict(
            job_id, prompt, website, negative_prompt, seed, sd_model,
            user_id, style_id, style_title, style_prompt, loras, qr_weight, style_modifier,
        )
        _update_job(job_id, status="succeeded", percent=100, stage="finishing", result=result)
    except Exception:
        logger.error("Generation job %s failed", job_id, exc_info=True)
        _update_job(job_id, status="failed", error="GenerationFailed")

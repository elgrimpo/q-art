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
from pymongo import ReturnDocument
import certifi
from io import BytesIO
from PIL import Image
import asyncio
import functools
import logging

# App imports
from api.controllers.images_controller import (
    create_image_doc,
    upload_image_to_s3,
    update_image,
)
from api.utils.utils import (
    prepare_img2img_request,
    create_watermark,
    parse_style_loras,
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
guest_credits_col = db.get_collection("guest_credits")

GUEST_FREE_CREDITS = 3

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
    prompt: str,
    website: str,
    negative_prompt: str,
    seed: int,
    sd_model: str,
    user_id: str,
    style_prompt: str,
    style_title: str,
    style_loras: str = "[]",
    qr_weight: int = 0,
    style_modifier: int = 0,
):
    try:
        # --------------------------------- CHECK FUNDS ------------------------------- #
        # Handle guest users: enforce server-side quota via atomic MongoDB counter.
        if str(user_id).startswith("guest_"):
            result = await guest_credits_col.find_one_and_update(
                {"_id": user_id},
                {"$inc": {"used": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            if result["used"] > GUEST_FREE_CREDITS:
                # Undo the increment so the counter stays stable at the limit.
                await guest_credits_col.update_one({"_id": user_id}, {"$inc": {"used": -1}})
                raise HTTPException(status_code=403, detail="Insufficient credits")

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

        # -------------------------- GENERATE IMAGE AND SAVE ------------------------- #

        loras = parse_style_loras(style_loras)

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

        try:
            # Novita calls are network I/O — run in a thread pool so the event
            # loop stays free. ProcessPoolExecutor (the old approach) spawns new
            # OS processes for each request, which is expensive and unnecessary
            # for I/O-bound work (QRAI-40).
            txt2img_result = await asyncio.to_thread(
                functools.partial(client.img2img_v3, **req)
            )

            if txt2img_result is None:
                raise NovitaResponseError(
                    f"Text to Image generation failed with response {txt2img_result}, code: Unknown"
                )

            task_id = txt2img_result.task.task_id

            logger.debug("Novita task id: %s", task_id)

            res = await asyncio.to_thread(client.wait_for_task_v3, task_id)

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
            image_bytes = await download_image_bytes(image_url)
            generated_image = Image.open(BytesIO(image_bytes))

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
            )
            # ---------------------------- UPLOAD IMAGES TO S3 --------------------------- #

            # Apply watermark to the original image
            watermarked_image = create_watermark(generated_image)

            # Create name for image files
            object_name = f"{inserted_image_id}.png"

            # Upload original image to S3
            original_image_url = await upload_image_to_s3(
                generated_image, object_name, s3_bucket_name
            )

            # Upload watermarked image to S3
            watermarked_image_url = await upload_image_to_s3(
                watermarked_image, object_name, s3_bucket_watermarked_name
            )

            # Update the image document with image URLs
            updated_data = {
                "image_url": original_image_url,
                "watermarked_image_url": watermarked_image_url,
                "scannability_score": scannability_score,
            }

            updated_image = await update_image(inserted_image_id, updated_data)

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

        return updated_image

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception:
        logger.error("Unexpected error in predict", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

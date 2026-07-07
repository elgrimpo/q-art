# Generation Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/api/generate` from a single blocking request into a start+poll pair so the frontend can show a real, weighted progress bar (Novita's own `progress_percent` plus the rest of the pipeline) instead of a static loading GIF.

**Architecture:** `POST /api/generate/start` mints a `job_id`, seeds an in-memory job-state dict, fires `predict()` as a background `asyncio` task, and returns immediately. `GET /api/generate/progress/{job_id}` reads that dict. `predict()` writes stage/percent into the dict as it runs — a real signal from Novita's poll callback during the (dominant, ~55%) Novita segment, and a time-based ramp for the download/upload segments which have no fine-grained real signal. The frontend polls every ~1.2s and renders a thin bottom-edge bar; `IteratePanel.js`'s existing "New Variation"/"Retry" flow keeps working unchanged via a `generateImage()` compatibility wrapper that polls to completion server-side.

**Tech Stack:** FastAPI, `novita_client`, Motor/MongoDB, Next.js 14 App Router (Server Actions), MUI v5, Zustand, Jest + Testing Library, pytest.

## Global Constraints

- Job/progress state lives in a module-level Python dict in `generate_controller.py` — no new infra (no Redis, no Mongo collection). Single Heroku dyno, so this is safe.
- `STAGE_WEIGHTS` percentages must sum to exactly 100.
- `POST /api/generate/start` keeps the existing `20/hour` rate limit. `GET /api/generate/progress/{job_id}` gets its own `120/minute` limit (polled every ~1.2s for the duration of a generation).
- The guest-credit quota (`GUEST_FREE_CREDITS`, `guest_credits_col`) is deleted outright, no replacement — QRAI-53 already made generation free, and there's no real traffic yet.
- No numeric percent label in the UI — a thin visual bar only, matching the approved reference screenshot.
- Frontend polls every ~1.2s and gives up (surfacing `GenerationFailed`) after ~2 minutes without a terminal status.
- `IteratePanel.js` must not need any changes — it keeps calling `generateImage(payload)` and expects a single awaited promise resolving to the finished image.

---

## Task 1: Job store + stage-weighting helpers

**Files:**
- Modify: `api/controllers/generate_controller.py` (add helpers near the top, after the existing client initialization block, before `download_image_bytes`)
- Modify: `api/tests/conftest.py` (add autouse fixture to clear job state between tests)
- Create: `api/tests/test_generate_progress.py`

**Interfaces:**
- Produces: `seed_job(job_id: str, user_id: str) -> None`, `get_job(job_id: str) -> dict | None`, `sweep_old_jobs() -> None`, `_update_job(job_id, **fields) -> None`, `_stage_bounds(stage_name: str) -> tuple[int, int]`, `_progress_ramp(job_id, stage_name)` (async context manager), module constants `STAGE_ORDER`, `STAGE_WEIGHTS`, `STAGE_EXPECTED_SECONDS`, `_jobs` (dict). These are consumed by Task 2 (`predict()`), Task 3 (`start_generation()`), and Task 4 (`main.py` routes).

- [ ] **Step 1: Write the failing tests**

Create `api/tests/test_generate_progress.py`:

```python
import pytest

from api.controllers.generate_controller import (
    seed_job,
    get_job,
    sweep_old_jobs,
    _update_job,
    _stage_bounds,
    _jobs,
    STAGE_ORDER,
    STAGE_WEIGHTS,
)


def test_stage_weights_sum_to_100():
    assert sum(STAGE_WEIGHTS.values()) == 100


def test_stage_bounds_are_contiguous_and_end_at_100():
    start = 0
    for name in STAGE_ORDER:
        bound_start, bound_end = _stage_bounds(name)
        assert bound_start == start
        assert bound_end == start + STAGE_WEIGHTS[name]
        start = bound_end
    assert start == 100


def test_stage_bounds_raises_for_unknown_stage():
    with pytest.raises(KeyError):
        _stage_bounds("not-a-real-stage")


def test_seed_job_creates_queued_entry():
    seed_job("job-seed-1", "user-1")
    job = get_job("job-seed-1")
    assert job["user_id"] == "user-1"
    assert job["status"] == "queued"
    assert job["percent"] == 0
    assert job["stage"] == "prep"
    assert job["result"] is None
    assert job["error"] is None


def test_get_job_returns_none_for_unknown_id():
    assert get_job("does-not-exist") is None


def test_update_job_upserts_without_preseeding():
    """predict() may run against a job_id nobody called seed_job() for yet
    (e.g. direct test calls) — _update_job must not KeyError."""
    _update_job("job-fresh", status="processing", percent=10)
    job = get_job("job-fresh")
    assert job["status"] == "processing"
    assert job["percent"] == 10


def test_sweep_old_jobs_removes_only_stale_terminal_jobs():
    seed_job("job-old-done", "user-1")
    _update_job("job-old-done", status="succeeded", updated_at=0)  # ancient timestamp
    seed_job("job-recent-done", "user-1")
    _update_job("job-recent-done", status="succeeded")  # just updated, not stale
    seed_job("job-in-progress", "user-1")  # not terminal, must never be swept

    sweep_old_jobs()

    assert get_job("job-old-done") is None
    assert get_job("job-recent-done") is not None
    assert get_job("job-in-progress") is not None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && venv/bin/pytest tests/test_generate_progress.py -v`
Expected: FAIL — `ImportError: cannot import name 'seed_job' from 'api.controllers.generate_controller'` (none of these names exist yet).

- [ ] **Step 3: Add the autouse job-clearing fixture**

In `api/tests/conftest.py`, append:

```python
import pytest


@pytest.fixture(autouse=True)
def _clear_generation_jobs():
    """The job store is a module-level dict — clear it between tests so job
    state from one test never leaks into another."""
    from api.controllers.generate_controller import _jobs
    _jobs.clear()
    yield
    _jobs.clear()
```

- [ ] **Step 4: Implement the job store and weighting helpers**

In `api/controllers/generate_controller.py`, add near the top imports:

```python
import contextlib
from contextlib import asynccontextmanager
```

After the existing client-initialization block (after the `IMAGE_DOWNLOAD_TIMEOUT = ...` line, before `async def download_image_bytes`), add:

```python
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api && venv/bin/pytest tests/test_generate_progress.py -v`
Expected: PASS (7 tests).

- [ ] **Step 6: Run the full backend suite to confirm nothing else broke**

Run: `cd api && venv/bin/pytest tests/ -v --ignore=tests/e2e`
Expected: PASS (all existing tests unaffected — these are pure additions).

- [ ] **Step 7: Commit**

```bash
git add api/controllers/generate_controller.py api/tests/conftest.py api/tests/test_generate_progress.py
git commit -m "feat: add in-memory job store and stage-weighting helpers for generation progress"
```

---

## Task 2: Remove guest-credit check, thread job_id and progress writes through predict()

**Files:**
- Modify: `api/controllers/generate_controller.py`
- Modify: `api/tests/test_generate.py`

**Interfaces:**
- Consumes: `_update_job`, `_stage_bounds`, `_progress_ramp`, `STAGE_ORDER`, `STAGE_WEIGHTS` (Task 1)
- Produces: `predict(job_id: str, prompt: str, website: str, negative_prompt: str, seed: int, sd_model: str, user_id: str, style_prompt: str, style_title: str, style_loras: str = "[]", qr_weight: int = 0, style_modifier: float = 0)` — same return contract as before (returns the `updated_image` dict, raises `HTTPException`), consumed by Task 3 (`start_generation`) and existing tests.

- [ ] **Step 1: Update the shared test fixtures for the new signature**

In `api/tests/test_generate.py`, add `job_id` to the shared kwargs dict:

```python
PREDICT_KWARGS = dict(
    job_id="test-job-1",
    prompt="a dragon",
    website="https://example.com",
    negative_prompt="ugly blurry",
    seed=42,
    sd_model="sd-v1-5",
    user_id=FAKE_IMAGE_ID,
    style_prompt=", cinematic",
    style_title="Cinematic",
)
```

- [ ] **Step 2: Delete the now-dead guest-quota tests**

In `api/tests/test_generate.py`, delete these two test functions entirely (they patch `guest_credits_col`, which is being removed):
- `test_generate_guest_skips_db_credit_check`
- `test_generate_guest_exhausted_quota_raises_403`

- [ ] **Step 3: Add a test asserting predict() leaves the job at 100%/finishing**

Append to `api/tests/test_generate.py`, in the section near the other predict()-behavior tests:

```python
@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_generate_leaves_job_at_100_percent_finishing(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """By the time predict() returns, the job's progress must reflect 100%
    complete — start_generation() (Task 3) relies on this to mark 'succeeded'."""
    from api.controllers.generate_controller import get_job

    await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    job = get_job(PREDICT_KWARGS["job_id"])
    assert job["percent"] == 100
    assert job["stage"] == "finishing"
```

- [ ] **Step 4: Run the new/updated tests to verify they fail**

Run: `cd api && venv/bin/pytest tests/test_generate.py -v -k "leaves_job_at_100 or does_not_check_credits"`
Expected: FAIL — `predict()` doesn't accept `job_id` yet (`TypeError: predict() got an unexpected keyword argument 'job_id'`), and the new job-progress test finds no job at all.

- [ ] **Step 5: Remove the guest-credit check and wire progress into predict()**

In `api/controllers/generate_controller.py`:

1. Remove `from pymongo import ReturnDocument` (only used by the block being deleted).
2. Remove these two lines from the client-initialization block:
   ```python
   guest_credits_col = db.get_collection("guest_credits")

   GUEST_FREE_CREDITS = 3
   ```
3. Replace the entire `predict()` function with:

```python
async def predict(
    job_id: str,
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd api && venv/bin/pytest tests/test_generate.py -v`
Expected: PASS (all tests, including the new one; the two guest-quota tests are gone).

- [ ] **Step 7: Commit**

```bash
git add api/controllers/generate_controller.py api/tests/test_generate.py
git commit -m "refactor: remove dead guest-credit check, thread progress tracking through predict()"
```

---

## Task 3: Background-task wrapper (`start_generation`)

**Files:**
- Modify: `api/controllers/generate_controller.py`
- Modify: `api/tests/test_generate_progress.py`

**Interfaces:**
- Consumes: `predict()` (Task 2), `_update_job`, `get_job`, `seed_job` (Task 1)
- Produces: `start_generation(job_id, prompt, website, negative_prompt, seed, sd_model, user_id, style_prompt, style_title, style_loras="[]", qr_weight=0, style_modifier=0) -> None` — consumed by Task 4 (`main.py`'s `/start` route, via `asyncio.create_task`)

- [ ] **Step 1: Write the failing tests**

Append to `api/tests/test_generate_progress.py`:

```python
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from api.controllers.generate_controller import start_generation


@patch("api.controllers.generate_controller.predict", new_callable=AsyncMock)
async def test_start_generation_marks_job_succeeded(mock_predict):
    mock_predict.return_value = {"_id": "abc123", "image_url": "https://example.com/img.png"}
    seed_job("job-ok", "user-1")

    await start_generation(
        "job-ok", "a dragon", "https://example.com", "", 42, "sd-v1-5",
        "user-1", "", "", "[]", 0, 0,
    )

    job = get_job("job-ok")
    assert job["status"] == "succeeded"
    assert job["percent"] == 100
    assert job["result"]["_id"] == "abc123"


@patch("api.controllers.generate_controller.predict", new_callable=AsyncMock)
async def test_start_generation_marks_job_failed_on_exception(mock_predict):
    mock_predict.side_effect = HTTPException(status_code=500, detail="Image generation failed")
    seed_job("job-fail", "user-1")

    await start_generation(
        "job-fail", "a dragon", "https://example.com", "", 42, "sd-v1-5",
        "user-1", "", "", "[]", 0, 0,
    )

    job = get_job("job-fail")
    assert job["status"] == "failed"
    assert job["error"] == "GenerationFailed"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && venv/bin/pytest tests/test_generate_progress.py -v -k start_generation`
Expected: FAIL — `ImportError: cannot import name 'start_generation'`.

- [ ] **Step 3: Implement `start_generation`**

In `api/controllers/generate_controller.py`, add after `predict()`:

```python
async def start_generation(
    job_id,
    prompt,
    website,
    negative_prompt,
    seed,
    sd_model,
    user_id,
    style_prompt,
    style_title,
    style_loras="[]",
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
            user_id, style_prompt, style_title, style_loras, qr_weight, style_modifier,
        )
        _update_job(job_id, status="succeeded", percent=100, stage="finishing", result=result)
    except Exception:
        logger.error("Generation job %s failed", job_id, exc_info=True)
        _update_job(job_id, status="failed", error="GenerationFailed")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && venv/bin/pytest tests/test_generate_progress.py -v`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add api/controllers/generate_controller.py api/tests/test_generate_progress.py
git commit -m "feat: add start_generation background-task wrapper"
```

---

## Task 4: `main.py` routes — `/api/generate/start` + `/api/generate/progress/{job_id}`

**Files:**
- Modify: `api/main.py`
- Modify: `api/tests/test_http.py`
- Modify: `api/tests/e2e/test_e2e_generate.py`

**Interfaces:**
- Consumes: `seed_job`, `start_generation`, `get_job`, `sweep_old_jobs` (Tasks 1 and 3)
- Produces: `POST /api/generate/start` → `{"job_id": str}`; `GET /api/generate/progress/{job_id}` → `{"status": str, "percent": int, "stage": str, "eta": int|None, "result"?: dict, "error"?: str}` — consumed by Task 5 (`ImagesUtils.js`)

- [ ] **Step 1: Update `test_http.py`'s generate-route tests for the new shape**

In `api/tests/test_http.py`, replace the two existing generate tests:

```python
async def test_get_generate_returns_422_for_missing_params():
    """All generate params are required; calling without them (and without auth) must return 401."""
    async with _client() as client:
        response = await client.get("/api/generate")

    # Auth dependency fires before param validation — 401, not 422
    assert response.status_code == 401


@patch("api.main.predict", new_callable=AsyncMock)
async def test_get_generate_returns_200_with_all_params(mock_predict):
    mock_predict.return_value = {"image_url": "https://example.com/img.png"}

    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "negative_prompt": "ugly",
        "seed": "42",
        "qr_weight": "1",
        "sd_model": "sd-v1-5",
        "style_prompt": ", cinematic",
        "style_title": "Cinematic",
    }
    async with _client() as client:
        response = await client.get("/api/generate", params=params, headers=_guest_auth_headers())

    assert response.status_code == 200
```

with:

```python
async def test_generate_start_requires_auth():
    """POST /api/generate/start must return 401 with no token (auth fires before param validation)."""
    async with _client() as client:
        response = await client.post("/api/generate/start")

    assert response.status_code == 401


@patch("api.main.start_generation", new_callable=AsyncMock)
async def test_generate_start_returns_job_id(mock_start_generation):
    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "negative_prompt": "ugly",
        "seed": "42",
        "qr_weight": "1",
        "sd_model": "sd-v1-5",
        "style_prompt": ", cinematic",
        "style_title": "Cinematic",
    }
    async with _client() as client:
        response = await client.post("/api/generate/start", params=params, headers=_guest_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("job_id"), str) and body["job_id"]


# ---------------------------------------------------------------------------- #
#                          GENERATION PROGRESS ROUTE                           #
# ---------------------------------------------------------------------------- #

async def test_generate_progress_requires_auth():
    """GET /api/generate/progress/:id must return 401 with no token."""
    async with _client() as client:
        response = await client.get("/api/generate/progress/job-abc")
    assert response.status_code == 401


@patch("api.main.get_job")
async def test_generate_progress_returns_job_status(mock_get_job):
    mock_get_job.return_value = {
        "user_id": "guest_test", "status": "processing", "percent": 42,
        "stage": "novita", "eta": 5, "result": None, "error": None,
    }
    async with _client() as client:
        response = await client.get("/api/generate/progress/job-abc", headers=_guest_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["percent"] == 42
    assert body["stage"] == "novita"


@patch("api.main.get_job")
async def test_generate_progress_404_for_unknown_job(mock_get_job):
    mock_get_job.return_value = None
    async with _client() as client:
        response = await client.get("/api/generate/progress/does-not-exist", headers=_guest_auth_headers())
    assert response.status_code == 404


@patch("api.main.get_job")
async def test_generate_progress_403_for_other_users_job(mock_get_job):
    mock_get_job.return_value = {
        "user_id": "someone_else", "status": "processing", "percent": 10,
        "stage": "prep", "eta": None, "result": None, "error": None,
    }
    async with _client() as client:
        response = await client.get("/api/generate/progress/job-abc", headers=_guest_auth_headers())
    assert response.status_code == 403
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && venv/bin/pytest tests/test_http.py -v -k generate`
Expected: FAIL — `/api/generate/start` and `/api/generate/progress/...` don't exist yet (404s where 200/401/403/404-with-job-check are expected), and `api.main.start_generation`/`api.main.get_job` don't exist to patch.

- [ ] **Step 3: Replace the generate route(s) in `main.py`**

In `api/main.py`:

1. Add to the import block (line 2): change
   ```python
   from fastapi import FastAPI, Header, Depends, Query
   ```
   to
   ```python
   from fastapi import FastAPI, Header, Depends, Query, HTTPException
   ```

2. Add near the top, alongside the other stdlib imports:
   ```python
   import asyncio
   import uuid
   ```

3. Replace:
   ```python
   from api.controllers.generate_controller import predict
   ```
   with:
   ```python
   from api.controllers.generate_controller import seed_job, start_generation, get_job, sweep_old_jobs
   ```

4. Replace the entire `GENERATE ROUTES` section:
   ```python
   # ------------------------------ GENERATE ROUTES ----------------------------- #

   # GENERATE IMAGE
   @app.get("/api/generate")
   @limiter.limit("20/hour")
   async def generate_endpoint(
       request: Request,
       website: Annotated[str, Query(min_length=1, max_length=2048)],
       sd_model: Annotated[str, Query(min_length=1, max_length=200)],
       prompt: Annotated[str, Query(max_length=500)] = "",
       negative_prompt: Annotated[str, Query(max_length=500)] = "",
       style_prompt: Annotated[str, Query(max_length=1000)] = "",
       style_title: Annotated[str, Query(max_length=100)] = "",
       style_loras: Annotated[str, Query(max_length=2000)] = "[]",
       seed: Annotated[int, Query(ge=-1)] = -1,
       qr_weight: Annotated[int, Query(ge=-2, le=2)] = 0,
       style_modifier: Annotated[float, Query(ge=-2, le=2)] = 0,
       current_user: dict = Depends(get_current_user),
   ):
       return await predict(
           prompt,
           website,
           negative_prompt,
           seed,
           sd_model,
           current_user["user_id"],
           style_prompt,
           style_title,
           style_loras,
           qr_weight,
           style_modifier,
       )
   ```
   with:
   ```python
   # ------------------------------ GENERATE ROUTES ----------------------------- #

   # START GENERATION (returns immediately; runs predict() in the background)
   @app.post("/api/generate/start")
   @limiter.limit("20/hour")
   async def generate_start_endpoint(
       request: Request,
       website: Annotated[str, Query(min_length=1, max_length=2048)],
       sd_model: Annotated[str, Query(min_length=1, max_length=200)],
       prompt: Annotated[str, Query(max_length=500)] = "",
       negative_prompt: Annotated[str, Query(max_length=500)] = "",
       style_prompt: Annotated[str, Query(max_length=1000)] = "",
       style_title: Annotated[str, Query(max_length=100)] = "",
       style_loras: Annotated[str, Query(max_length=2000)] = "[]",
       seed: Annotated[int, Query(ge=-1)] = -1,
       qr_weight: Annotated[int, Query(ge=-2, le=2)] = 0,
       style_modifier: Annotated[float, Query(ge=-2, le=2)] = 0,
       current_user: dict = Depends(get_current_user),
   ):
       sweep_old_jobs()
       job_id = str(uuid.uuid4())
       seed_job(job_id, current_user["user_id"])
       asyncio.create_task(start_generation(
           job_id, prompt, website, negative_prompt, seed, sd_model,
           current_user["user_id"], style_prompt, style_title, style_loras,
           qr_weight, style_modifier,
       ))
       return {"job_id": job_id}


   # GENERATION PROGRESS
   @app.get("/api/generate/progress/{job_id}")
   @limiter.limit("120/minute")
   async def generate_progress_endpoint(
       request: Request,
       job_id: str,
       current_user: dict = Depends(get_current_user),
   ):
       job = get_job(job_id)
       if job is None:
           raise HTTPException(status_code=404, detail="Job not found")
       if job["user_id"] != current_user["user_id"]:
           raise HTTPException(status_code=403, detail="Not your job")

       response = {
           "status": job["status"],
           "percent": job["percent"],
           "stage": job["stage"],
           "eta": job["eta"],
       }
       if job["status"] == "succeeded":
           response["result"] = job["result"]
       elif job["status"] == "failed":
           response["error"] = job["error"]
       return response
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && venv/bin/pytest tests/test_http.py -v`
Expected: PASS (all tests).

- [ ] **Step 5: Run the full backend suite**

Run: `cd api && venv/bin/pytest tests/ -v --ignore=tests/e2e`
Expected: PASS (all tests across the whole suite).

- [ ] **Step 6: Update the e2e generation test for the new route shape**

This test isn't run in normal CI (needs `-c pytest-e2e.ini`, costs a real Novita credit) — update it for consistency with the new routes, but don't run it as part of this plan's verification.

Replace `api/tests/e2e/test_e2e_generate.py` in full with:

```python
"""
E2E: Full generation flow — real Novita call, real S3 upload, real MongoDB write.

Run: pytest api/tests/e2e/test_e2e_generate.py -v -c pytest-e2e.ini -s

WARNING: This test costs one Novita credit and writes to the production QART database.
It cleans up after itself, but interrupting it mid-run will leave orphaned records.
"""
import os
import time
import asyncio
import httpx
import pytest
from api.main import app
from api.tests.e2e.conftest import mint_guest_jwt

BASE = "http://test"

GENERATE_PARAMS = {
    "prompt": "a simple red geometric shape",
    "website": "https://qr-ai.co",
    "negative_prompt": "ugly blurry text",
    "seed": "42",
    "qr_weight": "1",
    "sd_model": "cyberrealistic_v40_151857.safetensors",
    "style_prompt": "",
    "style_title": "Custom",
}


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


async def _await_generation(client, job_id, headers, timeout_seconds=180.0):
    """Poll /api/generate/progress/:id until the job reaches a terminal state."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        resp = await client.get(f"/api/generate/progress/{job_id}", headers=headers, timeout=30.0)
        assert resp.status_code == 200, f"Progress endpoint returned {resp.status_code}: {resp.text[:500]}"
        progress = resp.json()
        if progress["status"] == "succeeded":
            return progress["result"]
        if progress["status"] == "failed":
            raise AssertionError(f"Generation job failed: {progress.get('error')}")
        await asyncio.sleep(1.5)
    raise AssertionError(f"Generation job {job_id} did not complete within {timeout_seconds}s")


@pytest.mark.e2e
@pytest.mark.novita
async def test_generate_produces_scannable_image(mongo_db):
    """
    Full generation flow: real Novita call produces image, stored in S3 and MongoDB.

    Steps:
      1. Start generation as a guest user, poll until it completes
      2. Assert response contains image_url and watermarked_image_url
      3. Verify image document written to QART.images
      4. Cleanup: delete via API
    """
    guest_id = f"guest_e2e_{int(time.time() * 1000)}"
    headers = {"Authorization": f"Bearer {mint_guest_jwt(guest_id)}"}
    image_id = None

    try:
        async with _client() as client:
            start_resp = await client.post(
                "/api/generate/start",
                params=GENERATE_PARAMS,
                headers=headers,
                timeout=30.0,
            )
            assert start_resp.status_code == 200, (
                f"Generate start endpoint returned {start_resp.status_code}: {start_resp.text[:500]}"
            )
            job_id = start_resp.json()["job_id"]

            data = await _await_generation(client, job_id, headers)

        # Both S3 URLs must be present and non-empty
        assert "image_url" in data, "Response missing image_url"
        assert "watermarked_image_url" in data, "Response missing watermarked_image_url"
        assert data["image_url"].startswith("https://"), "image_url is not an HTTPS URL"
        assert data["watermarked_image_url"].startswith("https://"), \
            "watermarked_image_url is not an HTTPS URL"

        image_id = data.get("_id")
        assert image_id, "Response missing _id"

        # Verify document was written to MongoDB
        from bson import ObjectId
        db_doc = await mongo_db["images"].find_one({"_id": ObjectId(image_id)})
        assert db_doc is not None, f"Image {image_id} not found in QART.images"
        assert db_doc["user_id"] == guest_id
        assert db_doc["image_url"] == data["image_url"]

    finally:
        # Cleanup: delete image via API (exercises the delete endpoint too)
        if image_id:
            async with _client() as client:
                del_resp = await client.delete(
                    f"/api/images/delete/{image_id}",
                    headers=headers,
                    timeout=30.0,
                )
            # 200 or 404 (already deleted) are both acceptable
            assert del_resp.status_code in (200, 404), \
                f"Cleanup delete returned {del_resp.status_code}"
```

(Only real change: uses the start+poll flow instead of a single blocking GET, and drops the `guest_credits` cleanup line since that collection is no longer written to.)

- [ ] **Step 7: Commit**

```bash
git add api/main.py api/tests/test_http.py api/tests/e2e/test_e2e_generate.py
git commit -m "feat: replace blocking /api/generate with start+poll endpoints"
```

---

## Task 5: Frontend data layer — `startGeneration` / `getGenerationProgress` / `generateImage` compat wrapper

**Files:**
- Modify: `src/_utils/ImagesUtils.js`

**Interfaces:**
- Produces: `startGeneration(generateFormValues, user) -> Promise<{job_id: string}>`, `getGenerationProgress(jobId) -> Promise<{status, percent, stage, eta, result?, error?}>` — consumed by Task 6 (`GenerateForm.js`). `generateImage(generateFormValues, user) -> Promise<image>` keeps its existing contract (single awaited promise resolving to the finished image, throwing `Error("GenerationFailed")`/`Error("InsufficientCredits")` on failure) — consumed unchanged by `IteratePanel.js`.

- [ ] **Step 1: Replace `generateImage` in `src/_utils/ImagesUtils.js`**

Replace the entire `GENERATE IMAGE` section (from `/* GENERATE IMAGE */` through the closing `};` of the old `generateImage`) with:

```javascript
/* -------------------------------------------------------------------------- */
/*                              START GENERATION                              */
/* -------------------------------------------------------------------------- */

export const startGeneration = async (generateFormValues, user) => {
  const token = await getBackendToken();
  // loras is an array of objects, which URLSearchParams can't serialize — send
  // it as a single JSON string param (style_loras) the backend decodes.
  const { loras, ...rest } = generateFormValues;
  const payload = {
    ...rest,
    qr_weight: Math.round(Number(generateFormValues.qr_weight) || 0),
    style_modifier: Number(generateFormValues.style_modifier) || 0,
    style_loras: JSON.stringify(loras ?? []),
  };
  const queryParams = new URLSearchParams(payload);
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/start?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data?.detail || "GenerationFailed";
    throw new Error(
      detail === "Insufficient credits" ? "InsufficientCredits" : "GenerationFailed"
    );
  }
  return response.json(); // { job_id }
};

/* -------------------------------------------------------------------------- */
/*                            GET GENERATION PROGRESS                         */
/* -------------------------------------------------------------------------- */

export const getGenerationProgress = async (jobId) => {
  const token = await getBackendToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/progress/${jobId}`,
    {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    const err = new Error("Failed to fetch generation progress");
    err.status = response.status;
    throw err;
  }
  return response.json(); // { status, percent, stage, eta, result?, error? }
};

/* -------------------------------------------------------------------------- */
/*                       GENERATE IMAGE (poll to completion)                  */
/* -------------------------------------------------------------------------- */

// Convenience wrapper for callers that just want the finished image and don't
// need incremental progress (IteratePanel's New Variation / Retry).
// GenerateForm.js polls startGeneration/getGenerationProgress directly instead,
// so it can show live percent while waiting.
export const generateImage = async (generateFormValues, user) => {
  const { job_id } = await startGeneration(generateFormValues, user);
  for (;;) {
    const progress = await getGenerationProgress(job_id);
    if (progress.status === "succeeded") {
      revalidateTag('images');
      revalidateTag('user');
      return progress.result;
    }
    if (progress.status === "failed") {
      throw new Error(progress.error || "GenerationFailed");
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
};
```

- [ ] **Step 2: Run the frontend test suite to confirm `IteratePanel.test.js` still passes unchanged**

Run: `npm run test:frontend -- IteratePanel`
Expected: PASS — `IteratePanel.test.js` mocks the whole `ImagesUtils` module (`jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: jest.fn() }))`), so it's unaffected by `generateImage`'s new internal implementation.

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImagesUtils.js
git commit -m "feat: add startGeneration/getGenerationProgress, keep generateImage as a poll-to-completion wrapper"
```

---

## Task 6: `GenerateForm.js` — poll for progress and drive the loader

**Files:**
- Modify: `src/app/(main_pages)/generate/GenerateForm.js`
- Modify: `src/__tests__/GenerateForm.test.js`

**Interfaces:**
- Consumes: `startGeneration`, `getGenerationProgress` (Task 5); `GeneratingLoader`'s new `percent` prop (Task 7 — Task 7 can land in either order relative to this task since `GeneratingLoader` already accepts extra props harmlessly, but tests for the bar's rendering are in Task 7)

- [ ] **Step 1: Rewrite `GenerateForm.test.js`'s mocks and generation-flow tests**

Overwrite `src/__tests__/GenerateForm.test.js` in full with:

```javascript
/**
 * GenerateForm component tests
 *
 * Strategy:
 * - Mock heavy sub-components (StylesModal, SettingsModal, GeneratingLoader)
 *   to avoid rendering complex MUI/Zustand trees unrelated to this component.
 * - UrlPrompt is NOT mocked because we need its actual inputs to fire change
 *   events and test disabled/enabled state of the Generate button.
 * - The Zustand store (useStore) is real; we reset it between tests via
 *   useStore.setState so each test starts from a known state.
 * - startGeneration/getGenerationProgress are mocked at the module level
 *   because ImagesUtils is a "use server" file with server-only imports
 *   (next/cache, next/navigation).
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as amplitude from '@amplitude/analytics-browser'

// ---- Next.js / auth mocks (must come before component import) ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  notFound: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { email: 'test@example.com' } },
    status: 'authenticated',
    update: jest.fn().mockResolvedValue({ user: {} }),
  }),
}))

// ---- Amplitude ----
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

// ---- ImagesUtils (server action — mock the whole module) ----
const mockStartGeneration = jest.fn()
const mockGetGenerationProgress = jest.fn()
jest.mock('../_utils/ImagesUtils', () => ({
  startGeneration: (...args) => mockStartGeneration(...args),
  getGenerationProgress: (...args) => mockGetGenerationProgress(...args),
  getImages: jest.fn(),
  getImageById: jest.fn(),
  deleteImage: jest.fn(),
  likeImage: jest.fn(),
  unlockImage: jest.fn(),
}))

// ---- Heavy sub-components ----
jest.mock('../app/(main_pages)/generate/(formComponents)/StylesModal', () => ({
  __esModule: true,
  default: () => <div data-testid="styles-modal-stub" />,
}))
jest.mock('../app/(main_pages)/generate/(formComponents)/GeneratingLoader', () => ({
  __esModule: true,
  default: ({ percent }) => <div data-testid="generating-loader" data-percent={percent} />,
}))

// ---- Import component and store AFTER mocks are set ----
import { useStore } from '../store'
import GenerateForm from '../app/(main_pages)/generate/GenerateForm'

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                       */
/* -------------------------------------------------------------------------- */

function getGenerateBtn() {
  return screen.getByRole('button', { name: 'generate' })
}

function resetStore(overrides = {}) {
  useStore.setState({
    user: { id: 'user_123', is_guest: false },
    generateFormValues: {
      website: '',
      prompt: 'a random prompt',
      style_id: 1,
      style_title: 'Random',
      style_prompt: '',
      qr_weight: 0.0,
      negative_prompt: '',
      seed: -1,
      sd_model: 'cyberrealistic_v40_151857.safetensors',
    },
    generatingImage: false,
    alert: { open: false, severity: 'info', message: '' },
    ...overrides,
  })
}

/** A resolved progress response that immediately ends the poll loop. */
function succeeded(result) {
  return { status: 'succeeded', percent: 100, stage: 'finishing', eta: null, result }
}

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  console.error.mockRestore()
})

beforeEach(() => {
  resetStore()
  mockPush.mockClear()
  mockStartGeneration.mockReset()
  mockGetGenerationProgress.mockReset()
  window.sessionStorage.clear()
  amplitude.track.mockClear()
})

/* -------------------------------------------------------------------------- */
/*                                  TESTS                                      */
/* -------------------------------------------------------------------------- */

describe('GenerateForm', () => {
  // ---- 1. Basic rendering ----
  test('renders website input, prompt input, and generate button', () => {
    render(<GenerateForm />)

    expect(screen.getByRole('textbox', { name: /website/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /prompt/i })).toBeInTheDocument()
    expect(getGenerateBtn()).toBeInTheDocument()
  })

  // ---- 2. Generate button disabled when website is empty ----
  test('generate button is disabled when website is empty', () => {
    render(<GenerateForm />)
    const btn = getGenerateBtn()
    expect(btn).toBeDisabled()
  })

  // ---- 3. Generate button enabled when both fields are filled ----
  test('generate button is enabled when website and prompt are both filled', async () => {
    render(<GenerateForm />)
    const websiteInput = screen.getByRole('textbox', { name: /website/i })

    await act(async () => {
      fireEvent.change(websiteInput, { target: { name: 'website', value: 'example.com' } })
    })

    await waitFor(() => {
      expect(getGenerateBtn()).not.toBeDisabled()
    })
  })

  // ---- 4. Calls startGeneration on click, polls once, then navigates (happy path) ----
  test('calls startGeneration with form values on generate click', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-1' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)
    const btn = getGenerateBtn()

    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(mockStartGeneration).toHaveBeenCalledTimes(1)
    })

    const [formArg] = mockStartGeneration.mock.calls[0]
    expect(formArg.website).toBe('example.com')
    expect(formArg.prompt).toBe('a dragon')

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/images/img_abc?justGenerated=true')
    })
  })

  // ---- 5. Shows generating loader when generatingImage is true ----
  test('shows GeneratingLoader (and hides form) when generatingImage is true', () => {
    resetStore({ generatingImage: true })
    render(<GenerateForm />)

    expect(screen.getByTestId('generating-loader')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /website/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'generate' })).not.toBeInTheDocument()
  })

  // ---- 6. Logged-in users have no client-side credit gate — generation proceeds ----
  test('calls startGeneration even when logged-in user has no credits field', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-2' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))

    resetStore({
      user: { id: 'user_123', is_guest: false },
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(mockStartGeneration).toHaveBeenCalledTimes(1)
    })
  })

  // ---- 7. Shows "Sign in to keep going" dialog when backend rejects with InsufficientCredits error ----
  test('shows "Sign in to keep going" dialog when backend rejects with InsufficientCredits error', async () => {
    mockStartGeneration.mockRejectedValueOnce(new Error('InsufficientCredits'))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(screen.getByText('Sign in to keep going')).toBeInTheDocument()
    })
  })

  // ---- 8. Progress percent reaches the loader across multiple polls ----
  test('updates the loader percent as progress polls come back, then navigates on success', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-3' })
    mockGetGenerationProgress
      .mockResolvedValueOnce({ status: 'processing', percent: 20, stage: 'novita', eta: 5 })
      .mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(screen.getByTestId('generating-loader').dataset.percent).toBe('20')
    })

    // Real ~1.2s poll interval — wait past it so the second (final) poll fires.
    await new Promise((resolve) => setTimeout(resolve, 1300))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/images/img_abc?justGenerated=true')
    })
  }, 10000)

  // ---- 9 & 10. Regeneration props on Generate Image event ----

  function getGenerateImageProps() {
    const call = amplitude.track.mock.calls.find((c) => c[0] === 'Generate Image')
    return call ? call[1] : null
  }

  function fillForm() {
    resetStore({
      generateFormValues: {
        website: 'example.com', prompt: 'a dragon', style_id: 2,
        style_title: 'Anime', style_prompt: 'anime style', qr_weight: 0.0,
        negative_prompt: '', seed: -1, sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })
  }

  test('first generation tags the event as generation_number 1 / is_first_generation true', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-4' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))
    fillForm()
    render(<GenerateForm />)

    await act(async () => { fireEvent.click(getGenerateBtn()) })

    await waitFor(() => expect(getGenerateImageProps()).not.toBeNull())
    expect(getGenerateImageProps().generation_number).toBe(1)
    expect(getGenerateImageProps().is_first_generation).toBe(true)
  })

  test('a repeat generation in the same session increments generation_number', async () => {
    window.sessionStorage.setItem('qrai_generation_count', '1')
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-5' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_def' }))
    fillForm()
    render(<GenerateForm />)

    await act(async () => { fireEvent.click(getGenerateBtn()) })

    await waitFor(() => expect(getGenerateImageProps()).not.toBeNull())
    expect(getGenerateImageProps().generation_number).toBe(2)
    expect(getGenerateImageProps().is_first_generation).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- GenerateForm`
Expected: FAIL — `GenerateForm.js` still calls the now-unmocked `generateImage` (not imported in the mock factory anymore), so every generate-click test fails.

- [ ] **Step 3: Update `GenerateForm.js`**

In `src/app/(main_pages)/generate/GenerateForm.js`:

1. Replace the import:
   ```javascript
   import { generateImage } from "@/_utils/ImagesUtils";
   ```
   with:
   ```javascript
   import { startGeneration, getGenerationProgress } from "@/_utils/ImagesUtils";
   ```

2. Add a `percent` state and a poll-timer ref, alongside the existing `dialogContent`/`dialogOpen`/`submitDisabled` state declarations:
   ```javascript
   const [percent, setPercent] = useState(0);
   const pollTimerRef = useRef(null);

   useEffect(() => {
     return () => {
       if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
     };
   }, []);
   ```

3. Add a `pollUntilDone` helper above `handleGenerate`:
   ```javascript
   const pollUntilDone = (jobId) => {
     const startedAt = Date.now();
     return new Promise((resolve, reject) => {
       let failedAttempts = 0;
       const tick = () => {
         getGenerationProgress(jobId)
           .then((progress) => {
             failedAttempts = 0;
             setPercent(progress.percent ?? 0);
             if (progress.status === "succeeded") {
               resolve(progress.result);
             } else if (progress.status === "failed") {
               reject(new Error(progress.error || "GenerationFailed"));
             } else if (Date.now() - startedAt > 120000) {
               reject(new Error("GenerationFailed"));
             } else {
               pollTimerRef.current = setTimeout(tick, 1200);
             }
           })
           .catch((error) => {
             failedAttempts += 1;
             if (failedAttempts > 3) {
               reject(error);
               return;
             }
             pollTimerRef.current = setTimeout(tick, 1200);
           });
       };
       tick();
     });
   };
   ```

4. Replace the body of `handleGenerate`:
   ```javascript
   const image = await generateImage(generateForm, user);
   setGeneratingImage(false);
   ```
   with:
   ```javascript
   const { job_id } = await startGeneration(generateForm, user);
   const image = await pollUntilDone(job_id);
   setGeneratingImage(false);
   ```

5. Reset `percent` to 0 at the top of `handleGenerate`, right after `setGeneratingImage(true);`:
   ```javascript
   setGeneratingImage(true);
   setPercent(0);
   ```

6. Pass `percent` down to the loader:
   ```javascript
   <GeneratingLoader fill={Boolean(formHeight)} />
   ```
   becomes:
   ```javascript
   <GeneratingLoader fill={Boolean(formHeight)} percent={percent} />
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- GenerateForm`
Expected: PASS (all tests).

- [ ] **Step 5: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS (all suites, including `IteratePanel.test.js` and `GeneratingModal.test.js`, unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(main_pages\)/generate/GenerateForm.js src/__tests__/GenerateForm.test.js
git commit -m "feat: poll generation progress in GenerateForm and drive the loader's percent"
```

---

## Task 7: `GeneratingLoader.js` — bottom progress bar

**Files:**
- Modify: `src/app/(main_pages)/generate/(formComponents)/GeneratingLoader.js`
- Create: `src/__tests__/GeneratingLoader.test.js`

**Interfaces:**
- Produces: `GeneratingLoader({ fill?: boolean, percent?: number })` — `percent` consumed by Task 6's usage in `GenerateForm.js`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/GeneratingLoader.test.js`:

```javascript
import React from 'react'
import { render, screen } from '@testing-library/react'
import GeneratingLoader from '../app/(main_pages)/generate/(formComponents)/GeneratingLoader'

test('renders the progress bar width proportional to percent', () => {
  render(<GeneratingLoader percent={42} />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '42%' })
})

test('clamps percent above 100 to 100%', () => {
  render(<GeneratingLoader percent={150} />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '100%' })
})

test('clamps negative percent to 0%', () => {
  render(<GeneratingLoader percent={-10} />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '0%' })
})

test('defaults to 0% when no percent prop is given', () => {
  render(<GeneratingLoader />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '0%' })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- GeneratingLoader`
Expected: FAIL — no element with `data-testid="generation-progress-bar"` exists yet.

- [ ] **Step 3: Add the `percent` prop and bottom bar**

Replace `src/app/(main_pages)/generate/(formComponents)/GeneratingLoader.js` in full with:

```javascript
import {
    Box,
    Typography,
  } from "@mui/material";

  const GIF_URL =
    "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd0ZmY4N3VweW54ejIwN29yaGQxcmdtOWh5aGZuMG1wZW5mdHprYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/R8dDMt8IgVvhK/giphy.gif";

  const GeneratingLoader = ({ fill = false, percent = 0 }) => {
    const clampedPercent = Math.max(0, Math.min(100, percent));

    return (
        <Box
        sx={{
          position: "relative",
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          ...(fill
            ? { height: "100%" }
            : { maxWidth: "800px", margin: "auto", aspectRatio: "1/1" }),
        }}
      >
        <Box
          component="img"
          src={GIF_URL}
          alt="Generating…"
          sx={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            objectPosition: "center 25%",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)",
          }}
        />
        <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: "20px 22px" }}>
          <Typography variant="h5" sx={{ fontSize: "30px", lineHeight: 1.15, color: "primary.main" }}>
            Our superhuman AI is working on your QR Code!
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.45 }}>
            He's slow so give him a minute!
          </Typography>
        </Box>
        <Box
          data-testid="generation-progress-bar"
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "3px",
            width: `${clampedPercent}%`,
            backgroundColor: "primary.main",
            boxShadow: (theme) => `0 0 8px 1px ${theme.palette.primary.main}`,
            transition: "width 0.3s ease-out",
          }}
        />
      </Box>
    );
  };

  export default GeneratingLoader;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- GeneratingLoader`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: PASS (all suites — `GeneratingModal.test.js` stubs `GeneratingLoader` entirely, so it's unaffected by the new prop/markup).

- [ ] **Step 6: Manual visual check in the browser**

Start the dev server (`npm run dev`), open `/generate`, fill in a website + prompt, click Generate, and confirm the thin green bar appears at the bottom edge of the loader box and grows as generation progresses.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(main_pages)/generate/(formComponents)/GeneratingLoader.js" src/__tests__/GeneratingLoader.test.js
git commit -m "feat: render a bottom-edge progress bar in GeneratingLoader"
```

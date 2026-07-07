# Generation Progress Tracking — Design

**Date:** 2026-07-06
**Status:** Design approved, pending implementation
**Author:** Christoph + Claude

---

## Problem

`/api/generate` is a single blocking request: the browser calls it, waits
(often 10-20+ seconds per the timing logs added in the recent perf commit),
and gets back a finished image or an error. The frontend shows a static
GIF + fixed text (`GeneratingLoader.js`) for the whole wait, with no signal
of where generation actually stands.

Novita's own task-status API already reports real progress
(`V3TaskResponse.task.progress_percent` / `.eta`) while a job is queued or
processing, and the `novita_client` library's `img2img_v3(callback=...)`
already exposes it on every poll — `generate_controller.py` just never wires
up that callback. This design turns that (plus the other pipeline stages) into
a progress bar the user actually sees.

---

## Scope

### In scope

- Convert `/api/generate` from a single blocking call into a start + poll pair
- Wire up Novita's real `progress_percent` via the existing `callback` hook
- Weighted overall progress across the whole pipeline (not just the Novita call)
- A thin progress bar in `GeneratingLoader.js`, no numeric label
- Remove the dead guest-credit quota check (`GUEST_FREE_CREDITS`) from `predict()`

### Out of scope (fast-follow candidates, not this pass)

- Real byte-level progress for the image download / S3 upload stages (v1 uses
  a time-based synthetic ramp for these instead — see Weighting below)
- An ETA countdown in the UI (percent bar only for now)
- Any replacement guest/anonymous abuse limiter (explicitly decided: remove
  the old credit check with no replacement, since there's no real traffic yet)
- Persisting job state in Mongo — an in-memory dict is enough for a single dyno

---

## Architecture

### Endpoints (`api/main.py`)

Replace:
```python
@app.get("/api/generate")
```
with:
```python
@app.post("/api/generate/start")
```
Same query params as today (`website`, `sd_model`, `prompt`, ... `style_modifier`),
same `Depends(get_current_user)`, same `@limiter.limit("20/hour")`. Instead of
awaiting `predict()` and returning its result, it:

1. Generates `job_id = str(uuid.uuid4())`
2. Seeds `_jobs[job_id] = {"user_id": ..., "status": "queued", "percent": 0, "stage": "prep", "eta": None, "result": None, "error": None, "updated_at": time.time()}`
3. Fires `asyncio.create_task(_run_predict(job_id, ...))` — not awaited
4. Returns `{"job_id": job_id}` immediately

`_run_predict` wraps `predict(job_id, ...)` and catches anything that escapes
it (including `HTTPException`), writing `_jobs[job_id]` to
`{"status": "failed", "error": "GenerationFailed"}` instead of letting the
exception vanish as an unretrieved task error.

Add:
```python
@app.get("/api/generate/progress/{job_id}")
@limiter.limit("120/minute")
async def generate_progress_endpoint(job_id: str, current_user: dict = Depends(get_current_user)):
```
- 404 if `job_id` not in `_jobs`
- 403 if `_jobs[job_id]["user_id"] != current_user["user_id"]`
- Otherwise returns `{status, percent, stage, eta}`, plus `result` when
  `status == "succeeded"` (the same doc `predict()` returns today) or `error`
  when `"failed"`

### Job store (`generate_controller.py`)

A module-level dict:
```python
_jobs: dict[str, dict] = {}
```
On every new job start, sweep entries whose `status` is terminal and whose
`updated_at` is more than 10 minutes old, and drop them. No TTL infra, no
Mongo collection — acceptable because this is a single Heroku dyno and job
state has no value once the client has read the final result.

### `predict()` changes

`predict()` gains a `job_id: str` first argument. The existing `mark()` timing
helper already marks every stage boundary (`credit_check` — being removed,
`qr_code_build`, `build_img2img_request`, `novita_generate`, `image_download`,
`structural_score`, `create_image_doc`, `create_watermark`, `s3_uploads`,
`update_image_doc`, `increment_user_count`). Each of those boundaries becomes
a write into `_jobs[job_id]` (status, percent, stage — see Weighting below).

The `CHECK FUNDS` block (`guest_credits_col`, `GUEST_FREE_CREDITS`, the guest
403) is deleted outright, along with the now-unused `guest_credits` collection
handle. `calculate_credits()`/`sufficient_credit()` in `api/utils/utils.py`
were already dead before this change (no caller) and stay dead — no action
needed there.

`client.img2img_v3(..., callback=...)` gets a callback that writes the
Novita-reported `progress_percent`/`eta`/`status` into `_jobs[job_id]` on every
poll, mapped into the Novita segment's percent band (see below).

---

## Weighting

Derived from the recent timing data (4-run range, seconds):

| Stage | Range | Midpoint | Weight |
|---|---|---|---|
| prep (credit-check *removed*, QR build, request build) | — | ~0.5s | 3% |
| Novita (submit + poll) | 5.97–15.0 | ~10.5s | 55% |
| image download | 1.05–1.76 | ~1.4s | 8% |
| S3 uploads (watermark + original, concurrent) | 3.16–7.98 | ~5.6s | 30% |
| finishing (scannability score, DB writes, credit increment) | — | ~0.5s | 4% |

These are first-pass constants (`STAGE_WEIGHTS` in `generate_controller.py`),
easy to retune later against real logs — not meant to be exact.

Within each stage, the overall percent is `stage_start + fraction * stage_weight`:

- **prep / finishing** — no ramp, these are sub-second; jump straight to the
  stage's end-percent when the stage completes.
- **novita** — `fraction` = Novita's own `progress_percent / 100`, a real
  signal from the callback. This is the segment that matters most: it's 55%
  of the bar and the longest, most variable wait.
- **download / upload** — `fraction` = `min(elapsed_time / expected_duration, 0.95)`,
  a synthetic time-based ramp using the midpoints above as `expected_duration`,
  capped below 100% until the stage actually reports done (standard pattern
  for a wait with no fine-grained real signal). Flagged in Out of scope as
  upgradable to real byte-level progress later (`httpx` streaming +
  `Content-Length`, `aioboto3`'s `upload_fileobj(Callback=...)`) without
  changing the weighting model.

---

## Frontend changes

### `src/_utils/ImagesUtils.js`

Replace `generateImage` with:
- `startGeneration(generateFormValues, user)` — same payload/query building
  as today's `generateImage`, `POST`s to `/api/generate/start`, resolves
  `{ job_id }`.
- `getGenerationProgress(job_id)` — `GET`s `/api/generate/progress/{job_id}`,
  resolves `{ status, percent, stage, eta, result?, error? }`.

### `GenerateForm.js`

On submit: call `startGeneration` → get `job_id` → start a polling loop
(recursive `setTimeout`, ~1.2s interval, cleared on unmount/navigation and on
reaching a terminal status). Local state tracks `percent` for the loader.

- `status === "succeeded"` → stop polling, run the same success path as
  today (`revalidateTag('images')`/`('user')`, downstream handling of the
  result doc — unchanged).
- `status === "failed"` → stop polling, reuse the existing error-string
  mapping (`GenerationFailed`, etc.) so the failure UI doesn't change.
  `InsufficientCredits` becomes unreachable (the guest check is gone) but the
  mapping stays for other failure modes.
- A transient network failure on a single poll request retries a couple of
  times before giving up — one dropped fetch shouldn't fail the generation.
- If no terminal status is reached within ~2 minutes of polling, give up and
  surface `GenerationFailed` rather than polling forever (covers a job that
  silently got stuck).

### `GeneratingLoader.js`

Add a `percent` prop. Render a thin bar absolutely positioned at the very
bottom edge of the existing loader box (height ~3px, full width), width
driven by `percent`, styled with a soft glow (`box-shadow`) in `primary.main`
green, matching the reference screenshot. No numeric label — visual fill only.
Sits below the existing text block, doesn't replace it.

---

## Data flow summary

```
Browser (GenerateForm.js)
  │  startGeneration() [server action, POST]
  ▼
Next.js server ──POST──▶ FastAPI /api/generate/start
  ▲                         seeds _jobs[job_id], fires background task,
  │                         returns {job_id} immediately
  │
  │  every ~1.2s while generatingImage is true:
  │  getGenerationProgress(job_id) [server action, GET]
  ▼
Next.js server ──GET───▶ FastAPI /api/generate/progress/{job_id}
  ▲                         reads _jobs[job_id]
  │                         { status, percent, stage, eta }
  │
Browser updates GeneratingLoader's bar each poll.
On status == "succeeded": same downstream handling as today, using `result`.
On status == "failed": same error-mapping UI as today, using `error`.
```

---

## Testing

- Backend (`api/tests/test_generate.py`):
  - `/start` returns a `job_id` immediately without waiting on `predict()`
  - progress reflects stage transitions as `predict()` runs
  - ownership check: a different user's token can't read another user's job
  - a `predict()` exception results in `status: "failed"`, not a hung job
  - drop the now-dead guest-credit-quota tests (`test_generate_guest_*`)
- Frontend (Jest): polling loop in `GenerateForm.js` — stops on
  success/failure, cleans up its timer on unmount, retries a transient poll
  failure instead of failing immediately. The bar's visual fill is easier to
  just eyeball in the browser than to unit test.

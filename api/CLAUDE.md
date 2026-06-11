# `api/` — FastAPI backend

Async FastAPI app. See the repo-root `codebase/CLAUDE.md` for the overall architecture and the generation pipeline. This file covers backend-local conventions and gotchas.

## Layout

- `main.py` — the FastAPI app + **every route definition**. Routes are thin: they parse params and immediately delegate to a controller. No business logic here.
- `controllers/` — all logic lives here, one module per domain (generate, images, users, payment). See `controllers/CLAUDE.md`.
- `utils/` — pure helpers: img2img request building, watermarking, credit math, query building. See `utils/CLAUDE.md`.
- `schemas/schemas.py` — all Pydantic models (`User`, `UserAuth`, `ImageDoc`, `ControlNet`, `PaymentHistory`, …).
- `scripts/` — one-off maintenance/eval scripts. **Not part of the request path**; don't import app code expecting them to be wired in. (Cleanup tracked in SCRUM-47.)
- `tests/` — pytest suite (`pytest api/tests/ -v`), runs in CI.

## Conventions & gotchas

- **Add a route → add it in `main.py`, put logic in a controller.** Keep the route signature flat (FastAPI query/path params); don't grow logic in `main.py`.
- **Clients are module-level and duplicated per controller.** Each controller file re-creates its own Motor (`AsyncIOMotorClient`) and `aioboto3` session at import time. There is no shared db module. If you change connection setup, you must change it in each controller (`generate_`, `images_`, `users_`, `payment_controller.py`).
- **DB is always `QART`; collections `users` and `images`.** Accessed as module globals `db`, `users`, `images`.
- **Mongo `_id` handling:** controllers convert `ObjectId` → `str` before returning, because Pydantic models expose `id` via `Field(alias="_id")` with a `BeforeValidator(str)` (`PyObjectId`).
- **Env vars actually used by the backend** (note: some names differ from older docs):
  `MONGO_URL`, `SESSION_SECRET_KEY`, `NOVITA_KEY`, `S3_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STRIPE_API_KEY`, `STRIPE_ENDPOINT_SECRET`, `FRONTEND_URL`. (Stripe + frontend-url names corrected in SCRUM-49.)
- **S3 buckets are hardcoded** in the controllers: `qrartimages` (originals) and `qrartimageswatermarked`. Region `us-west-1` is baked into the returned URL in `images_controller.upload_image_to_s3`.

## ⚠️ Security posture (important context for any change here)

The backend is **called directly from the browser** and currently has **no authentication/authorization** — `user_id`/`email` arrive as plain query params and are trusted. Before adding/altering an endpoint, know that:

- There is no ownership check on delete/upscale/like (SCRUM-32).
- `user_id` starting with `guest_` bypasses all server-side credit checks (SCRUM-38).
- Credit check-and-deduct is not atomic (SCRUM-37).

If you add an endpoint that mutates data or spends credits, assume the caller is untrusted. The auth epic is **SCRUM-27**.

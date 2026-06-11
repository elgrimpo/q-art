# `api/controllers/` — request logic

One module per domain. Routes in `api/main.py` call these. Each function is `async` and raises `HTTPException` on failure (FastAPI turns it into the HTTP response).

## Modules

- `generate_controller.py` — `predict()` (generate an image) and `upscale()`. The heaviest module: QR build → Novita img2img → watermark → S3 upload (×2) → Mongo doc → credit deduction.
- `images_controller.py` — CRUD + listing: `get_images()` (paginated/filtered/sorted), `get_image()`, `create_image_doc()`, `update_image()`, `upload_image_to_s3()`, `delete_image()`, `toggle_like()`.
- `users_controller.py` — `get_user_info()`, `authenticate_user()` (upsert on login, transfers guest images), `increment_user_count()` (usage counters + credit decrement), `add_user_payment()`.
- `payment_controller.py` — `create_checkout_session()` (Stripe Checkout) and `stripe_webhook()` (grants credits on `checkout.session.completed`).

## Patterns

- **Credit flow:** `calculate_credits()` → `sufficient_credit()` (check) → do the work → `increment_user_count(..., credits_required)` (deduct). Check and deduct are **separate, non-atomic** steps (SCRUM-37).
- **Guest users:** `user_id.startswith("guest_")` short-circuits the Mongo user credit check and counter update. Instead, `generate_controller.py` enforces a server-side per-session quota via an atomic counter in the `guest_credits` collection (`GUEST_FREE_CREDITS = 3`). The frontend mirrors this limit but is not trusted for enforcement. The `guest_credits` collection has no TTL index — old records accumulate but are harmless (each is tiny and guest IDs don't repeat across sessions).
- **Error handling idiom:** inner `try/except` per stage raising a specific `HTTPException`, wrapped in an outer `try` that re-raises `HTTPException` and converts anything else to a generic 500. Follow this shape for new code.
- **Heavy/blocking calls** (Novita) run in a `ProcessPoolExecutor` wrapped via `asyncio.wrap_future`. Note this pool is created **per request** (SCRUM-40). The generated-image download is awaited via `download_image_bytes()` using `httpx.AsyncClient` with an explicit `IMAGE_DOWNLOAD_TIMEOUT` (connect 10s / read 30s), so a slow CDN can't block the event loop — fixed in QRAI-39 (the old blocking `requests.get` is gone).

## Gotchas — read before editing

- **`client` is rebound in `generate_controller.py`.** It's first assigned the Motor Mongo client, then **overwritten** with `NovitaClient(...)`. So inside that file `client` == Novita; Mongo is reached via `db` / `users` / `images`. Don't assume `client` is Mongo.
- **`toggle_like` returns `(dict, int)` tuples** on error paths — FastAPI ignores the int and returns 200. Don't copy this; raise `HTTPException` instead (SCRUM-42).
- **`get_user_info` and several handlers leak `str(e)`** to the client and use `print()` for logging (SCRUM-46). Prefer generic client messages + real logging.
- **`upscale()` reads `image["width"]` without a None-check** — a bad id 500s instead of 404 (SCRUM-41).
- **Stripe webhook trusts client-supplied `credit_amount`** (passed through checkout metadata) and always returns 200 with no idempotency (SCRUM-35, SCRUM-36). Any change here is payment-critical — see epic SCRUM-28.

No auth layer exists; treat `user_id`/`email` args as untrusted (epic SCRUM-27).

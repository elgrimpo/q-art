# Q-Art Feature Summary

Living reference of all product features, their implementation location, and test coverage. Update the relevant row when adding or changing a feature.

---

## Core Generation

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| QR Art generation | URL + prompt → Stable Diffusion + ControlNet → scannable QR art image | `api/controllers/generate_controller.py` | `test_generate.py`, `test_http.py`, `test_e2e_generate.py` |
| Style presets | Pre-built style title + prompt pairs applied at generation time | `src/_utils/ImageStyles.js` | — (data only) |
| Random prompt | Randomises who/what/where/when + keyword categories for the prompt field | `src/_utils/PromptGenerator.js` | `promptGenerator.test.js` |
| QR weight slider | Controls ControlNet monster unit strength (0.85–1.05) and guidance start | `api/utils/utils.py` → `prepare_img2img_request` | `test_utils.py` (TestPrepareImg2ImgRequest) |
| Watermarking | Overlay applied before storing watermarked version to S3 | `api/utils/utils.py` → `create_watermark` | `test_utils.py` (TestCreateWatermark) |

---

## Auth & Identity

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Google OAuth sign-in | Standard OAuth 2.0 via next-auth Google provider | `src/app/api/auth/[...nextauth]/route.js` | `test_http.py` (auth enforcement) |
| Anonymous / guest session | Auto-created guest identity (`guest_<timestamp>`) with 3 free generations | `src/app/api/auth/[...nextauth]/route.js`, `api/controllers/generate_controller.py` | `test_generate.py` (guest path), `backendAuth.test.js` |
| Guest image transfer | On first real sign-in, images created as guest are re-owned | `api/controllers/users_controller.py` → `authenticate_user` | `test_users.py`, `test_e2e_auth.py` |
| Backend JWT auth | Short-lived HS256 JWT minted by Next.js, verified by FastAPI on every user-scoped call | `src/_utils/backendAuth.js`, `api/utils/auth.py` | `backendAuth.test.js`, `test_auth.py` |

---

## Credits & Payments

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Credit system | Deduct credits on generate, download, upscale; guest free quota enforced server-side | `api/utils/utils.py`, `api/controllers/users_controller.py` | `test_utils.py`, `test_users.py`, `utils.test.js` |
| Stripe Checkout | Creates a Stripe Checkout Session for a credit top-up | `api/controllers/payment_controller.py` → `create_checkout_session`, `src/_utils/paymentUtils.js` | `test_payment.py`, `paymentUtils.test.js`, `test_http.py` |
| Stripe webhook | Grants credits on `checkout.session.completed`; idempotent (deduplicates by payment_intent) | `api/controllers/payment_controller.py` → `stripe_webhook` | `test_payment.py`, `test_e2e_payment.py` |
| Credit display | Shows cost before download/upscale; must match backend pricing | `src/_components/actions/DownloadButton.js`, `src/_utils/utils.js` | `DownloadButton.test.js`, `utils.test.js` |

---

## Image Management

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Explore gallery | Public paginated feed of all images (sorted, filtered) | `api/controllers/images_controller.py` → `get_images` | `test_images.py`, `test_http.py`, `images.test.js` |
| My Codes gallery | User-scoped image gallery with filters | `src/app/(main_pages)/mycodes/` | — |
| Single image page | Detail view; intercepted as a modal when navigating from `/generate` | `src/app/images/[imageId]/`, `src/app/(main_pages)/generate/@modal/` | `images.test.js` (getImageById), `test_images.py` (get_image) |
| Like / unlike | Toggle like on any image | `api/controllers/images_controller.py` → `toggle_like` | `test_images.py`, `images.test.js` (likeImage) |
| Delete image | Owner-only hard delete from S3 + MongoDB | `api/controllers/images_controller.py` → `delete_image` | `test_images.py`, `images.test.js` (deleteImage) |

---

## Download & Upscale

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Download | First download charges 10 credits; already-downloaded is free | `src/_components/actions/DownloadButton.js`, `api/controllers/generate_controller.py` → `upscale` | `DownloadButton.test.js`, `test_upscale.py` |
| Upscale tiers | 512 / 1024 / 2048 / 4096 px; credit cost: 10 / 15 / 20 / 25 | `api/controllers/generate_controller.py` → `upscale` | `test_upscale.py`, `utils.test.js`, `images.test.js` (upscaleImage) |

---

## Instrumentation

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Amplitude analytics | Tracks Generate, Download events with userId/style/resolution | `src/_context/amplitudeContext.js`, `src/app/(main_pages)/generate/GenerateForm.js` | Mocked in GenerateForm.test.js |

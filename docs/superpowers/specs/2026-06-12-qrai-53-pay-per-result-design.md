# QRAI-53: Pay-Per-Result Design Spec

**Date:** 2026-06-12
**Ticket:** QRAI-53
**Status:** Approved

---

## Summary

Replace the credit system entirely with a pay-per-result model: generation is free for everyone, every result is shown with a watermark, and users pay $3.99 once per image to unlock the HD (2048×2048px, no watermark) version.

---

## Core Model

**Two-state image:**
- Every generated image has two S3 versions from the start (unchanged from today): clean original at 768px (`qrartimages`) and watermarked at 768px (`qrartimageswatermarked`).
- A new `unlocked: bool` flag on the image doc tracks whether payment has been received.
- Before unlock: watermarked version is displayed everywhere — detail page, My Codes, Explore gallery.
- After unlock: the clean 768px original is upscaled to 2048px via Novita (overwriting `qrartimages/{id}.png`), `unlocked=True` is set, and the user can download.

**Generation is free:**
- Logged-in users: unlimited free generation, no credit check.
- Guests: 3 free generations enforced server-side (existing `guest_credits` collection, unchanged), reframed as "sign in to save your images."

---

## Unlock Payment Flow (Approach B — sync on return)

1. User clicks "Unlock HD — $3.99" on the image detail page.
2. Frontend calls `POST /api/checkout/unlock` with `image_id`.
3. Backend creates a Stripe Checkout session with `image_id` in metadata and `success_url = /images/{imageId}?stripe_session_id={CHECKOUT_SESSION_ID}`.
4. User completes payment on Stripe.
5. Stripe redirects back; page detects `stripe_session_id` in the URL.
6. Frontend calls `POST /api/unlock/{imageId}?stripe_session_id={sessionId}`.
7. Backend: verifies the Stripe session (paid + image_id matches), runs 2048px Novita upscale, sets `unlocked=True`, returns updated image.
8. Frontend shows "Preparing your HD image…" loading state, then reveals the clean 2048px image + download button.
9. Stripe webhook also fires and sets `unlock_pending=True` as a reliability backstop (handles the tab-close edge case).

---

## Data Model Changes

### `ImageDoc`
- Remove `downloaded: bool`
- Add `unlocked: bool = False`
- `image_url` starts as 768px original; overwritten with 2048px S3 URL on unlock
- `watermarked_image_url` unchanged (768px watermarked, always used for display)
- `width` / `height` update 768 → 2048 on unlock

### `User`
- Remove `credits: int`
- Remove `payment_history: List[PaymentHistory]`
- `authenticate_user` stops initialising `credits: 10` for new users
- `increment_user_count` keeps generation counters for analytics but removes the `$inc credits` deduction

### Stripe
- Retire the three credit-pack prices (`PRICE_CREDITS_MAP`)
- Add one new Price: `UNLOCK_PRICE_ID` — $3.99 one-time

### `guest_credits` collection
- Unchanged — still enforces the 3-generation guest cap

---

## Backend Changes

### `api/main.py`
- Replace `POST /api/checkout` → `POST /api/checkout/unlock` (takes `image_id`)
- Add `POST /api/unlock/{image_id}` (takes `stripe_session_id` query param; auth-protected)
- Remove `GET /api/upscale/{image_id}` — retired

### `api/controllers/payment_controller.py`
- Remove `PRICE_CREDITS_MAP`, `create_checkout_session`
- Add `create_unlock_checkout_session(image_id, user_id)` — Stripe session with `image_id` in metadata and session ID in success URL
- Webhook: on `checkout.session.completed`, call `mark_image_unlock_paid(image_id)` — sets `unlock_pending=True` on image doc as backstop

### `api/controllers/generate_controller.py`
- Remove credit check/deduct block for logged-in users
- Remove `credits_deducted` rollback on failure
- Keep guest `guest_credits` enforcement unchanged
- Keep both S3 uploads (original + watermarked) unchanged

### `api/controllers/unlock_controller.py` (new)
`unlock_image(image_id, stripe_session_id, user_id)`:
1. Fetch image; verify ownership (403 if not)
2. If `unlocked=True` already, return image immediately (idempotent)
3. If `stripe_session_id` provided: verify via `stripe.checkout.Session.retrieve()` — confirm `status == "complete"`, `payment_status == "paid"`, `metadata["image_id"] == image_id` (400/402 on mismatch)
4. If no `stripe_session_id`: check `unlock_pending=True` on image (backstop path for tab-close case)
5. Run 2048px Novita upscale (same `sync_upscale` logic from old `upscale()`)
6. Overwrite `qrartimages/{id}.png` in S3 with 2048px version
7. Update image doc: `unlocked=True`, `image_url` → new URL, `width=2048`, `height=2048`
8. Return updated `ImageDoc`

### `api/controllers/users_controller.py`
- `authenticate_user`: remove `credits: 10` from new user init
- `increment_user_count`: remove `$inc credits` at bottom; keep generation counters
- Remove `add_user_payment`

### `api/schemas/schemas.py`
- `ImageDoc`: swap `downloaded: bool` → `unlocked: bool = False`; add `unlock_pending: bool = False`
- `User`: remove `credits`, `payment_history`

---

## Frontend Changes

### `src/_utils/paymentUtils.js`
- Replace `createCheckout(item)` → `createUnlockCheckout(imageId)` — POSTs to `/api/checkout/unlock`

### `src/_utils/ImagesUtils.js`
- Remove `upscaleImage()`
- Add `unlockImage(imageId, stripeSessionId)` — POSTs to `/api/unlock/{imageId}?stripe_session_id=xxx`

### `src/_utils/utils.js`
- Remove `calculateCredits()`

### `src/store.js`
- Remove `processingImages`, `addImageProcessing`, `removeImageProcessing`

### `src/_components/actions/DownloadButton.js`
- Replaced by new `UnlockButton.js`:
  - `image.unlocked=True`: plain download link to `image.image_url`
  - `image.unlocked=False`: "Unlock HD — $3.99" → calls `createUnlockCheckout` → Stripe redirect

### `src/app/images/[imageId]/`
- `ImageFill.js`: display `watermarked_image_url` when `!image.unlocked`, `image_url` when `image.unlocked`
- `ImageSidebar.js`:
  - Detect `?stripe_session_id=xxx` on mount → auto-call `unlockImage()` → show loading overlay → refresh image
  - Detect `image.unlock_pending=True && !image.unlocked` (no stripe_session_id needed) → auto-call `unlockImage()` without session ID — this covers the tab-close case where the webhook already fired. The `ImageDoc` returned by the API must include `unlock_pending` so the frontend can detect this state.
  - Detect `?justGenerated=true` && `!unlocked` → show prominent unlock banner: *"Your QR art is ready! Unlock the HD version for $3.99 — no watermark, 2048×2048px, yours to keep."*
  - Replace `DownloadButton` with `UnlockButton`

### `src/app/(main_pages)/generate/GenerateForm.js`
- Route after generation: `/images/${image._id}?justGenerated=true`
- Guest credit-exhausted dialog: copy changes to *"Sign in to keep generating and save your images."*
- Generate button: remove credit cost display, just "Generate"

### `src/_components/actions/GuestSignupPrompt.js`
- Update copy: *"Sign in to save this image to your profile — and keep generating for free."*

### Credit UI removal
- Remove `DiamondTwoToneIcon` + cost label from generate button
- Remove "Buy Credits" / credit pack section from profile page
- Remove credit balance from navbar / account menus

---

## Error Handling

| Scenario | Backend response | User-facing message |
|---|---|---|
| Stripe session not found or not paid | 402 | "Payment could not be verified. If you were charged, please contact support." |
| `metadata.image_id` doesn't match path | 400 | Same as above |
| Novita upscale fails after verified payment | 500, do NOT set `unlocked=True`, log `image_id` + `payment_intent` | "Something went wrong preparing your image. We've been notified — please try again or contact support." |
| Already unlocked (double-hit) | 200, return image | No error — idempotent |
| Non-owner tries to unlock | 403 | Standard forbidden |
| Tab closed before returning from Stripe | Webhook sets `unlock_pending=True` | Next visit to image page auto-triggers unlock |

---

## Out of Scope

- Refunds — handled manually for MVP
- Unlock history / receipt emails — deferred
- Explore page rewrite — existing page still uses `mycodes` rewrite; just ensure it passes `watermarked_image_url`

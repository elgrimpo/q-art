# QRAI-53: Pay-Per-Result Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the credit system with free generation + a $3.99 per-image Stripe payment that unlocks a 2048px HD version (watermark removed).

**Architecture:** Every image is generated at 768px with two S3 versions (clean + watermarked); the watermarked version is shown everywhere until a Stripe payment is verified, at which point the backend upscales to 2048px via Novita, overwrites the S3 original, and marks the image `unlocked=True`. Payment verification uses Stripe's session retrieve API on the success redirect (sync path), with the webhook setting `unlock_pending=True` as a reliability backstop.

**Tech Stack:** FastAPI, Motor (MongoDB), aioboto3 (S3), Novita SDK, Stripe Python SDK, Next.js 14, React 18, MUI v5, Zustand.

---

## File Map

**Backend — Modified:**
- `api/schemas/schemas.py` — ImageDoc: `downloaded→unlocked`, add `unlock_pending`; User: remove `credits`, `payment_history`
- `api/controllers/generate_controller.py` — remove logged-in credit check/deduct; keep guest limit
- `api/controllers/payment_controller.py` — replace credit-pack checkout with unlock checkout; update webhook to set `unlock_pending`
- `api/controllers/users_controller.py` — remove `credits: 10` init; remove `add_user_payment`; remove credit deduction from `increment_user_count`
- `api/main.py` — replace `/api/checkout`→`/api/checkout/unlock`; add `/api/unlock/{image_id}`; remove `/api/upscale/{image_id}`
- `api/tests/conftest.py` — add `STRIPE_UNLOCK_PRICE_ID` env var
- `api/tests/test_generate.py` — update credit-check test; add no-credit-check test
- `api/tests/test_payment.py` — replace credit-checkout tests with unlock-checkout tests; update webhook test
- `api/tests/test_users.py` — remove credit-init and add_user_payment tests

**Backend — Created:**
- `api/controllers/unlock_controller.py` — `unlock_image()`
- `api/tests/test_unlock.py` — full test suite for unlock flow

**Frontend — Modified:**
- `src/_utils/paymentUtils.js` — `createCheckout→createUnlockCheckout`
- `src/_utils/ImagesUtils.js` — remove `upscaleImage`; add `unlockImage`
- `src/_utils/utils.js` — remove `calculateCredits`
- `src/store.js` — remove `processingImages` state and actions
- `src/app/images/[imageId]/ImageFill.js` — show watermarked vs HD based on `unlocked`
- `src/app/images/[imageId]/ImageSidebar.js` — replace DownloadButton with UnlockButton; detect `stripe_session_id`/`unlock_pending`/`justGenerated`
- `src/app/(main_pages)/generate/GenerateForm.js` — remove credit display; route with `?justGenerated=true`; update guest dialog copy
- `src/app/images/[imageId]/GuestSignupPrompt.js` — update copy
- `src/app/profile/page.js` — remove credit display and PurchaseCards
- `src/app/profile/PurchaseCard.js` — delete
- `src/app/(main_pages)/(navbar)/AccountMenuDesktop.js` — remove credit Chip
- `src/app/(main_pages)/(navbar)/AccountMenuMobile.js` — remove credit Chip

**Frontend — Created:**
- `src/_components/actions/UnlockButton.js` — replaces DownloadButton

---

## Task 1: Stripe — Create the $3.99 Unlock Price

**Files:** `.env`

- [ ] **Step 1: Create the price in Stripe Dashboard (test mode)**

  Log into Stripe → Products → Add product → Name: "QR Art HD Unlock" → Add price: $3.99 one-time. Copy the Price ID (starts with `price_`).

- [ ] **Step 2: Add to `.env`**

  ```
  STRIPE_UNLOCK_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXXXXXX
  ```

- [ ] **Step 3: Add test placeholder to `api/tests/conftest.py`**

  Open `api/tests/conftest.py` and add after the existing `setdefault` calls:
  ```python
  os.environ.setdefault("STRIPE_UNLOCK_PRICE_ID", "price_test_unlock_placeholder")
  ```

- [ ] **Step 4: Verify tests still pass (no regressions yet)**

  ```bash
  cd codebase && source api/venv/bin/activate && pytest api/tests/ -v --ignore=api/tests/e2e
  ```
  Expected: all existing tests pass.

---

## Task 2: Backend — Schema Changes

**Files:**
- Modify: `api/schemas/schemas.py`

- [ ] **Step 1: Write a test that documents the new ImageDoc shape**

  Create `api/tests/test_schema.py`:
  ```python
  from api.schemas.schemas import ImageDoc, User

  def test_image_doc_has_unlocked_not_downloaded():
      fields = ImageDoc.model_fields
      assert "unlocked" in fields
      assert "unlock_pending" in fields
      assert "downloaded" not in fields
      assert fields["unlocked"].default is False
      assert fields["unlock_pending"].default is False

  def test_user_has_no_credits_or_payment_history():
      fields = User.model_fields
      assert "credits" not in fields
      assert "payment_history" not in fields
  ```

- [ ] **Step 2: Run — expect FAIL**

  ```bash
  pytest api/tests/test_schema.py -v
  ```
  Expected: `FAILED — 'unlocked' not in fields` (field doesn't exist yet).

- [ ] **Step 3: Update `api/schemas/schemas.py`**

  In `ImageDoc`, replace:
  ```python
  downloaded: Optional[bool] = False
  ```
  with:
  ```python
  unlocked: Optional[bool] = False
  unlock_pending: Optional[bool] = False
  ```

  In `User`, remove these two lines entirely:
  ```python
  credits: Optional[int] = 10
  payment_history: Optional[List[PaymentHistory]] = []
  ```
  Also remove `PaymentHistory` from the `User` import usage (the class definition itself can stay for now — it's used in existing payment tests; it will be deleted in Task 5).

- [ ] **Step 4: Run — expect PASS**

  ```bash
  pytest api/tests/test_schema.py -v
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add api/schemas/schemas.py api/tests/test_schema.py api/tests/conftest.py
  git commit -m "feat(schema): replace downloaded with unlocked/unlock_pending; remove credits from User"
  ```

---

## Task 3: Backend — Generate Controller (Remove Credit Check)

**Files:**
- Modify: `api/controllers/generate_controller.py`
- Modify: `api/tests/test_generate.py`

- [ ] **Step 1: Add a failing test for credit-free generation**

  In `api/tests/test_generate.py`, add after the existing helpers:

  ```python
  @patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
  @patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
  @patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
  @patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
  @patch("api.controllers.generate_controller.create_watermark")
  @patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
  @patch("api.controllers.generate_controller.client")
  @patch("api.controllers.generate_controller.users")
  async def test_generate_does_not_check_credits_for_logged_in_user(
      mock_users,
      mock_novita_client,
      mock_download,
      mock_create_watermark,
      mock_create_doc,
      mock_upload,
      mock_update,
      mock_increment,
  ):
      """Logged-in users must generate without any DB credit check."""
      img2img_result, task_result = _build_novita_mocks()
      mock_novita_client.img2img_v3.return_value = img2img_result
      mock_novita_client.wait_for_task_v3.return_value = task_result
      mock_download.return_value = _white_png_bytes()
      mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")
      mock_create_doc.return_value = FAKE_IMAGE_ID
      mock_upload.side_effect = [ORIG_URL, WMARK_URL]
      mock_update.return_value = {"_id": FAKE_IMAGE_ID, "image_url": ORIG_URL, "watermarked_image_url": WMARK_URL}

      await predict(**PREDICT_KWARGS)

      # Must NOT touch the users collection for credit purposes
      mock_users.find_one_and_update.assert_not_called()
  ```

  Also delete `test_generate_checks_user_credits` and `test_predict_insufficient_credits_raises_403` — they test behaviour we're removing.

- [ ] **Step 2: Run — expect FAIL on new test**

  ```bash
  pytest api/tests/test_generate.py::test_generate_does_not_check_credits_for_logged_in_user -v
  ```
  Expected: FAIL (`find_one_and_update` is called).

- [ ] **Step 3: Remove credit check block from `generate_controller.py`**

  In `api/controllers/generate_controller.py`, in the `predict()` function, delete the entire `# CHECK FUNDS` block for non-guest users (lines starting with `service_config =` through `if result is None: raise HTTPException(status_code=403, ...)`), and the `credits_deducted = False` initialisation, and the two `if credits_deducted:` rollback blocks in the generation/DB error handlers.

  The beginning of `predict()` after the change should look like:
  ```python
  async def predict(prompt, website, negative_prompt, seed, qr_weight, sd_model, user_id, style_prompt, style_title):
      try:
          # ---- Guest quota ----
          if str(user_id).startswith("guest_"):
              result = await guest_credits_col.find_one_and_update(
                  {"_id": user_id},
                  {"$inc": {"used": 1}},
                  upsert=True,
                  return_document=ReturnDocument.AFTER,
              )
              if result["used"] > GUEST_FREE_CREDITS:
                  await guest_credits_col.update_one({"_id": user_id}, {"$inc": {"used": -1}})
                  raise HTTPException(status_code=403, detail="Insufficient credits")

          # ---- Generate QR code ----
          qr = qrcode.QRCode(...)
  ```

  Also remove the `increment_user_count` call at the bottom of `predict()` (we no longer need to track credit deductions; keep only if you want generation counters — for now remove to keep it simple).

  And remove `service_config` variable entirely.

- [ ] **Step 4: Run — expect PASS**

  ```bash
  pytest api/tests/test_generate.py -v
  ```
  Expected: all remaining tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add api/controllers/generate_controller.py api/tests/test_generate.py
  git commit -m "feat(generate): remove credit check for logged-in users; generation is now free"
  ```

---

## Task 4: Backend — Users Controller Cleanup

**Files:**
- Modify: `api/controllers/users_controller.py`
- Modify: `api/tests/test_users.py`

- [ ] **Step 1: Check what tests exist**

  ```bash
  pytest api/tests/test_users.py -v --collect-only
  ```
  Note any tests for `add_user_payment` or credit initialisation.

- [ ] **Step 2: Write failing test for new user creation (no credits)**

  In `api/tests/test_users.py`, add:
  ```python
  @patch("api.controllers.users_controller.users")
  @patch("api.controllers.users_controller.images")
  async def test_new_user_created_without_credits(mock_images, mock_users):
      """New users must not receive a credits field on creation."""
      from api.controllers.users_controller import authenticate_user
      from api.schemas.schemas import UserAuth, AuthProvider

      mock_users.find_one = AsyncMock(return_value=None)
      inserted = MagicMock()
      inserted.inserted_id = ObjectId()
      mock_users.insert_one = AsyncMock(return_value=inserted)
      mock_images.update_many = AsyncMock()

      user_auth = UserAuth(
          name="Test User",
          email="test@example.com",
          auth_providers=[AuthProvider(provider="google", providerId="123")],
      )
      await authenticate_user(user_auth)

      call_args = mock_users.insert_one.call_args.args[0]
      assert "credits" not in call_args
  ```

- [ ] **Step 3: Run — expect FAIL**

  ```bash
  pytest api/tests/test_users.py::test_new_user_created_without_credits -v
  ```

- [ ] **Step 4: Update `users_controller.py`**

  In `authenticate_user`, in `user_data`, remove:
  ```python
  "credits": 10,
  "payment_history": []
  ```

  Remove `add_user_payment` function entirely (lines 181–211).

  In `increment_user_count`, remove the final `await db["users"].update_one(...)` block that does `$inc: {credits: -credits_deducted}`, and remove the `credits_deducted` parameter from the function signature. Change the signature to:
  ```python
  async def increment_user_count(user_id, service_config):
  ```

  Update the two call sites in `generate_controller.py` (if still present after Task 3) to drop the third argument.

- [ ] **Step 5: Run — expect PASS**

  ```bash
  pytest api/tests/test_users.py -v
  ```

- [ ] **Step 6: Delete `test_add_payment_*` tests from `test_payment.py`**

  In `api/tests/test_payment.py`, delete these three test functions (they test `add_user_payment` which is now gone):
  - `test_add_payment_applies_credits_first_time`
  - `test_add_payment_skips_duplicate_without_error`
  - `test_add_payment_db_error_raises_500`

- [ ] **Step 7: Run all backend tests**

  ```bash
  pytest api/tests/ -v --ignore=api/tests/e2e
  ```
  Expected: all pass.

- [ ] **Step 8: Commit**

  ```bash
  git add api/controllers/users_controller.py api/tests/test_users.py api/tests/test_payment.py
  git commit -m "feat(users): remove credit initialisation and add_user_payment"
  ```

---

## Task 5: Backend — Payment Controller (Unlock Checkout + Webhook)

**Files:**
- Modify: `api/controllers/payment_controller.py`
- Modify: `api/tests/test_payment.py`

- [ ] **Step 1: Write failing tests for the new checkout and webhook**

  Replace all remaining test content in `api/tests/test_payment.py` with:

  ```python
  import pytest
  from unittest.mock import AsyncMock, MagicMock, patch
  from datetime import datetime

  import stripe
  from fastapi import HTTPException

  from api.controllers.payment_controller import (
      stripe_webhook,
      create_unlock_checkout_session,
  )

  FAKE_USER_ID = "507f1f77bcf86cd799439011"
  FAKE_IMAGE_ID = "607f1f77bcf86cd799439022"
  FAKE_PI = "pi_test_abc123"


  def _mock_request(body=b'{"type":"test"}'):
      req = AsyncMock()
      req.body = AsyncMock(return_value=body)
      return req


  def _unlock_event(image_id=FAKE_IMAGE_ID, user_id=FAKE_USER_ID, payment_intent=FAKE_PI, created=1700000000):
      return {
          "type": "checkout.session.completed",
          "data": {
              "object": {
                  "client_reference_id": user_id,
                  "amount_total": 399,
                  "metadata": {"image_id": image_id},
                  "payment_intent": payment_intent,
                  "created": created,
              }
          },
      }


  # --- create_unlock_checkout_session ---

  @patch("api.controllers.payment_controller.stripe.checkout.Session.create")
  def test_create_unlock_checkout_returns_session_url(mock_create):
      mock_session = MagicMock()
      mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc"
      mock_create.return_value = mock_session

      result = create_unlock_checkout_session(FAKE_IMAGE_ID, FAKE_USER_ID)

      assert result == {"session_url": "https://checkout.stripe.com/pay/cs_test_abc"}
      call_kwargs = mock_create.call_args.kwargs
      assert call_kwargs["metadata"]["image_id"] == FAKE_IMAGE_ID
      assert call_kwargs["client_reference_id"] == FAKE_USER_ID
      assert FAKE_IMAGE_ID in call_kwargs["success_url"]
      assert "{CHECKOUT_SESSION_ID}" in call_kwargs["success_url"]


  @patch("api.controllers.payment_controller.stripe.checkout.Session.create")
  def test_create_unlock_checkout_stripe_error_raises_500(mock_create):
      mock_create.side_effect = Exception("Stripe down")
      with pytest.raises(HTTPException) as exc_info:
          create_unlock_checkout_session(FAKE_IMAGE_ID, FAKE_USER_ID)
      assert exc_info.value.status_code == 500


  # --- stripe_webhook (signature) ---

  @patch("stripe.Webhook.construct_event",
         side_effect=stripe.error.SignatureVerificationError("Bad sig", "hdr"))
  async def test_webhook_invalid_signature_returns_400(mock_construct):
      with pytest.raises(HTTPException) as exc_info:
          await stripe_webhook(_mock_request(), "bad-signature")
      assert exc_info.value.status_code == 400


  # --- stripe_webhook (unlock path) ---

  @patch("api.controllers.payment_controller.mark_image_unlock_paid", new_callable=AsyncMock)
  @patch("stripe.Webhook.construct_event")
  async def test_webhook_unlock_event_calls_mark_unlock_paid(mock_construct, mock_mark):
      mock_construct.return_value = _unlock_event(image_id=FAKE_IMAGE_ID)
      await stripe_webhook(_mock_request(), "valid-sig")
      mock_mark.assert_called_once_with(FAKE_IMAGE_ID)


  @patch("api.controllers.payment_controller.mark_image_unlock_paid", new_callable=AsyncMock)
  @patch("stripe.Webhook.construct_event")
  async def test_webhook_unknown_event_type_ignored(mock_construct, mock_mark):
      mock_construct.return_value = {"type": "customer.subscription.created", "data": {"object": {}}}
      await stripe_webhook(_mock_request(), "valid-sig")
      mock_mark.assert_not_called()
  ```

- [ ] **Step 2: Run — expect FAIL**

  ```bash
  pytest api/tests/test_payment.py -v
  ```
  Expected: `ImportError: cannot import name 'create_unlock_checkout_session'`.

- [ ] **Step 3: Replace `payment_controller.py`**

  ```python
  import logging
  import os
  from datetime import datetime

  import stripe
  from bson import ObjectId
  from fastapi import HTTPException
  from dotenv import load_dotenv
  import motor.motor_asyncio as motor
  import certifi

  load_dotenv()
  logger = logging.getLogger(__name__)

  stripe.api_key = os.environ["STRIPE_API_KEY"]
  frontend_url = os.environ["FRONTEND_URL"]
  unlock_price_id = os.environ["STRIPE_UNLOCK_PRICE_ID"]

  mongo_url = os.environ["MONGO_URL"]
  _tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
  _motor_client = motor.AsyncIOMotorClient(mongo_url, **_tls)
  _db = _motor_client.get_database("QART")
  _images = _db.get_collection("images")


  async def mark_image_unlock_paid(image_id: str):
      """Webhook backstop: mark the image so the frontend can retry unlock without a session ID."""
      try:
          await _images.update_one(
              {"_id": ObjectId(image_id)},
              {"$set": {"unlock_pending": True}},
          )
      except Exception:
          logger.error("mark_image_unlock_paid failed for image %s", image_id, exc_info=True)
          raise HTTPException(status_code=500, detail="Failed to record unlock pending")


  def create_unlock_checkout_session(image_id: str, user_id: str):
      try:
          session = stripe.checkout.Session.create(
              line_items=[{"price": unlock_price_id, "quantity": 1}],
              mode="payment",
              success_url=(
                  f"{frontend_url}/images/{image_id}"
                  f"?stripe_session_id={{CHECKOUT_SESSION_ID}}"
              ),
              cancel_url=f"{frontend_url}/images/{image_id}?canceled=true",
              client_reference_id=user_id,
              metadata={"image_id": image_id},
          )
          return {"session_url": session.url}
      except HTTPException:
          raise
      except Exception:
          raise HTTPException(status_code=500, detail="Payment failed")


  async def stripe_webhook(request, stripe_signature):
      endpoint_secret = os.environ["STRIPE_ENDPOINT_SECRET"]
      data = await request.body()
      try:
          event = stripe.Webhook.construct_event(
              payload=data, sig_header=stripe_signature, secret=endpoint_secret
          )
      except stripe.error.SignatureVerificationError:
          raise HTTPException(status_code=400, detail="Invalid signature")

      if event["type"] == "checkout.session.completed":
          session = event["data"]["object"]
          image_id = session.get("metadata", {}).get("image_id")
          if image_id:
              await mark_image_unlock_paid(image_id)

      return {"status": "ok"}
  ```

- [ ] **Step 4: Run — expect PASS**

  ```bash
  pytest api/tests/test_payment.py -v
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add api/controllers/payment_controller.py api/tests/test_payment.py
  git commit -m "feat(payment): replace credit-pack checkout with per-image unlock checkout"
  ```

---

## Task 6: Backend — Unlock Controller

**Files:**
- Create: `api/controllers/unlock_controller.py`
- Create: `api/tests/test_unlock.py`

- [ ] **Step 1: Write failing tests**

  Create `api/tests/test_unlock.py`:

  ```python
  import pytest
  from unittest.mock import AsyncMock, MagicMock, patch
  from bson import ObjectId
  from fastapi import HTTPException

  from api.controllers.unlock_controller import unlock_image

  FAKE_USER_ID = "507f1f77bcf86cd799439011"
  FAKE_IMAGE_ID = "607f1f77bcf86cd799439022"
  FAKE_SESSION_ID = "cs_test_abc123"


  def _image_doc(unlocked=False, unlock_pending=False, user_id=FAKE_USER_ID):
      return {
          "_id": ObjectId(FAKE_IMAGE_ID),
          "user_id": user_id,
          "unlocked": unlocked,
          "unlock_pending": unlock_pending,
          "width": 768,
          "height": 768,
          "image_url": f"https://qrartimages.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png",
          "watermarked_image_url": f"https://qrartimageswatermarked.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png",
      }


  def _stripe_session(image_id=FAKE_IMAGE_ID, status="complete", payment_status="paid"):
      session = MagicMock()
      session.status = status
      session.payment_status = payment_status
      session.metadata = {"image_id": image_id}
      return session


  def _upscale_response():
      resp = MagicMock()
      resp.data.imgs_bytes = [b"fake-png-bytes"]
      return resp


  @patch("api.controllers.unlock_controller.update_image", new_callable=AsyncMock)
  @patch("api.controllers.unlock_controller.s3_session")
  @patch("api.controllers.unlock_controller.novita_client")
  @patch("api.controllers.unlock_controller.stripe")
  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_success_via_stripe_session(
      mock_images, mock_stripe, mock_novita, mock_s3, mock_update_image
  ):
      """Happy path: valid Stripe session → upscale → DB update → return unlocked image."""
      mock_images.find_one = AsyncMock(return_value=_image_doc())
      mock_stripe.checkout.Session.retrieve.return_value = _stripe_session()

      # Mock S3 get (download original)
      mock_body = AsyncMock()
      mock_body.read = AsyncMock(return_value=b"fake-original-bytes")
      mock_s3_client = AsyncMock()
      mock_s3_client.get_object = AsyncMock(return_value={"Body": mock_body})
      mock_s3_client.put_object = AsyncMock()
      mock_s3_client.__aenter__ = AsyncMock(return_value=mock_s3_client)
      mock_s3_client.__aexit__ = AsyncMock(return_value=False)
      mock_s3.client.return_value = mock_s3_client

      mock_novita.sync_upscale.return_value = _upscale_response()

      unlocked_doc = {**_image_doc(unlocked=True), "_id": FAKE_IMAGE_ID, "width": 2048, "height": 2048}
      mock_update_image.return_value = unlocked_doc

      result = await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)

      assert result["unlocked"] is True
      assert result["width"] == 2048
      mock_stripe.checkout.Session.retrieve.assert_called_once_with(FAKE_SESSION_ID)
      mock_s3_client.put_object.assert_called_once()
      mock_update_image.assert_called_once()
      update_data = mock_update_image.call_args.args[1]
      assert update_data["unlocked"] is True
      assert update_data["unlock_pending"] is False
      assert update_data["width"] == 2048
      assert update_data["height"] == 2048


  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_already_unlocked_returns_immediately(mock_images):
      """Idempotent: an already-unlocked image is returned without calling Stripe or Novita."""
      doc = {**_image_doc(unlocked=True), "_id": FAKE_IMAGE_ID}
      mock_images.find_one = AsyncMock(return_value=doc)

      result = await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)

      assert result["unlocked"] is True
      # No Stripe or Novita calls — checked by absence of patches


  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_wrong_owner_raises_403(mock_images):
      mock_images.find_one = AsyncMock(return_value=_image_doc(user_id="other_user_id"))
      with pytest.raises(HTTPException) as exc_info:
          await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
      assert exc_info.value.status_code == 403


  @patch("api.controllers.unlock_controller.stripe")
  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_unpaid_session_raises_402(mock_images, mock_stripe):
      mock_images.find_one = AsyncMock(return_value=_image_doc())
      mock_stripe.checkout.Session.retrieve.return_value = _stripe_session(payment_status="unpaid")
      with pytest.raises(HTTPException) as exc_info:
          await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
      assert exc_info.value.status_code == 402


  @patch("api.controllers.unlock_controller.stripe")
  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_session_image_mismatch_raises_400(mock_images, mock_stripe):
      mock_images.find_one = AsyncMock(return_value=_image_doc())
      mock_stripe.checkout.Session.retrieve.return_value = _stripe_session(image_id="other_image_id")
      with pytest.raises(HTTPException) as exc_info:
          await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
      assert exc_info.value.status_code == 400


  @patch("api.controllers.unlock_controller.update_image", new_callable=AsyncMock)
  @patch("api.controllers.unlock_controller.s3_session")
  @patch("api.controllers.unlock_controller.novita_client")
  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_via_pending_flag_no_session_id(
      mock_images, mock_novita, mock_s3, mock_update_image
  ):
      """Tab-close path: unlock_pending=True with no stripe_session_id triggers upscale."""
      mock_images.find_one = AsyncMock(return_value=_image_doc(unlock_pending=True))

      mock_body = AsyncMock()
      mock_body.read = AsyncMock(return_value=b"fake-original-bytes")
      mock_s3_client = AsyncMock()
      mock_s3_client.get_object = AsyncMock(return_value={"Body": mock_body})
      mock_s3_client.put_object = AsyncMock()
      mock_s3_client.__aenter__ = AsyncMock(return_value=mock_s3_client)
      mock_s3_client.__aexit__ = AsyncMock(return_value=False)
      mock_s3.client.return_value = mock_s3_client

      mock_novita.sync_upscale.return_value = _upscale_response()
      unlocked_doc = {**_image_doc(unlocked=True), "_id": FAKE_IMAGE_ID, "width": 2048, "height": 2048}
      mock_update_image.return_value = unlocked_doc

      result = await unlock_image(FAKE_IMAGE_ID, None, FAKE_USER_ID)

      assert result["unlocked"] is True


  @patch("api.controllers.unlock_controller.images")
  async def test_unlock_no_session_and_no_pending_raises_402(mock_images):
      """No session ID and no unlock_pending flag → payment not confirmed → 402."""
      mock_images.find_one = AsyncMock(return_value=_image_doc(unlock_pending=False))
      with pytest.raises(HTTPException) as exc_info:
          await unlock_image(FAKE_IMAGE_ID, None, FAKE_USER_ID)
      assert exc_info.value.status_code == 402
  ```

- [ ] **Step 2: Run — expect ImportError**

  ```bash
  pytest api/tests/test_unlock.py -v
  ```
  Expected: `ModuleNotFoundError: No module named 'api.controllers.unlock_controller'`.

- [ ] **Step 3: Create `api/controllers/unlock_controller.py`**

  ```python
  import asyncio
  import base64
  import logging
  import os

  import aioboto3
  import certifi
  import motor.motor_asyncio as motor
  import stripe
  from bson import ObjectId
  from bson.errors import InvalidId
  from dotenv import load_dotenv
  from fastapi import HTTPException
  from novita_client import NovitaClient, UpscaleRequest, UpscaleResizeMode

  from api.controllers.images_controller import update_image

  load_dotenv()

  logger = logging.getLogger(__name__)

  stripe.api_key = os.environ["STRIPE_API_KEY"]

  mongo_url = os.environ["MONGO_URL"]
  _tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
  _motor_client = motor.AsyncIOMotorClient(mongo_url, **_tls)
  _db = _motor_client.get_database("QART")
  images = _db.get_collection("images")

  novita_client = NovitaClient(os.environ["NOVITA_KEY"])
  s3_session = aioboto3.Session()
  S3_BUCKET = "qrartimages"
  UPSCALE_SIZE = 2048


  def _verify_stripe_session(stripe_session_id: str, image_id: str):
      try:
          session = stripe.checkout.Session.retrieve(stripe_session_id)
      except stripe.error.InvalidRequestError:
          raise HTTPException(status_code=402, detail="Payment session not found")
      if session.status != "complete" or session.payment_status != "paid":
          raise HTTPException(status_code=402, detail="Payment not completed")
      if session.metadata.get("image_id") != image_id:
          raise HTTPException(status_code=400, detail="Session image mismatch")


  async def _run_upscale(image_id: str) -> bytes:
      """Download original from S3, upscale to 2048px via Novita, return raw bytes."""
      async with s3_session.client(
          "s3",
          aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
          aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
      ) as s3_client:
          response = await s3_client.get_object(Bucket=S3_BUCKET, Key=f"{image_id}.png")
          image_bytes = await response["Body"].read()

      b64 = base64.b64encode(image_bytes).decode()
      req = UpscaleRequest(
          image=b64,
          upscaling_resize_w=UPSCALE_SIZE,
          upscaling_resize_h=UPSCALE_SIZE,
          resize_mode=UpscaleResizeMode.SIZE,
      )
      resp = await asyncio.to_thread(novita_client.sync_upscale, req)
      return resp.data.imgs_bytes[0]


  async def _upload_upscaled(image_id: str, image_bytes: bytes):
      async with s3_session.client(
          "s3",
          aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
          aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
      ) as s3_client:
          await s3_client.put_object(
              Bucket=S3_BUCKET, Key=f"{image_id}.png", Body=image_bytes
          )


  async def unlock_image(image_id: str, stripe_session_id: str | None, user_id: str) -> dict:
      try:
          object_id = ObjectId(image_id)
      except (InvalidId, TypeError):
          raise HTTPException(status_code=404, detail="Image not found")

      image = await images.find_one({"_id": object_id})
      if not image:
          raise HTTPException(status_code=404, detail="Image not found")
      if image.get("user_id") != user_id:
          raise HTTPException(status_code=403, detail="Not authorized")

      # Idempotent — already done
      if image.get("unlocked"):
          image["_id"] = str(image["_id"])
          return image

      # Verify payment authority
      if stripe_session_id:
          _verify_stripe_session(stripe_session_id, image_id)
      elif not image.get("unlock_pending"):
          raise HTTPException(status_code=402, detail="Payment not confirmed")

      # Upscale
      try:
          upscaled_bytes = await _run_upscale(image_id)
      except Exception:
          logger.error("Upscale failed for image %s", image_id, exc_info=True)
          raise HTTPException(status_code=500, detail="Image preparation failed — please try again")

      # Upload back to S3 (overwrites the 768px original with 2048px)
      try:
          await _upload_upscaled(image_id, upscaled_bytes)
      except Exception:
          logger.error("S3 upload failed for image %s", image_id, exc_info=True)
          raise HTTPException(status_code=500, detail="Image preparation failed — please try again")

      # Mark unlocked in DB
      update_data = {
          "unlocked": True,
          "unlock_pending": False,
          "width": UPSCALE_SIZE,
          "height": UPSCALE_SIZE,
      }
      updated = await update_image(image_id, update_data)
      return updated

  ```

- [ ] **Step 4: Run — expect PASS**

  ```bash
  pytest api/tests/test_unlock.py -v
  ```

- [ ] **Step 5: Run full suite**

  ```bash
  pytest api/tests/ -v --ignore=api/tests/e2e
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add api/controllers/unlock_controller.py api/tests/test_unlock.py
  git commit -m "feat(unlock): add unlock_image controller — Stripe verify + Novita upscale"
  ```

---

## Task 7: Backend — Route Changes in `main.py`

**Files:**
- Modify: `api/main.py`

- [ ] **Step 1: Update `main.py`**

  Replace the import line:
  ```python
  from api.controllers.generate_controller import predict, upscale
  ```
  with:
  ```python
  from api.controllers.generate_controller import predict
  ```

  Replace:
  ```python
  from api.controllers.payment_controller import create_checkout_session, stripe_webhook
  ```
  with:
  ```python
  from api.controllers.payment_controller import create_unlock_checkout_session, stripe_webhook
  ```

  Add:
  ```python
  from api.controllers.unlock_controller import unlock_image
  ```

  Delete the entire `# UPSCALE IMAGE` route block:
  ```python
  @app.get("/api/upscale/{image_id}")
  async def upscale_endpoint(...):
      ...
  ```

  Replace the checkout route:
  ```python
  @app.post('/api/checkout')
  async def create_checkout_session_endpoint(
      stripeId: Optional[str] = None,
      current_user: dict = Depends(get_current_user),
  ):
      return create_checkout_session(stripeId, current_user["user_id"])
  ```
  with:
  ```python
  @app.post('/api/checkout/unlock')
  async def create_unlock_checkout_endpoint(
      image_id: str,
      current_user: dict = Depends(get_current_user),
  ):
      return create_unlock_checkout_session(image_id, current_user["user_id"])
  ```

  Add after the checkout route:
  ```python
  @app.post('/api/unlock/{image_id}')
  async def unlock_endpoint(
      image_id: str,
      stripe_session_id: Optional[str] = None,
      current_user: dict = Depends(get_current_user),
  ):
      return await unlock_image(image_id, stripe_session_id, current_user["user_id"])
  ```

- [ ] **Step 2: Verify server starts**

  ```bash
  cd codebase && source api/venv/bin/activate && uvicorn api.main:app --reload &
  sleep 3 && curl -s http://localhost:8000/docs | grep -o '"paths"' && kill %1
  ```
  Expected: `"paths"` appears (FastAPI docs endpoint works).

- [ ] **Step 3: Delete `api/tests/test_upscale.py`** — the upscale endpoint is retired.

  ```bash
  rm api/tests/test_upscale.py
  ```

- [ ] **Step 4: Run all backend tests**

  ```bash
  pytest api/tests/ -v --ignore=api/tests/e2e
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add api/main.py api/tests/
  git commit -m "feat(routes): replace /checkout and /upscale with /checkout/unlock and /unlock/{image_id}"
  ```

---

## Task 8: Frontend — Utils Cleanup

**Files:**
- Modify: `src/_utils/paymentUtils.js`
- Modify: `src/_utils/ImagesUtils.js`
- Modify: `src/_utils/utils.js`

- [ ] **Step 1: Replace `paymentUtils.js`**

  ```javascript
  "use server";

  import axios from "axios";
  import { getBackendToken } from "./backendAuth";

  export const createUnlockCheckout = async (imageId) => {
    const token = await getBackendToken();
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout/unlock`,
      null,
      {
        params: { image_id: imageId },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data?.session_url ?? null;
  };
  ```

- [ ] **Step 2: Update `ImagesUtils.js`**

  Remove the entire `upscaleImage` export. Add after `deleteImage`:

  ```javascript
  export const unlockImage = async (imageId, stripeSessionId) => {
    const token = await getBackendToken();
    return new Promise((resolve, reject) => {
      const params = stripeSessionId ? { stripe_session_id: stripeSessionId } : {};
      axios
        .post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/unlock/${imageId}`,
          null,
          {
            params,
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((response) => {
          revalidateTag("images");
          resolve(response.data);
        })
        .catch((err) => reject(err));
    });
  };
  ```

- [ ] **Step 3: Remove `calculateCredits` from `utils.js`**

  Open `src/_utils/utils.js` and delete the `calculateCredits` function and its export. If the file becomes empty, delete it entirely.

- [ ] **Step 4: Find all remaining imports of deleted items and remove them**

  ```bash
  grep -r "calculateCredits\|upscaleImage\|createCheckout[^U]" src/ --include="*.js" -l
  ```
  For each file listed, remove the import line.

- [ ] **Step 5: Commit**

  ```bash
  git add src/_utils/
  git commit -m "feat(utils): replace upscaleImage/createCheckout with unlockImage/createUnlockCheckout; remove calculateCredits"
  ```

---

## Task 9: Frontend — Store Cleanup + UnlockButton

**Files:**
- Modify: `src/store.js`
- Create: `src/_components/actions/UnlockButton.js`

- [ ] **Step 1: Remove processingImages from `store.js`**

  Delete these three keys and their action functions from the store:
  - `processingImages: []`
  - `addImageProcessing: ...`
  - `removeImageProcessing: ...`

- [ ] **Step 2: Create `src/_components/actions/UnlockButton.js`**

  ```javascript
  "use client";

  import React, { useState } from "react";
  import { Button, CircularProgress, Box, Typography } from "@mui/material";
  import LockOpenIcon from "@mui/icons-material/LockOpen";
  import DownloadIcon from "@mui/icons-material/Download";
  import * as amplitude from "@amplitude/analytics-browser";
  import { useStore } from "@/store";
  import { createUnlockCheckout } from "@/_utils/paymentUtils";

  export default function UnlockButton({ image }) {
    const { openAlert } = useStore();
    const [loading, setLoading] = useState(false);

    if (image?.unlocked) {
      // Append timestamp to bust the browser cache — S3 URL is the same but content
      // changed from 768px to 2048px on unlock.
      const downloadUrl = `${image.image_url}?t=${image._id}`;
      return (
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          href={downloadUrl}
          download="QR-art.png"
        >
          Download HD
        </Button>
      );
    }

    const handleUnlock = async () => {
      setLoading(true);
      try {
        amplitude.track("Unlock Image Clicked", { imageId: image._id });
        const sessionUrl = await createUnlockCheckout(image._id);
        if (sessionUrl) {
          window.location.href = sessionUrl;
        } else {
          openAlert("error", "Could not start checkout. Please try again.");
        }
      } catch {
        openAlert("error", "Could not start checkout. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Button
        variant="contained"
        color="secondary"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LockOpenIcon />}
        onClick={handleUnlock}
        disabled={loading}
      >
        {loading ? "Loading…" : "Unlock HD — $3.99"}
      </Button>
    );
  }
  ```

- [ ] **Step 3: Verify no remaining references to deleted store actions**

  ```bash
  grep -r "processingImages\|addImageProcessing\|removeImageProcessing" src/ --include="*.js"
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add src/store.js src/_components/actions/UnlockButton.js
  git commit -m "feat(frontend): remove processingImages store state; add UnlockButton component"
  ```

---

## Task 10: Frontend — ImageFill + ImageSidebar

**Files:**
- Modify: `src/app/images/[imageId]/ImageFill.js`
- Modify: `src/app/images/[imageId]/ImageSidebar.js`

- [ ] **Step 1: Update `ImageFill.js`**

  The file currently hard-codes `watermarked_image_url` and references `processingImages` from the store (which Task 9 removes). Apply these exact changes:

  Remove lines 18–20:
  ```javascript
  const { processingImages } = useStore();

  const isImageProcessing = processingImages.includes(image?._id)
  ```

  Change the skeleton condition (line 38) from:
  ```javascript
  {!image?.watermarked_image_url || isImageProcessing ? (
  ```
  to:
  ```javascript
  {!image?.watermarked_image_url ? (
  ```

  Change the `CardMedia` `image` prop (line 56) from:
  ```javascript
  image={image?.watermarked_image_url}
  ```
  to:
  ```javascript
  image={image?.unlocked ? image?.image_url : image?.watermarked_image_url}
  ```

  Remove the unused `useStore` import if nothing else in the file uses it.

- [ ] **Step 3: Update `ImageSidebar.js`**

  At the top of the component, add the unlock-on-return logic. After the existing variable declarations, add:

  ```javascript
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const stripeSessionId = searchParams?.get("stripe_session_id");
  const justGenerated = searchParams?.get("justGenerated") === "true";

  const [unlocking, setUnlocking] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  ```

  Add a `useEffect` that triggers unlock when returning from Stripe or detecting `unlock_pending`:

  ```javascript
  useEffect(() => {
    if (currentImage?.unlocked) return;
    const shouldUnlock = stripeSessionId || currentImage?.unlock_pending;
    if (!shouldUnlock) return;

    setUnlocking(true);
    unlockImage(currentImage._id, stripeSessionId)
      .then((updatedImage) => setCurrentImage(updatedImage))
      .catch(() => openAlert("error", "Image preparation failed — please try again or contact support."))
      .finally(() => setUnlocking(false));
  }, []);
  ```

  Add `import { unlockImage } from "@/_utils/ImagesUtils";` and `import { useState, useEffect } from "react";` to the imports.

  Replace `DownloadButton` usage with `UnlockButton`:
  - Remove: `import DownloadButton from "@/_components/actions/DownloadButton";`
  - Add: `import UnlockButton from "@/_components/actions/UnlockButton";`

  Replace the `{isOwner && <DownloadButton image={image} user={user} />}` line with:
  ```javascript
  {isOwner && !isGuestUser && <UnlockButton image={currentImage} />}
  ```

  Add the unlock loading overlay and the "just generated" banner. In the render, before the action buttons stack, add:

  ```javascript
  {unlocking && (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <CircularProgress size={20} color="secondary" />
      <Typography variant="body2" color="text.secondary">
        Preparing your HD image…
      </Typography>
    </Box>
  )}

  {justGenerated && !currentImage?.unlocked && !unlocking && (
    <Box sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <Typography variant="body1" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
        Your QR art is ready!
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Unlock the HD version for $3.99 — no watermark, 2048×2048px, yours to keep.
      </Typography>
      <UnlockButton image={currentImage} />
    </Box>
  )}
  ```

  Add `import { CircularProgress } from "@mui/material";` to the MUI imports.

  Pass `currentImage` instead of `image` to all child components that previously received `image`.

- [ ] **Step 4: Verify no remaining DownloadButton imports**

  ```bash
  grep -r "DownloadButton" src/ --include="*.js"
  ```
  Expected: no output (or only the file itself if not yet cleaned).

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/images/
  git commit -m "feat(image-detail): show watermarked until unlocked; add unlock flow with loading state"
  ```

---

## Task 11: Frontend — GenerateForm + Guest Flow

**Files:**
- Modify: `src/app/(main_pages)/generate/GenerateForm.js`
- Modify: `src/app/images/[imageId]/GuestSignupPrompt.js`

- [ ] **Step 1: Update `GenerateForm.js`**

  Remove this import:
  ```javascript
  import { calculateCredits } from "@/_utils/utils";
  ```

  Remove this line:
  ```javascript
  const [price, setPrice] = useState(calculateCredits({ generate: 1 }));
  ```

  In `handleGenerate`, remove the credit pre-check:
  ```javascript
  if (user?.credits < 1) {
    handleInsufficientCredits();
    setGeneratingImage(false);
    return;
  }
  ```

  Update `handleInsufficientCredits` copy for the guest case:
  ```javascript
  const handleInsufficientCredits = () => {
    setDialogContent({
      title: "Sign in to keep going",
      description: "Sign in to keep generating and save your images to your profile.",
      primaryActionText: "Sign In",
      primaryAction: () => router.push("/api/auth/signin"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };
  ```

  Change the post-generation redirect from:
  ```javascript
  router.push(`/images/${image._id}`);
  ```
  to:
  ```javascript
  router.push(`/images/${image._id}?justGenerated=true`);
  ```
  (Do this for both the guest and non-guest paths.)

  In the Generate button, replace:
  ```javascript
  Generate ( {price}
  <DiamondTwoToneIcon fontSize="small" color="primary" sx={{ mr: "4px" }} />{" "}
  )
  ```
  with simply:
  ```javascript
  Generate
  ```
  Remove the `DiamondTwoToneIcon` import if no longer used elsewhere in the file.

- [ ] **Step 2: Update `GuestSignupPrompt.js`**

  Read the file:
  ```bash
  cat src/app/images/\[imageId\]/GuestSignupPrompt.js
  ```
  Find any text about "credits" or "buy credits" and replace with:
  - Headline: *"Save your image to your profile"*
  - Body: *"Sign in to save this image and keep generating for free."*
  - CTA button: *"Sign In"* (keep existing auth route link)

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/(main_pages)/generate/GenerateForm.js src/app/images/\[imageId\]/GuestSignupPrompt.js
  git commit -m "feat(generate): remove credit UI; route to justGenerated; update guest messaging"
  ```

---

## Task 12: Frontend — Remove Credit UI (Navbar + Profile)

**Files:**
- Modify: `src/app/(main_pages)/(navbar)/AccountMenuDesktop.js`
- Modify: `src/app/(main_pages)/(navbar)/AccountMenuMobile.js`
- Modify: `src/app/profile/page.js`
- Delete: `src/app/profile/PurchaseCard.js`

- [ ] **Step 1: Update `AccountMenuDesktop.js`**

  Remove the entire credit `<Chip>` block (lines showing `DiamondTwoToneIcon` and `user?.credits`):
  ```javascript
  <Chip
    variant="outlined"
    icon={<DiamondTwoToneIcon sx={{color: theme.palette.primary.light}} />}
    label={user?.credits || 0}
    sx={{ ... }}
  />
  ```
  Remove the `DiamondTwoToneIcon` import.

- [ ] **Step 2: Update `AccountMenuMobile.js`**

  Remove the "USER CREDITS" `<ListItem>` block containing the credit `<Chip>`. Remove the `DiamondTwoToneIcon` import.

- [ ] **Step 3: Update `src/app/profile/page.js`**

  Remove the `purchaseItems` array and `getPriceByStripeId` function. Remove the `useEffect` that handles `?success` and `?canceled` query params (this was for credit purchase redirect). Remove the `<Typography>Purchase Credits</Typography>` heading and the `<Grid>` block that maps `purchaseItems` to `<PurchaseCard>`. Remove the `DiamondTwoToneIcon` import and the "Available credits" display block (`user.credits`). Remove `import PurchaseCard from "./PurchaseCard"`. Keep account name, avatar, and logout — only remove credit-related sections.

- [ ] **Step 4: Delete `PurchaseCard.js`**

  ```bash
  rm src/app/profile/PurchaseCard.js
  ```

- [ ] **Step 5: Verify no remaining credit references in UI**

  ```bash
  grep -r "credits\|DiamondTwoTone\|PurchaseCard\|purchaseItems" src/ --include="*.js" -l
  ```
  Expected: no output (any remaining matches are in files that are fine to have them, like `backendAuth.js` which doesn't have them).

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/(main_pages)/(navbar)/ src/app/profile/
  git commit -m "feat(ui): remove all credit display and purchase UI from navbar and profile"
  ```

---

## Task 13: Smoke Test + Final Checks

- [ ] **Step 1: Run all backend tests**

  ```bash
  cd codebase && source api/venv/bin/activate && pytest api/tests/ -v --ignore=api/tests/e2e
  ```
  Expected: all pass.

- [ ] **Step 2: Run frontend lint**

  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 3: Start the dev server and manually test the generate flow**

  ```bash
  npm run dev
  ```
  - Visit `http://localhost:3000/generate`
  - Confirm: Generate button shows no credit cost
  - Generate an image — confirm it routes to `/images/{id}?justGenerated=true`
  - Confirm: sidebar shows the "Your QR art is ready!" banner with Unlock CTA
  - Confirm: the displayed image has the watermark
  - Confirm: clicking "Unlock HD — $3.99" redirects to Stripe Checkout

- [ ] **Step 4: Test the guest limit flow**

  - Sign out, generate 3 images as guest
  - Confirm: 4th attempt shows the "Sign in to keep going" dialog (not "Insufficient credits")

- [ ] **Step 5: Test webhook locally with Stripe CLI (optional but recommended)**

  ```bash
  stripe listen --forward-to localhost:8000/api/stripe-webhook
  stripe trigger checkout.session.completed
  ```
  Confirm: webhook fires and `unlock_pending=True` is set on the test image in MongoDB.

- [ ] **Step 6: Final commit**

  ```bash
  git add -A
  git commit -m "feat(QRAI-53): complete pay-per-result implementation — free generate, $3.99 HD unlock"
  ```

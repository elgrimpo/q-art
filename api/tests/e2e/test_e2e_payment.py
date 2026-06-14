"""
E2E: Stripe unlock webhook flow — test-mode signature, real DB write, idempotency.

Run: pytest api/tests/e2e/test_e2e_payment.py -v -c pytest-e2e.ini -s

Requires: STRIPE_ENDPOINT_SECRET in .env (use the test-mode webhook secret from
the Stripe dashboard → Developers → Webhooks → your endpoint).

QRAI-53 pay-per-result model: the webhook no longer grants credits. On
`checkout.session.completed` it reads `metadata.image_id` and sets
`unlock_pending=True` on the image doc as a best-effort backstop (the primary
unlock path is the sync verify-and-upscale call when the user returns from
Stripe). The handler always returns 200 so Stripe does not retry indefinitely.

The test seeds a real image doc in QART.images and deletes it in a finally block.
"""
import hashlib
import hmac
import json
import os
import time
import httpx
import pytest
from bson import ObjectId
from datetime import datetime, timezone

from api.main import app

BASE = "http://test"


def _build_checkout_event(image_id: str, user_id: str) -> dict:
    """Build a checkout.session.completed event matching what the controller reads.

    The unlock webhook reads only:
      session["metadata"]["image_id"] -> image to mark unlock_pending
    """
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "metadata": {"image_id": image_id},
                "payment_intent": f"pi_e2e_test_{int(time.time() * 1000)}",
                "created": int(time.time()),
            }
        },
    }


def _sign_payload(payload_bytes: bytes) -> str:
    """Sign a raw payload with STRIPE_ENDPOINT_SECRET using Stripe's v1 HMAC scheme."""
    secret = os.environ["STRIPE_ENDPOINT_SECRET"]
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload_bytes.decode('utf-8')}"
    sig = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={sig}"


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.e2e
async def test_webhook_marks_unlock_pending_and_is_idempotent(mongo_db):
    """
    Stripe unlock webhook flow:
      1. Seed a real image doc in QART.images with unlock_pending=False
      2. POST a signed checkout.session.completed event carrying metadata.image_id
      3. Assert 200 and the image now has unlock_pending=True
      4. Replay the same event (re-signed so Stripe's timestamp check passes)
      5. Assert it is still 200 and unlock_pending stays True (naturally idempotent)
    """
    image_id = ObjectId()
    user_id = str(ObjectId())

    image_doc = {
        "_id": image_id,
        "user_id": user_id,
        "unlocked": False,
        "unlock_pending": False,
        "width": 768,
        "height": 768,
        "content": "https://example.com",
        "prompt": "e2e payment test",
        "created_at": datetime.now(timezone.utc),
        "image_url": f"https://qrartimages.s3.us-west-1.amazonaws.com/{image_id}.png",
        "watermarked_image_url": f"https://qrartimageswatermarked.s3.us-west-1.amazonaws.com/{image_id}.png",
    }
    await mongo_db["images"].insert_one(image_doc)

    event = _build_checkout_event(str(image_id), user_id)
    payload_bytes = json.dumps(event).encode()

    try:
        # --- First webhook delivery ---
        async with _client() as client:
            resp = await client.post(
                "/api/stripe-webhook",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": _sign_payload(payload_bytes),
                },
            )
        assert resp.status_code == 200, f"Webhook returned {resp.status_code}: {resp.text}"

        updated = await mongo_db["images"].find_one({"_id": image_id})
        assert updated["unlock_pending"] is True, "Expected unlock_pending=True after webhook"
        assert updated["unlocked"] is False, "Webhook must not set unlocked (that's the upscale path)"

        # --- Replay (idempotency check) — re-sign with a fresh timestamp ---
        async with _client() as client:
            resp2 = await client.post(
                "/api/stripe-webhook",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": _sign_payload(payload_bytes),
                },
            )
        assert resp2.status_code == 200

        after_replay = await mongo_db["images"].find_one({"_id": image_id})
        assert after_replay["unlock_pending"] is True
        assert after_replay["unlocked"] is False

    finally:
        await mongo_db["images"].delete_one({"_id": image_id})

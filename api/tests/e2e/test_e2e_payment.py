"""
E2E: Stripe webhook flow — test-mode signature, real DB write, idempotency check.

Run: pytest api/tests/e2e/test_e2e_payment.py -v -c pytest-e2e.ini -s

Requires: STRIPE_ENDPOINT_SECRET in .env (use the test-mode webhook secret from
the Stripe dashboard → Developers → Webhooks → your endpoint).

Notes:
- user_id (ObjectId string) is passed as client_reference_id in the Stripe event.
- Idempotency is enforced via payment_history.payment_intent_id ($ne filter in
  add_user_payment); replaying the same payment_intent must NOT grant credits twice.
- The test seeds a real user doc in QART.users and deletes it in a finally block.
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
from api.controllers.payment_controller import PRICE_CREDITS_MAP

BASE = "http://test"

# Use the first price in the map as a known-valid product ID.
VALID_PRICE_ID = list(PRICE_CREDITS_MAP.keys())[0]
VALID_CREDITS = PRICE_CREDITS_MAP[VALID_PRICE_ID]


def _build_checkout_event(user_id: str, payment_intent: str) -> dict:
    """Build a checkout.session.completed event payload matching what the controller reads.

    The controller reads:
      session["client_reference_id"]   -> user_id (ObjectId string)
      session["amount_total"]          -> transaction amount
      session["metadata"]["product_id"]-> looked up in PRICE_CREDITS_MAP
      session["payment_intent"]        -> idempotency key (stored as payment_intent_id)
      session["created"]               -> unix timestamp for payment date
    """
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "amount_total": 999,
                "metadata": {"product_id": VALID_PRICE_ID},
                "payment_intent": payment_intent,
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
async def test_webhook_grants_credits_and_is_idempotent(mongo_db):
    """
    Stripe webhook flow:
      1. Seed a real user in QART.users with 10 credits
      2. POST a signed checkout.session.completed event
      3. Assert credits increased by VALID_CREDITS
      4. Replay the same event (re-signed so Stripe timestamp check passes)
      5. Assert credits did NOT increase again (idempotency via payment_intent_id)
    """
    user_id = ObjectId()
    user_email = f"e2e_payment_{int(time.time() * 1000)}@test.example.com"
    payment_intent = f"pi_e2e_test_{int(time.time() * 1000)}"

    user_doc = {
        "_id": user_id,
        "name": "E2E Payment Test",
        "email": user_email,
        "auth_providers": [],
        "credits": 10,
        "payment_history": [],
        "image_counts": {},
        "picture": None,
    }
    await mongo_db["users"].insert_one(user_doc)

    event = _build_checkout_event(str(user_id), payment_intent)
    payload_bytes = json.dumps(event).encode()
    signature = _sign_payload(payload_bytes)

    try:
        # --- First webhook delivery ---
        async with _client() as client:
            resp = await client.post(
                "/api/stripe-webhook",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": signature,
                },
            )
        assert resp.status_code == 200, f"Webhook returned {resp.status_code}: {resp.text}"

        updated = await mongo_db["users"].find_one({"_id": user_id})
        assert updated["credits"] == 10 + VALID_CREDITS, (
            f"Expected {10 + VALID_CREDITS} credits, got {updated['credits']}"
        )

        # --- Replay (idempotency check) ---
        # Re-sign with a fresh timestamp so Stripe's tolerance window passes.
        signature2 = _sign_payload(payload_bytes)
        async with _client() as client:
            resp2 = await client.post(
                "/api/stripe-webhook",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": signature2,
                },
            )
        assert resp2.status_code == 200

        after_replay = await mongo_db["users"].find_one({"_id": user_id})
        assert after_replay["credits"] == 10 + VALID_CREDITS, (
            "Idempotency failed: credits were granted twice"
        )

    finally:
        await mongo_db["users"].delete_one({"_id": user_id})

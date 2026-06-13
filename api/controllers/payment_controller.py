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

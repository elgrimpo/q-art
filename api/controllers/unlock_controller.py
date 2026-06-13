import asyncio
import base64
import io
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
from novita_client import NovitaClient, V3TaskResponseStatus
from PIL import Image

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

# Images are generated at 768px (see api/utils/utils.py). On unlock we upscale
# to ~2048px. Novita's upscale API takes a scale_factor in the range (1, 4];
# 2048/768 ≈ 2.667 is valid. RealESRNet_x4plus is Novita's general realistic
# upscaler (the SDK has no upscale wrapper, so we call the HTTP endpoint directly).
GENERATION_SIZE = 768
UPSCALE_SIZE = 2048
UPSCALE_MODEL = "RealESRNet_x4plus"
UPSCALE_SCALE_FACTOR = round(UPSCALE_SIZE / GENERATION_SIZE, 4)
UPSCALE_TIMEOUT_SECONDS = 120


def _verify_stripe_session(stripe_session_id: str, image_id: str):
    try:
        session = stripe.checkout.Session.retrieve(stripe_session_id)
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=402, detail="Payment session not found")
    except Exception:
        logger.error("Stripe session retrieve failed for %s", stripe_session_id, exc_info=True)
        raise HTTPException(status_code=502, detail="Payment verification unavailable — please try again")
    if session.status != "complete" or session.payment_status != "paid":
        raise HTTPException(status_code=402, detail="Payment not completed")
    if session.metadata.get("image_id") != image_id:
        raise HTTPException(status_code=400, detail="Session image mismatch")


def _upscale_sync(image_b64: str) -> bytes:
    """Blocking Novita upscale: submit task, poll to completion, download result.

    The 0.7.1 SDK has no upscale helper, so we hit the /v3/async/upscale HTTP
    endpoint directly and reuse the SDK's task-polling + image-download machinery.
    """
    submit = novita_client._post(
        "/v3/async/upscale",
        {
            "request": {
                "model_name": UPSCALE_MODEL,
                "image_base64": image_b64,
                "scale_factor": UPSCALE_SCALE_FACTOR,
            },
            "extra": {"response_image_type": "png"},
        },
    )
    task_id = submit.get("task_id")
    if not task_id:
        raise RuntimeError(f"Novita upscale returned no task_id: {submit}")

    result = novita_client.wait_for_task_v3(task_id, wait_for=UPSCALE_TIMEOUT_SECONDS)
    if result.task.status != V3TaskResponseStatus.TASK_STATUS_SUCCEED:
        raise RuntimeError(f"Novita upscale task {task_id} failed: {result.task.status}")

    result.download_images()
    if not result.images_encoded:
        raise RuntimeError(f"Novita upscale task {task_id} returned no images")
    return base64.b64decode(result.images_encoded[0])


async def _run_upscale(image_id: str) -> tuple[bytes, int, int]:
    """Download original from S3, upscale via Novita, return (bytes, width, height)."""
    async with s3_session.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    ) as s3_client:
        response = await s3_client.get_object(Bucket=S3_BUCKET, Key=f"{image_id}.png")
        image_bytes = await response["Body"].read()

    b64 = base64.b64encode(image_bytes).decode()
    upscaled_bytes = await asyncio.to_thread(_upscale_sync, b64)

    with Image.open(io.BytesIO(upscaled_bytes)) as img:
        width, height = img.size
    return upscaled_bytes, width, height


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
        upscaled_bytes, width, height = await _run_upscale(image_id)
    except Exception:
        logger.error("Upscale failed for image %s", image_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Image preparation failed — please try again")

    # Upload back to S3 (overwrites the 768px original with the upscaled version)
    try:
        await _upload_upscaled(image_id, upscaled_bytes)
    except Exception:
        logger.error("S3 upload failed for image %s", image_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Image preparation failed — please try again")

    # Mark unlocked in DB
    update_data = {
        "unlocked": True,
        "unlock_pending": False,
        "width": width,
        "height": height,
    }
    updated = await update_image(image_id, update_data)
    if not updated or "message" in updated:
        logger.error("update_image returned an error for image %s after successful upscale", image_id)
        raise HTTPException(status_code=500, detail="Image preparation failed — please try again")
    return updated

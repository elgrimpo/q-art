import io
import logging
import os

import aioboto3
import certifi
import motor.motor_asyncio as motor
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from api.controllers.images_controller import update_image  # imported for tests that assert it's NOT called

logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
_client = motor.AsyncIOMotorClient(mongo_url, **_tls)
_db = _client.get_database("QART")
images = _db.get_collection("images")

S3_BUCKET = "qrartimages"
s3_session = aioboto3.Session()


async def _download_from_s3(image_id: str) -> bytes:
    async with s3_session.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    ) as s3_client:
        response = await s3_client.get_object(Bucket=S3_BUCKET, Key=f"{image_id}.png")
        return await response["Body"].read()


async def admin_download_image(image_id: str) -> StreamingResponse:
    try:
        object_id = ObjectId(image_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Image not found")

    image = await images.find_one({"_id": object_id})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # unlock_image() overwrites the same S3 key in place (768px original -> 2048px
    # upscale), so this key always holds a valid file regardless of unlock state.
    # No need to run the paid-tier upscale just to serve an admin download (QRAI-131).
    try:
        image_bytes = await _download_from_s3(image_id)
    except Exception:
        logger.error("Admin download failed for image %s", image_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Image download failed — please try again")

    return StreamingResponse(
        io.BytesIO(image_bytes),
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="QR-art-{image_id}.png"'},
    )


async def admin_get_image_info(image_id: str) -> dict:
    try:
        object_id = ObjectId(image_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Image not found")

    doc = await images.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")

    doc["_id"] = str(doc["_id"])
    # Serialize datetime values to ISO strings
    for key in list(doc.keys()):
        val = doc[key]
        if hasattr(val, "isoformat"):
            doc[key] = val.isoformat()

    return {"doc": doc}

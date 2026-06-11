# Libraries Import
import qrcode
import httpx
from dotenv import load_dotenv
import os
import json
from novita_client import *
import aioboto3
import base64
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
import motor.motor_asyncio as motor
from pymongo import ReturnDocument
import certifi
from io import BytesIO
from PIL import Image
import asyncio
import functools

# App imports
from api.controllers.images_controller import (
    create_image_doc,
    upload_image_to_s3,
    update_image,
)
from api.utils.utils import (
    prepare_img2img_request,
    create_watermark,
    calculate_credits,
)
from api.controllers.users_controller import increment_user_count
from api.schemas.schemas import ImageDoc

load_dotenv()

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MONGO DB
mongo_url = os.environ["MONGO_URL"]
client = motor.AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")
guest_credits_col = db.get_collection("guest_credits")

GUEST_FREE_CREDITS = 3

# Resolutions a user may request for an upscale. Must stay in sync with the
# upscale_resize price map in api/utils/utils.calculate_credits — an off-tier
# value isn't priced (calculate_credits would return 0), so it must be rejected
# rather than run as a free arbitrary-size upscale.
ALLOWED_UPSCALE_RESOLUTIONS = {512, 1024, 2048, 4096}

# S3
api_url = os.environ["S3_URL"]
s3_bucket_name = "qrartimages"
s3_bucket_watermarked_name = "qrartimageswatermarked"
s3_session = aioboto3.Session()
# Novita
client = NovitaClient(os.environ["NOVITA_KEY"])

# Bound how long we wait on the generated-image download from Novita's CDN.
# Without a cap, one slow or hung upstream response blocks the async event loop
# and can stall every concurrent request on the worker (QRAI-39).
IMAGE_DOWNLOAD_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


async def download_image_bytes(image_url):
    """Download the generated image asynchronously with explicit timeouts.

    Replaces a blocking ``requests.get`` that ran inline on the event loop.
    Awaiting an httpx client keeps the loop free and guarantees the call can't
    hang indefinitely on a slow Novita/CDN response.
    """
    async with httpx.AsyncClient(timeout=IMAGE_DOWNLOAD_TIMEOUT) as http_client:
        response = await http_client.get(image_url)
        response.raise_for_status()
        return response.content


# ---------------------------------------------------------------------------- #
#                                    PREDICT                                   #
# ---------------------------------------------------------------------------- #


async def predict(
    prompt: str,
    website: str,
    negative_prompt: str,
    seed: int,
    qr_weight: float,
    sd_model: str,
    user_id: str,
    style_prompt: str,
    style_title: str,
):
    try:
        # --------------------------------- CHECK FUNDS ------------------------------- #
        service_config = {"generate": "1"}
        credits_required = calculate_credits(service_config)
        credits_deducted = False

        # Handle guest users: enforce server-side quota via atomic MongoDB counter.
        if str(user_id).startswith("guest_"):
            result = await guest_credits_col.find_one_and_update(
                {"_id": user_id},
                {"$inc": {"used": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            if result["used"] > GUEST_FREE_CREDITS:
                # Undo the increment so the counter stays stable at the limit.
                await guest_credits_col.update_one({"_id": user_id}, {"$inc": {"used": -1}})
                raise HTTPException(status_code=403, detail="Insufficient credits")
        else:
            # Atomic check-and-deduct: no match means insufficient credits.
            result = await users.find_one_and_update(
                {"_id": ObjectId(user_id), "credits": {"$gte": credits_required}},
                {"$inc": {"credits": -credits_required}},
            )
            if result is None:
                raise HTTPException(status_code=403, detail="Insufficient credits")
            credits_deducted = True

        # ------------------------------ CREATE QR CODE ------------------------------ #
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(website)

        qr_image = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        # PNG (lossless) keeps the QR edges crisp — JPEG compression softens the
        # sharp module borders that ControlNet depends on, hurting scannability.
        qr_image.save(buffer, format="PNG")
        buffer.seek(0)
        image_base64_str = base64.b64encode(buffer.getvalue()).decode("ascii")

        # -------------------------- GENERATE IMAGE AND SAVE ------------------------- #

        req = prepare_img2img_request(
                    prompt,
                    negative_prompt,
                    sd_model,
                    seed,
                    image_base64_str,
                    qr_weight,
                    style_prompt,
                )

        try:
            # Novita calls are network I/O — run in a thread pool so the event
            # loop stays free. ProcessPoolExecutor (the old approach) spawns new
            # OS processes for each request, which is expensive and unnecessary
            # for I/O-bound work (QRAI-40).
            txt2img_result = await asyncio.to_thread(
                functools.partial(client.img2img_v3, **req)
            )

            if txt2img_result is None:
                raise NovitaResponseError(
                    f"Text to Image generation failed with response {txt2img_result}, code: Unknown"
                )

            task_id = txt2img_result.task.task_id

            print("task id:" + task_id)

            res = await asyncio.to_thread(client.wait_for_task_v3, task_id)

            # After waiting for task completion
            if res.task.status != V3TaskResponseStatus.TASK_STATUS_SUCCEED:
                raise Exception(f"Failed to generate image with error: {res.task.reason}")

            # Extract seed and image
            seed = res.extra.seed if res.extra else None
            image_url = res.get_image_urls()[0]  # Or iterate if multiple

            # Download image (async + timed out so a slow CDN can't hang the loop)
            image_bytes = await download_image_bytes(image_url)
            generated_image = Image.open(BytesIO(image_bytes))

        except Exception as generation_error:
            if credits_deducted:
                await users.update_one(
                    {"_id": ObjectId(user_id)}, {"$inc": {"credits": credits_required}}
                )
            print(generation_error)
            raise HTTPException(status_code=500, detail="Image generation failed")

        # ------------------------------ UPDATE DATABASE ----------------------------- #
        try:
            inserted_image_id = await create_image_doc(
                req,
                seed,
                website,
                qr_weight,
                user_id,
                prompt,
                style_prompt,
                style_title,
            )
            # ---------------------------- UPLOAD IMAGES TO S3 --------------------------- #

            # Apply watermark to the original image
            watermarked_image = create_watermark(generated_image)

            # Create name for image files
            object_name = f"{inserted_image_id}.png"

            # Upload original image to S3
            original_image_url = await upload_image_to_s3(
                generated_image, object_name, s3_bucket_name
            )

            # Upload watermarked image to S3
            watermarked_image_url = await upload_image_to_s3(
                watermarked_image, object_name, s3_bucket_watermarked_name
            )

            # Update the image document with image URLs
            updated_data = {
                "image_url": original_image_url,
                "watermarked_image_url": watermarked_image_url,
            }

            updated_image = await update_image(inserted_image_id, updated_data)

        except Exception as db_error:
            if credits_deducted:
                await users.update_one(
                    {"_id": ObjectId(user_id)}, {"$inc": {"credits": credits_required}}
                )
            print(db_error)
            raise HTTPException(status_code=500, detail="Database insertion failed")

        # ---------------------- UPDATE USER CREDITS AND COUNT ---------------------- #
        try:
            if not str(user_id).startswith("guest_"):
                # Credits already atomically deducted above; pass 0 to only update counters.
                await increment_user_count(user_id, service_config, 0)
        except Exception:
            # Handle user count update error
            raise HTTPException(status_code=500, detail="User count update failed")

        return updated_image

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(str(unexpected_error))
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ---------------------------------------------------------------------------- #
#                                    UPSCALE                                   #
# ---------------------------------------------------------------------------- #


async def upscale(image_id, user_id, resolution):
    try:
        # ------------------------------ VALIDATE INPUT ------------------------------ #
        # Reject an unknown resolution up front: a non-numeric value would raise
        # ValueError on int() and an off-tier size would run a real upscale for 0
        # credits (it isn't in the price map). Either way -> clean 400, not a raw 500.
        try:
            resolution = int(resolution)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid resolution")
        if resolution not in ALLOWED_UPSCALE_RESOLUTIONS:
            raise HTTPException(status_code=400, detail="Invalid resolution")

        # A malformed id can't be a real document — treat it as not found rather than
        # letting ObjectId() raise InvalidId and surface as a generic 500.
        try:
            object_id = ObjectId(image_id)
        except (InvalidId, TypeError):
            raise HTTPException(status_code=404, detail="Image not found")

        # -------------------------------- CHECK FUNDS ------------------------------- #
        image = await images.find_one({"_id": object_id})

        # --------------------------- OWNERSHIP CHECK -------------------------- #
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        if image.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to upscale this image")

        service_config = {
            "upscale_resize": (
                resolution if image["width"] < resolution else 0
            ),
            "download": not image.get("downloaded", False),
        }

        credits_required = calculate_credits(service_config)

        result = await users.find_one_and_update(
            {"_id": ObjectId(user_id), "credits": {"$gte": credits_required}},
            {"$inc": {"credits": -credits_required}},
        )
        if result is None:
            raise HTTPException(status_code=403, detail="Insufficient credits")

        # ------------------------------ UPSCALE REQUIRED ----------------------------- #
        if resolution > image["width"]:

            # ----------------------------- GET IMAGE FROM S3 ---------------------------- #
            try:
                async with s3_session.client(
                    "s3",
                    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
                ) as s3_client:

                    # Upload file to S3 asynchronously
                    object_name = image_id + ".png"
                    response = await s3_client.get_object(Bucket=s3_bucket_name, Key=object_name)
                    image_content = await response["Body"].read()
                    base64_image = base64.b64encode(image_content).decode()
            except Exception:
                await users.update_one(
                    {"_id": ObjectId(user_id)}, {"$inc": {"credits": credits_required}}
                )
                raise HTTPException(
                    status_code=500, detail="Failed to retrieve image from S3"
                )

            # ------------------------------ UPSCALE IMAGE ----------------------------- #
            try:
                upscale_request = UpscaleRequest(
                    image=base64_image,
                    upscaling_resize_w=resolution,
                    upscaling_resize_h=resolution,
                    resize_mode=UpscaleResizeMode.SIZE,
                )
                upscale_response = await asyncio.to_thread(
                    client.sync_upscale, upscale_request
                )

            except Exception:
                await users.update_one(
                    {"_id": ObjectId(user_id)}, {"$inc": {"credits": credits_required}}
                )
                raise HTTPException(status_code=500, detail="Image upscaling failed")

            # ------------------------------ UPDATE DATABASE ----------------------------- #
            try:
                async with s3_session.client(
                    "s3",
                    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
                ) as s3_client:
                    upscaled_image_content = upscale_response.data.imgs_bytes[0]
                    await s3_client.put_object(
                        Bucket=s3_bucket_name,
                        Key=object_name,
                        Body=upscaled_image_content,
                    )
                update_data = {
                    "width": resolution,
                    "height": resolution,
                    "downloaded": True,
                }

                updated_image = await update_image(image_id, update_data)
            except Exception:
                await users.update_one(
                    {"_id": ObjectId(user_id)}, {"$inc": {"credits": credits_required}}
                )
                raise HTTPException(status_code=500, detail="Database update failed")

            # --------------------------- UPSCALE NOT REQUIRED --------------------------- #
        else:
            if not image.get("downloaded"):
                update_data = {"downloaded": True}
                updated_image = await update_image(image_id, update_data)
            else:
                updated_image = image
        # ---------------------- UPDATE USER CREDITS AND COUNT ---------------------- #
        try:
            # Credits already atomically deducted above; pass 0 to only update counters.
            await increment_user_count(user_id, service_config, 0)
        except Exception:
            # Handle user count update error
            raise HTTPException(status_code=500, detail="User count update failed")

        return ImageDoc(**updated_image)

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(f"Error during upscaling: {str(unexpected_error)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

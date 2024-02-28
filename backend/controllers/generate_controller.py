# Libraries Import
import qrcode
import requests
from dotenv import load_dotenv
import os
import json
from novita_client import *
import boto3
import base64
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from io import BytesIO
from PIL import Image

# App imports
from controllers.images_controller import (
    create_image_doc,
    upload_image_to_s3,
    update_image,
)
from utils.utils import (
    prepare_txt2img_request,
    create_watermark,
    calculate_credits,
    sufficient_credit,
)
from controllers.users_controller import increment_user_count
from schemas.schemas import ImageDoc

load_dotenv()

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MONGO DB
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")

# S3
api_url = os.environ["S3_URL"]
s3_bucket_name = "qrartimages"
s3_bucket_watermarked_name = "qrartimageswatermarked"
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
)
# Novita
client = NovitaClient(os.environ["NOVITA_KEY"])


# ---------------------------------------------------------------------------- #
#                                    PREDICT                                   #
# ---------------------------------------------------------------------------- #


async def predict(
    prompt,
    website,
    negative_prompt,
    seed,
    qr_weight,
    sd_model,
    user_id,
    style_prompt,
    style_title,
):
    try:
        # --------------------------------- CHECK FUNDS ------------------------------- #
        service_config = {"generate": "1"}
        credits_required = calculate_credits(service_config)

        user_data = users.find_one({"_id": ObjectId(user_id)})
        if not sufficient_credit(user_data, service_config):
            raise HTTPException(status_code=403, detail="Insufficient credits")

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
        qr_image.save(buffer, format="JPEG")  # Save as JPEG
        buffer.seek(0)
        image_base64_str = base64.b64encode(buffer.getvalue()).decode("ascii")

        # -------------------------- GENERATE IMAGE AND SAVE ------------------------- #

        req = prepare_txt2img_request(
            prompt,
            negative_prompt,
            sd_model,
            seed,
            image_base64_str,
            qr_weight,
            style_prompt,
        )
        try:
            response = client.txt2img(req)

            if response.data is None:
                raise NovitaResponseError(
                    f"Text to Image generation failed with response {response.msg}, code: {response.code}"
                )

            print("task id:" + response.data.task_id)
            res = client.wait_for_task(response.data.task_id, callback=None)
            info_dict = json.loads(res.data.info)
            seed = info_dict.get("seed")

            info = json.dumps(info_dict, indent=4)
            print(info)

            if res.data.status != ProgressResponseStatusCode.SUCCESSFUL:
                raise Exception(
                    "Failed to generate image with error: " + res.data.failed_reason
                )

            # Open generated image
            image_url = res.data.imgs[0]
            image_data = requests.get(image_url)
            generated_image = Image.open(BytesIO(image_data.content))

        except Exception as generation_error:
            # Handle image generation error
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
            # Handle database insertion error
            print(db_error)
            raise HTTPException(status_code=500, detail="Database insertion failed")

        # ---------------------- UPDATE USER CREDITS AND COUNT ---------------------- #
        try:
            await increment_user_count(user_id, service_config, credits_required)
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
        # -------------------------------- CHECK FUNDS ------------------------------- #
        image = images.find_one({"_id": ObjectId(image_id)})

        service_config = {
            "upscale_resize": (
                int(resolution) if image["width"] < int(resolution) else 0
            ),
            "download": not image.get("downloaded", False),
        }

        credits_required = calculate_credits(service_config)

        user_data = users.find_one({"_id": ObjectId(user_id)})
        if not sufficient_credit(user_data, service_config):
            raise HTTPException(status_code=403, detail="Insufficient credits")

        # ------------------------------ UPSCALE REQUIRED ----------------------------- #
        if int(resolution) > image["width"]:

            # ----------------------------- GET IMAGE FROM S3 ---------------------------- #
            try:
                object_name = image_id + ".png"
                response = s3_client.get_object(Bucket=s3_bucket_name, Key=object_name)
                image_content = response["Body"].read()
                base64_image = base64.b64encode(image_content).decode()
            except Exception:
                # Handle S3 retrieval error
                raise HTTPException(
                    status_code=500, detail="Failed to retrieve image from S3"
                )

            # ------------------------------ UPSCALE IMAGE ----------------------------- #
            try:
                upscale_request = UpscaleRequest(
                    image=base64_image,
                    upscaling_resize_w=int(resolution),
                    upscaling_resize_h=int(resolution),
                    resize_mode=UpscaleResizeMode.SIZE,
                )
                upscale_response = client.sync_upscale(upscale_request)

            except Exception:
                # Handle image upscaling error
                raise HTTPException(status_code=500, detail="Image upscaling failed")

            # ------------------------------ UPDATE DATABASE ----------------------------- #
            try:
                upscaled_image_content = upscale_response.data.imgs_bytes[0]
                s3_client.put_object(
                    Bucket=s3_bucket_name, Key=object_name, Body=upscaled_image_content
                )
                update_data = {
                    "width": int(resolution),
                    "height": int(resolution),
                    "downloaded": True,
                }

                updated_image = await update_image(image_id, update_data)
            except Exception:
                # Handle database update error
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
            await increment_user_count(user_id, service_config, credits_required)
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

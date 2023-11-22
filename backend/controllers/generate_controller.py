# Libraries Import
import qrcode
from dotenv import load_dotenv
import os
from novita_client import *
import boto3
import base64
from bson import ObjectId
from fastapi import HTTPException, Query
from starlette.requests import Request
from pymongo import MongoClient

# App imports
from controllers.images_controller import insert_image, update_image
from utils.utils import (
    readImage,
    prepare_doc,
    parse_seed,
    calculate_credits,
    sufficient_credit,
)
from controllers.users_controller import increment_user_count

load_dotenv()

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MONGO DB
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")

# S3
api_url = os.environ["S3_URL"]
s3_bucket_name = "qrartimages"
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
    image_quality,
    qr_weight,
    sd_model,
    user_id,
):
    try:
        # --------------------------------- CHECK FUNDS ------------------------------- #
        service_config = {"image_quality": image_quality}
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

        qr_image = qr.make_image()
        qr_image.save("qrcode.png")
        image_base64_str = readImage("qrcode.png")

        # ------------------------------ PREPARE REQUEST ----------------------------- #
        if image_quality == "low":
            steps = 13
        elif image_quality == "medium":
            steps = 20
        elif image_quality == "high":
            steps = 30

        req = Txt2ImgRequest(
            prompt=prompt,
            negative_prompt=negative_prompt,
            sampler_name=Samplers.DPMPP_M_KARRAS,
            model_name=sd_model,
            width=512,
            height=512,
            steps=steps,
            batch_size=1,
            cfg_scale=9,
            seed=int(seed),
            controlnet_units=[
                ControlnetUnit(
                    input_image=image_base64_str,
                    control_mode=ControlNetMode.BALANCED,
                    model="controlV1pSd15_v10_92404",
                    module=ControlNetPreprocessor.INPAINT,
                    resize_mode=ControlNetResizeMode.RESIZE_OR_CORP,
                    weight=0.35,
                    guidance_start=0.0,
                    guidance_end=1.0,
                ),
                ControlnetUnit(
                    input_image=image_base64_str,
                    control_mode=ControlNetMode.BALANCED,
                    model="control_v1p_sd15_qrcode_monster_v2",
                    module=ControlNetPreprocessor.INPAINT,
                    resize_mode=ControlNetResizeMode.RESIZE_OR_CORP,
                    weight=1.0 + float(qr_weight) * 0.1,
                    guidance_start=0.2 - float(qr_weight) * 0.05,
                    guidance_end=0.85 + float(qr_weight) * 0.05,
                ),
            ],
        )

        # -------------------------- GENERATE IMAGE AND SAVE ------------------------- #
        try:
            res = client.sync_txt2img(req)
            if res.data.status != ProgressResponseStatusCode.SUCCESSFUL:
                raise Exception("Failed to generate image with error: " + res.data.failed_reason)

            save_image(res.data.imgs_bytes[0], "qrcode-art.png")

            with Image.open("qrcode-art.png") as img:
                metadata_str = img.info.get("parameters")
                parsed_seed = parse_seed(metadata_str)

            if parsed_seed is not None:
                info = {"seed": parsed_seed}
            else:
                info = {"seed": -1}  # Placeholder if parsing fails

        except Exception as generation_error:
            # Handle image generation error
            raise HTTPException(status_code=500, detail="Image generation failed")

        # ------------------------------ UPDATE DATABASE ----------------------------- #
        try:
            doc = prepare_doc(req, info, website, image_quality, qr_weight, user_id)
            inserted_image = await insert_image(doc)
        except Exception as db_error:
            # Handle database insertion error
            raise HTTPException(status_code=500, detail="Database insertion failed")

        # ---------------------- UPDATE USER CREDITS AND COUNT ---------------------- #
        try:
            await increment_user_count(user_id, service_config, credits_required)
        except Exception as user_count_error:
            # Handle user count update error
            raise HTTPException(status_code=500, detail="User count update failed")

        return inserted_image

    except HTTPException as http_exception:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(str(unexpected_error))
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ---------------------------------------------------------------------------- #
#                                    UPSCALE                                   #
# ---------------------------------------------------------------------------- #


async def upscale(image_id, user_id):
    try:
        # -------------------------------- CHECK FUNDS ------------------------------- #
        service_config = {
            "upscale_resize": "2",
        }
        credits_required = calculate_credits(service_config)

        user_data = users.find_one({"_id": ObjectId(user_id)})
        if not sufficient_credit(user_data, service_config):
            raise HTTPException(status_code=403, detail="Insufficient credits")

        # ----------------------------- GET IMAGE FROM S3 ---------------------------- #
        try:
            object_name = image_id + ".png"
            response = s3_client.get_object(Bucket=s3_bucket_name, Key=object_name)
            image_content = response["Body"].read()
            base64_image = base64.b64encode(image_content).decode()
        except Exception as s3_error:
            # Handle S3 retrieval error
            raise HTTPException(status_code=500, detail="Failed to retrieve image from S3")

        # ------------------------------ UPSCALE IMAGE ----------------------------- #
        try:
            upscale_request = UpscaleRequest(image=base64_image, upscaling_resize=2.0)
            upscale_response = client.sync_upscale(upscale_request)
        except Exception as upscale_error:
            # Handle image upscaling error
            raise HTTPException(status_code=500, detail="Image upscaling failed")

        # ------------------------------ UPDATE DATABASE ----------------------------- #
        try:
            upscaled_image_content = upscale_response.data.imgs_bytes[0]
            s3_client.put_object(
                Bucket=s3_bucket_name, Key=object_name, Body=upscaled_image_content
            )
            update_data = {"width": 1024, "height": 1024}
            updated_image = await update_image(image_id, update_data)
        except Exception as db_update_error:
            # Handle database update error
            raise HTTPException(status_code=500, detail="Database update failed")

        # ---------------------- UPDATE USER CREDITS AND COUNT ---------------------- #
        try:
            await increment_user_count(user_id, service_config, credits_required)
        except Exception as user_count_error:
            # Handle user count update error
            raise HTTPException(status_code=500, detail="User count update failed")

        return updated_image

    except HTTPException as http_exception:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(f"Error during upscaling: {str(unexpected_error)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
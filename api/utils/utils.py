# Libraries Import
import requests as requests
import datetime
import logging
import re
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional
from PIL import Image
from novita_client import *


# App imports
from api.schemas.schemas import ImageDoc, ControlNet

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------- #
#                                  PARSE SEED                                  #
# ---------------------------------------------------------------------------- #


def parse_seed(metadata):
    # Use regular expression to find the value associated with 'Seed'
    match = re.search(r"Seed: (\d+)", metadata)

    # Check if the 'Seed' key is found
    if match:
        seed_value = match.group(1)
        return int(seed_value)
    else:
        return None


# ---------------------------------------------------------------------------- #
#                            PREPARE IMG2IMG REQUEST                           #
# ---------------------------------------------------------------------------- #


def prepare_img2img_request(
    prompt: str,
    negative_prompt: str,
    sd_model: str,
    seed: int,
    image_base64_str: str,
    qr_weight: float,
    style_prompt: str,
):
    full_prompt = prompt + style_prompt

    # qr_weight slider (0..1) -> QR ControlNet strength + guidance start.
    # Higher weight = more scannable, lower = more artistic.
    weight = round(0.85 + qr_weight * 0.2, 2)           # 0.85 .. 1.05
    guidance_start = round(0.40 - qr_weight * 0.03, 2)  # 0.40 .. 0.37

    # Neutral #808080 init image at the generation size. Novita deprecated
    # txt2img+ControlNet and forced us onto img2img; pairing a flat-gray init
    # with strength=1.0 makes img2img start from pure noise, i.e. behave like
    # txt2img. The model paints freely while the QR structure is enforced
    # entirely through ControlNet. This recovers the quality lost in the move.
    side = 768
    gray = Image.new("RGB", (side, side), (128, 128, 128))
    _buf = BytesIO()
    gray.save(_buf, format="JPEG")
    gray_init_base64 = base64.b64encode(_buf.getvalue()).decode("ascii")

    req = dict(
        model_name=sd_model,
        input_image=gray_init_base64,
        prompt=full_prompt,
        negative_prompt=negative_prompt,
        sampler_name="DPM++ 2M Karras",
        width=side,
        height=side,
        steps=30,
        guidance_scale=7,
        seed=seed,
        image_num=1,
        strength=1.0,
        controlnet_units=[
            # Brightness ControlNet — blends the QR's light/dark structure into
            # the art. The QR is fed directly: NO preprocessor.
            Img2ImgV3ControlNetUnit(
                image_base64=image_base64_str,
                model_name="control_v1p_sd15_brightness",
                strength=0.35,
                # Pass Python None (-> JSON null) so Novita skips preprocessing
                # and uses the raw QR. Do NOT send the string 'none': it's not in
                # Novita's preprocessor enum and triggers "Failed to exec". And
                # don't just omit this kwarg — if the SDK default is the NULL enum
                # it serializes back to 'none'. Explicit None is the safe form.
                preprocessor=None,
                guidance_start=0.0,
                guidance_end=1.0,
            ),
            # QR Code Monster v2 — enforces the scannable QR pattern. Feeding the
            # raw QR with NO preprocessor is required; the old LINEART/CANNY step
            # pre-mangled the QR and is what destroyed scannability + quality.
            Img2ImgV3ControlNetUnit(
                image_base64=image_base64_str,
                model_name="control_v1p_sd15_qrcode_monster_v2",
                strength=weight,
                preprocessor=None,  # JSON null -> no preprocessing (raw QR)
                guidance_start=guidance_start,
                guidance_end=0.85,
            ),
        ],
    )

    return req


# ---------------------------------------------------------------------------- #
#                            CREATE WATERMARKED B64 IMAGE                            #
# ---------------------------------------------------------------------------- #


def create_watermark(image):
    try:
        watermark_image_path = "api/utils/watermark.png"
        watermark = Image.open(watermark_image_path)

        # Create a copy of the original image
        watermarked_image = image.copy()

        # Place the watermark in the bottom right corner
        width, height = watermarked_image.size
        watermark_size = watermark.size
        position = (width - watermark_size[0], height - watermark_size[1] - 25)

        watermarked_image.paste(watermark, position, watermark)

        # Convert to base64
        buffered = BytesIO()
        watermarked_image.save(buffered, format="PNG")

        return watermarked_image

    except Exception:
        logger.error("Error creating watermarked image", exc_info=True)
        return None


# ---------------------------------------------------------------------------- #
#                                  PREPARE IMAGE DOC                           #
# ---------------------------------------------------------------------------- #


def prepare_doc(
    req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title
):
    # sampler_name = req["sampler_name"]
    # control_mode_0 = req["controlnet_units"][0].control_mode.value
    model_0 = req["controlnet_units"][0].model_name
    # module_0 = req["controlnet_units"][0].module.value
    # resize_mode_0 = req["controlnet_units"][0].resize_mode.value

    # control_mode_1 = req["controlnet_units"][1].control_mode.value
    # model_1 = req["controlnet_units"][1].model_name
    # module_1 = req["controlnet_units"][1].module.value
    # resize_mode_1 = req["controlnet_units"][1].resize_mode.value


    doc = ImageDoc(
        user_id=user_id,
        created_at=datetime.utcnow(),
        prompt=prompt,
        negative_prompt=req["negative_prompt"],
        style_title=style_title,
        style_prompt=style_prompt,
        content=website,
        sd_model=req["model_name"],
        seed=seed,
        qr_weight=qr_weight,
        width=req["width"],
        height=req["height"],
        query_type="img2img",
        steps=req["steps"],
        # cfg_scale=req["cfg_scale"],
        # sampler_name=sampler_name,
        controlnet0=ControlNet(
            # control_mode=control_mode_0,
            model=model_0,
            # module=module_0,
            weight=req["controlnet_units"][0].strength,
            guidance_start=req["controlnet_units"][0].guidance_start,
            guidance_end=req["controlnet_units"][0].guidance_end,
            # resize_mode=resize_mode_0,
        ),
        # controlnet1=ControlNet(
        #     # control_mode=control_mode_1,
        #     model=model_1,
        #     # module=module_1,
        #     weight=req["controlnet_units"][0].strength,
        #     guidance_start=req["controlnet_units"][0].guidance_start,
        #     guidance_end=req["controlnet_units"][0].guidance_end,
        #     # resize_mode=resize_mode_1,
        # ),
    )
    return doc


# ---------------------------------------------------------------------------- #
#                               CALCULATE CREDITS                              #
# ---------------------------------------------------------------------------- #


def calculate_credits(service):

    price = {
        "generate": {
            "1": 1,
        },
        "download": {False: 0, True: 10},
        "upscale_resize": {0: 0, 512: 10, 1024: 15, 2048: 20, 4096: 25},
    }

    total_credits = 0

    # Calculate credits based on image quality
    generate = service.get("generate", "none")
    total_credits += price["generate"].get(generate, 0)

    # Calculate credits based on download
    download = service.get("download", "none")
    total_credits += price["download"].get(download, False)

    # Calculate credits based on upscale_resize
    upscale_resize = service.get("upscale_resize", "0")
    total_credits += price["upscale_resize"].get(upscale_resize, 0)

    return total_credits


# ---------------------------------------------------------------------------- #
#                              SUFFICIENT CREDITS                              #
# ---------------------------------------------------------------------------- #


def sufficient_credit(user, service):
    user_credits = user.get("credits", 0)
    total_credits = calculate_credits(service)

    return user_credits >= total_credits


# ---------------------------------------------------------------------------- #
#                          CREATE IMAGES FILTER QUERY                          #
# ---------------------------------------------------------------------------- #


def createImagesFilterQuery(
    likes: Optional[str] = None,
    time_period: Optional[str] = None,
    image_style: Optional[str] = None,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
):
    query = {}

    # Include / Exclude user_id
    if user_id:
        query["user_id"] = user_id
    if exclude_user_id:
        query["user_id"] = {"$ne": exclude_user_id}

    # Time period
    if time_period == "Today":
        end_of_day = datetime.now()
        start_of_day = end_of_day - timedelta(days=1)
        query["created_at"] = {"$gte": start_of_day, "$lte": end_of_day}
    elif time_period == "This Week":
        end_of_week = datetime.now()
        start_of_week = end_of_week - timedelta(weeks=1)
        query["created_at"] = {"$gte": start_of_week, "$lte": end_of_week}
    elif time_period == "This Month":
        end_of_month = datetime.now()
        start_of_month = end_of_month - timedelta(days=30)
        query["created_at"] = {"$gte": start_of_month, "$lte": end_of_month}
    elif time_period == "This Year":
        end_of_year = datetime.now()
        start_of_year = end_of_year - timedelta(days=365)
        query["created_at"] = {"$gte": start_of_year, "$lte": end_of_year}

    #  SD Model
    if image_style:
        query["style_title"] = image_style

    # Likes
    if likes == "Liked by me":
        if user_id:
            query["likes.userId"] = user_id

    return query

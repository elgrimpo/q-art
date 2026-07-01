# Libraries Import
import requests as requests
import datetime
import re
import json
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional, List
from PIL import Image
from novita_client import *


# App imports
from api.schemas.schemas import ImageDoc, ControlNet

# ---------------------------------------------------------------------------- #
#                        SHORT PROMPT QUALITY SUFFIX                           #
# ---------------------------------------------------------------------------- #

SHORT_PROMPT_THRESHOLD = 7
QUALITY_SUFFIX = "highly detailed, dramatic lighting, rich atmosphere, intricate composition, vibrant colors"

# ---------------------------------------------------------------------------- #
#                            NORMALIZE QR URL                                  #
# ---------------------------------------------------------------------------- #


def normalize_qr_url(url: str) -> str:
    """Strip protocol, www., and root trailing slash to reduce QR complexity."""
    url = re.sub(r'^https?://', '', url)
    url = re.sub(r'^www\.', '', url)
    # Strip trailing slash only for root URLs (no path beyond /)
    if url.endswith('/') and url.count('/') == 1:
        url = url.rstrip('/')
    return url


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
#                            PARSE STYLE LORAS                                 #
# ---------------------------------------------------------------------------- #

# A style's LoRAs arrive as an untrusted JSON query param (style_loras). Our
# styles use at most 2; cap and clamp so a bad client value can't push extreme
# or oversized input to Novita.
MAX_STYLE_LORAS = 6
LORA_STRENGTH_MIN = 0.0
LORA_STRENGTH_MAX = 1.5
MAX_LORA_NAME_LEN = 200


def parse_style_loras(raw):
    """Parse the client-supplied ``style_loras`` JSON into Novita LoRA objects.

    ``raw`` is a JSON-encoded list of ``{"model_name": str, "strength": number}``.
    This must NEVER raise: any malformed, empty, or non-list input returns ``[]``
    so a bad value can't 500 a generation. Entries without a non-empty string
    ``model_name`` are dropped; ``strength`` is coerced to float, defaulted to
    1.0, and clamped to [LORA_STRENGTH_MIN, LORA_STRENGTH_MAX]. At most
    MAX_STYLE_LORAS valid entries are returned.
    """
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return []
    if not isinstance(data, list):
        return []

    loras = []
    for entry in data:
        if len(loras) >= MAX_STYLE_LORAS:
            break
        if not isinstance(entry, dict):
            continue
        model_name = entry.get("model_name")
        if not isinstance(model_name, str):
            continue
        model_name = model_name.strip()
        if not model_name or len(model_name) > MAX_LORA_NAME_LEN:
            continue
        try:
            strength = float(entry.get("strength", 1.0))
        except (ValueError, TypeError):
            strength = 1.0
        strength = max(LORA_STRENGTH_MIN, min(LORA_STRENGTH_MAX, strength))
        loras.append(Img2V3ImgLoRA(model_name=model_name, strength=strength))
    return loras


# ---------------------------------------------------------------------------- #
#                            PREPARE IMG2IMG REQUEST                           #
# ---------------------------------------------------------------------------- #


def prepare_img2img_request(
    prompt,
    negative_prompt,
    sd_model,
    seed,
    image_base64_str,
    qr_weight,
    style_prompt,
    loras=None,
    style_modifier: int = 0,
):
    if len(prompt.split()) < SHORT_PROMPT_THRESHOLD:
        prompt = prompt + ", " + QUALITY_SUFFIX
    full_prompt = prompt + style_prompt

    side = 768
    gray = Image.new("RGB", (side, side), (128, 128, 128))
    _buf = BytesIO()
    gray.save(_buf, format="JPEG")
    gray_init_base64 = base64.b64encode(_buf.getvalue()).decode("ascii")

    req = dict(
        model_name=sd_model,
        input_image=gray_init_base64,
        prompt=full_prompt,
        negative_prompt="blurry, low contrast, washed out",
        sampler_name="DPM++ 2M Karras",
        width=side,
        height=side,
        steps=30,
        guidance_scale=7,
        seed=int(seed),
        image_num=1,
        strength=round(0.925 + (qr_weight + style_modifier) * 0.0125,2),
        loras=loras or [],
        controlnet_units=[
            # Brightness ControlNet — blends the QR's light/dark structure into
            # the art. The QR is fed directly: NO preprocessor.
            # strength = 0.4 (default) + (qr_weight + style_modifier) * 0.025; range 0.15..0.55 for combined -2..2
            Img2ImgV3ControlNetUnit(
                image_base64=image_base64_str,
                model_name="control_v1p_sd15_brightness",
                strength=round(0.4 + (qr_weight + style_modifier) * 0.025,2),
                preprocessor=None, # this needs to be None, otherwise API breaks
                guidance_start=0.15,
                guidance_end=0.6,
            ),
            # QR Code Monster v2 — enforces the scannable QR pattern.
            Img2ImgV3ControlNetUnit(
                image_base64=image_base64_str,
                model_name="control_v1p_sd15_qrcode_monster_v2",
                strength=round(1.40 + (qr_weight + style_modifier) * 0.05,2),
                preprocessor=None, # this needs to be None, otherwise API breaks
                guidance_start=round(0.4 - (qr_weight + style_modifier) * 0.025,2),
                guidance_end=round(0.925 + (qr_weight + style_modifier) * 0.0125,2),
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

    except Exception as e:
        print(f"Error creating watermarked base64: {str(e)}")
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
        query_type="txt2img",
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
    featured: Optional[bool] = None,
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

    # Featured
    if featured is not None:
        query["featured"] = featured

    return query

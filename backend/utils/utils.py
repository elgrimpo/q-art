# Libraries Import
import requests as requests
import datetime
import re
from datetime import datetime, timedelta
from typing import Optional
from novita_client import *


# App imports
from schemas.schemas import ImageDoc, ControlNet

# ---------------------------------------------------------------------------- #
#                                  PARSE SEED                                  #
# ---------------------------------------------------------------------------- #

def parse_seed(metadata):
    # Use regular expression to find the value associated with 'Seed'
    match = re.search(r'Seed: (\d+)', metadata)

    # Check if the 'Seed' key is found
    if match:
        seed_value = match.group(1)
        return int(seed_value)
    else:
        return None



# ---------------------------------------------------------------------------- #
#                            PREPARE TXT2IMG REQUEST                           #
# ---------------------------------------------------------------------------- #

def prepare_txt2img_request( image_quality, prompt, negative_prompt, sd_model, seed, image_base64_str, qr_weight ):

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
                weight=1.0 + float(qr_weight) * 0.2,
                guidance_start=0.4 - float(qr_weight) * 0.03,
                guidance_end=0.85 
            ),
        ],
    )

    return req

# ---------------------------------------------------------------------------- #
#                                  PREPARE IMAGE DOC                           #
# ---------------------------------------------------------------------------- #

def prepare_doc( req, info, website, image_quality, qr_weight, user_id):
    sampler_name = req.sampler_name
    control_mode_0 = req.controlnet_units[0].control_mode.value
    model_0 = req.controlnet_units[0].model
    module_0 = req.controlnet_units[0].module.value
    resize_mode_0 = req.controlnet_units[0].resize_mode.value

    control_mode_1 = req.controlnet_units[1].control_mode.value
    model_1 = req.controlnet_units[1].model
    module_1 = req.controlnet_units[1].module.value
    resize_mode_1 = req.controlnet_units[1].resize_mode.value

    doc = ImageDoc(
        user_id = user_id,
        created_at = datetime.utcnow(),
        prompt = req.prompt,
        negative_prompt = req.negative_prompt,
        content = website,
        sd_model = req.model_name,
        seed = info["seed"],
        image_quality = image_quality,
        qr_weight = qr_weight,
        width = req.width,
        height = req.height,
        query_type = "txt2img",
        steps = req.steps,
        cfg_scale = req.cfg_scale, 
        sampler_name = sampler_name,
        controlnet0 = ControlNet(
            control_mode = control_mode_0,
            model = model_0,
            module = module_0,
            weight = req.controlnet_units[0].weight,
            guidance_start = req.controlnet_units[0].guidance_start,
            guidance_end = req.controlnet_units[0].guidance_end,
            resize_mode = resize_mode_0,
        ),
        controlnet1 = ControlNet(
            control_mode = control_mode_1,
            model = model_1,
            module = module_1,
            weight = req.controlnet_units[0].weight,
            guidance_start = req.controlnet_units[0].guidance_start,
            guidance_end = req.controlnet_units[0].guidance_end,
            resize_mode = resize_mode_1,
            )
    )
    return doc

# ---------------------------------------------------------------------------- #
#                               CALCULATE CREDITS                              #
# ---------------------------------------------------------------------------- #

def calculate_credits(service):
    price = {
        'image_quality': {
            'none': 0,
            'low': 1,
            'medium': 2,
            'high': 3
        },
        'upscale_resize': {
            '0': 0,
            '2': 2,
        }
    }

    total_credits = 0

    # Calculate credits based on image quality
    image_quality = service.get('image_quality', 'none')
    total_credits += price['image_quality'].get(image_quality, 0)

    # Calculate credits based on upscale_resize
    upscale_resize = service.get('upscale_resize', "0")
    total_credits += price['upscale_resize'].get(upscale_resize, 0)

    return total_credits

# ---------------------------------------------------------------------------- #
#                              SUFFICIENT CREDITS                              #
# ---------------------------------------------------------------------------- #

def sufficient_credit(user, service):
    user_credits = user.get('credits', 0)
    total_credits = calculate_credits(service)

    return user_credits >= total_credits

# ---------------------------------------------------------------------------- #
#                          CREATE IMAGES FILTER QUERY                          #
# ---------------------------------------------------------------------------- #
    
def createImagesFilterQuery(
    likes: Optional[str] = None,
    time_period: Optional[str] = None,
    sd_model: Optional[str] = None,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None
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
    if sd_model:
        query["sd_model"] = sd_model

    # Likes
    if likes == "Liked by me":
        if user_id:
            query["likes"] = user_id

    return query

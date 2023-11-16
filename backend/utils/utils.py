# Libraries Import
import base64
from dotenv import load_dotenv
import requests as requests
import cv2
import datetime
import re
from datetime import datetime, timedelta
from typing import Optional

# App imports
from controllers.models_controller import get_model

def readImage(path):
    img = cv2.imread(path)
    retval, buffer = cv2.imencode(".jpg", img)
    b64img = base64.b64encode(buffer).decode("utf-8")
    return b64img

def parse_seed(metadata):
    # Use regular expression to find the value associated with 'Seed'
    match = re.search(r'Seed: (\d+)', metadata)

    # Check if the 'Seed' key is found
    if match:
        seed_value = match.group(1)
        return int(seed_value)
    else:
        return None

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

    doc = {
        "user_id": user_id,
        "created_at": datetime.datetime.utcnow(),
        "prompt": req.prompt,
        "negative_prompt": req.negative_prompt,
        "content": website,
        "presets": [""],
        "sd_model": req.model_name,
        "seed": info["seed"],
        "image_quality": image_quality,
        "qr_weight": qr_weight,
        "width": req.width,
        "height": req.height,
        "query_type": "txt2img",
        "steps": req.steps,
        "cfg_scale": req.cfg_scale, 
        "sampler_name": sampler_name,
        "controlnet0": {
            "control_mode": control_mode_0,
            "model": model_0,
            "module": module_0,
            "weight": req.controlnet_units[0].weight,
            "guidance_start": req.controlnet_units[0].guidance_start,
            "guidance_end": req.controlnet_units[0].guidance_end,
            "resize_mode": resize_mode_0,
        },
        "controlnet1": {
            "control_mode": control_mode_1,
            "model": model_1,
            "module": module_1,
            "weight": req.controlnet_units[0].weight,
            "guidance_start": req.controlnet_units[0].guidance_start,
            "guidance_end": req.controlnet_units[0].guidance_end,
            "resize_mode": resize_mode_1,
        },
    }
    return doc

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

def sufficient_credit(user, service):
    user_credits = user.get('credits', 0)
    total_credits = calculate_credits(service)

    return user_credits >= total_credits

    
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

    if sd_model:
        query["sd_model"] = sd_model

    return query

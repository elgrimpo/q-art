# Libraries Import
import base64
from dotenv import load_dotenv
import requests as requests
import cv2
import datetime


def readImage(path):
    img = cv2.imread(path)
    retval, buffer = cv2.imencode(".jpg", img)
    b64img = base64.b64encode(buffer).decode("utf-8")
    return b64img


def prepare_doc(image, req, info, website, image_quality, qr_weight, user_id):
    
    
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
        "image_str": image,
        "prompt": req.prompt,
        "negative_prompt": req.negative_prompt,
        "content": website,
        "presets": [""],
        "sd_model": req.model_name,
        "seed": info["seed"],
        "image_quality": image_quality,
        "qr_weight": qr_weight,
        "width": "512",
        "height": "512",
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
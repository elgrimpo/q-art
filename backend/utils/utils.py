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


def prepare_doc(image, payload, info, website, image_quality, qr_weight):
    # TODO: make user_id as part of input parameter
    doc = {
        "user_id": "64cacd9a2dd6a86ac819705b",
        "created_at": datetime.datetime.utcnow(),
        "image_str": image,
        "prompt": payload["prompt"],
        "negative_prompt": payload["negative_prompt"],
        "content": website,
        "presets": [""],
        "seed": info["seed"],
        "image_quality": image_quality,
        "qr_weight": qr_weight,
        "width": "512",
        "height": "512",
        "query_type": "txt2img",
        "steps": payload["steps"],
        "cfg_scale": payload["cfg_scale"], 
        "sampler_name": payload["sampler_name"],
        "controlnet0": {
            "control_mode": payload["alwayson_scripts"]["ControlNet"]["args"][0][
                "control_mode"
            ],
            "model": payload["alwayson_scripts"]["ControlNet"]["args"][0]["model"],
            "module": payload["alwayson_scripts"]["ControlNet"]["args"][0]["module"],
            "weight": payload["alwayson_scripts"]["ControlNet"]["args"][0]["weight"],
            "guidance_start": payload["alwayson_scripts"]["ControlNet"]["args"][0][
                "guidance_start"
            ],
            "guidance_end": payload["alwayson_scripts"]["ControlNet"]["args"][0][
                "guidance_end"
            ],
            "resize_mode": payload["alwayson_scripts"]["ControlNet"]["args"][0][
                "resize_mode"
            ],
        },
        "controlnet1": {
            "control_mode": payload["alwayson_scripts"]["ControlNet"]["args"][1][
                "control_mode"
            ],
            "model": payload["alwayson_scripts"]["ControlNet"]["args"][1]["model"],
            "module": payload["alwayson_scripts"]["ControlNet"]["args"][1]["module"],
            "weight": payload["alwayson_scripts"]["ControlNet"]["args"][1]["weight"],
            "guidance_start": payload["alwayson_scripts"]["ControlNet"]["args"][1][
                "guidance_start"
            ],
            "guidance_end": payload["alwayson_scripts"]["ControlNet"]["args"][1][
                "guidance_end"
            ],
            "resize_mode": payload["alwayson_scripts"]["ControlNet"]["args"][1][
                "resize_mode"
            ],
        },
    }
    return doc
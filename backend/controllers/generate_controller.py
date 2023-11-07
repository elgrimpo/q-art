# Libraries Import
import qrcode
from dotenv import load_dotenv
import os
import requests as requests
import json
import copy
from fastapi import FastAPI, HTTPException
import httpx
from omniinfer_client import *

# App imports
from utils.payload_config import payloadConfig, sample_payload_config
from controllers.images_controller import insert_image
from utils.utils import readImage, prepare_doc


load_dotenv()
webui_url = "http://127.0.0.1:7860"
omniinfer_url = "https://api.omniinfer.io/v2/txt2img"

client = OmniClient(os.environ["OMNIINFER_KEY"])


def predict(prompt, website, negative_prompt, seed, image_quality, qr_weight, user_id):

    # Load ControlNet models
    controlnet_model_0 = client.models().filter_by_type(ModelType.CONTROLNET).get_by_name("control_v1p_sd15_brightness.safetensors")
    if controlnet_model_0 is None:
        raise Exception("controlnet_0 model not found")

    controlnet_model_1 = client.models().filter_by_type(ModelType.CONTROLNET).get_by_name("control_v1p_sd15_qrcode_monster_v2")
    if controlnet_model_1 is None:
        raise Exception("controlnet_1 model not found")
    
    # Create QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4
    )
    qr.add_data(website)  

    qr_image = qr.make_image()
    qr_image.save("qrcode.png")
    image_base64_str = readImage("qrcode.png")
    
    # Image Quality -> Steps
    if image_quality == "low":
        steps = 10
    elif image_quality == "medium":
        steps = 20  
    elif image_quality == "high":
        steps = 30


    req = Txt2ImgRequest(
        prompt=prompt,
        negative_prompt = negative_prompt,
        sampler_name=Samplers.DPMPP_M_KARRAS,
        model_name='beautifulRealistic_v40_37543.safetensors',
        width=512,
        height=512,
        steps=steps,
        batch_size=1,
        cfg_scale=9,
        seed= int(seed),
        controlnet_units=[
            ControlnetUnit(
                input_image=image_base64_str,
                control_mode=ControlNetMode.BALANCED,
                model=controlnet_model_0.sd_name,
                module=ControlNetPreprocessor.INPAINT,
                resize_mode=ControlNetResizeMode.RESIZE_OR_CORP,
                weight=0.35,
                guidance_start = 0.0,
                guidance_end = 1.0
            )
            ,
            ControlnetUnit(
                input_image=image_base64_str,
                control_mode=ControlNetMode.BALANCED,
                model=controlnet_model_1.sd_name,
                module=ControlNetPreprocessor.INPAINT,
                resize_mode=ControlNetResizeMode.RESIZE_OR_CORP,
                weight=1.0 + float(qr_weight) * 0.1,
                guidance_start = 0.2 - float(qr_weight) * 0.05,
                guidance_end = 0.85 + float(qr_weight) * 0.05
            )
        ]
    )

    res = client.sync_txt2img(req)
    print(ProgressResponse.data)
    if res.data.status != ProgressResponseStatusCode.SUCCESSFUL:
        raise Exception('Failed to generate image with error: ' +
                        res.data.failed_reason)
    save_image(res.data.imgs_bytes[0], "qrcode-art.png")
    image = readImage("qrcode-art.png")
    # TODO: read info from response
    info = {
        "seed": -1
    }
    doc = prepare_doc(image, req, info, website, image_quality, qr_weight, user_id)
    print(doc)
    inserted_image = insert_image(doc, user_id, image_quality)
    return inserted_image







# def predict(prompt, website, negative_prompt, seed, image_quality, qr_weight, user_id):
#     # Prepare QR Code Image
#     qr = qrcode.QRCode(
#         version=1,
#         error_correction=qrcode.constants.ERROR_CORRECT_H,
#         box_size=10,
#         border=4
#     )
#     qr.add_data(website)  

#     qr_image = qr.make_image()
#     qr_image.save("qrcode.png")
#     image_base64_str = readImage("qrcode.png")
#     # Initial Payload
#     payload = copy.deepcopy(payloadConfig)
#     payload["prompt"] = prompt
#     payload["negative_prompt"] = negative_prompt
#     payload["seed"] = int(seed)
#     payload["alwayson_scripts"]["ControlNet"]["args"][0]["image"] = image_base64_str
#     payload["alwayson_scripts"]["ControlNet"]["args"][1]["image"] = image_base64_str
    
#     if image_quality == "low":
#         payload["steps"] = 10
#     elif image_quality == "medium":
#         payload["steps"] = 20  
#     elif image_quality == "high":
#         payload["steps"] = 30

#     # Translate qr_weight into guidance start, end and weight
#     qr_weight_fl = float(qr_weight)
#     payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_start"] -= qr_weight_fl * 0.05
#     payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_end"] += qr_weight_fl * 0.05
#     payload["alwayson_scripts"]["ControlNet"]["args"][1]["weight"] += qr_weight_fl * 0.1
    

#     # Initiate Request
#     response = requests.post(url=f"{webui_url}/sdapi/v1/txt2img", json=payload)
#     api_response = response.json()
#     info = json.loads(api_response["info"])
#     image = api_response["images"][1]

#     # Create database entry
    
#     doc = prepare_doc(image, payload, info, website, image_quality, qr_weight, user_id)

#     inserted_image = insert_image(doc, user_id, image_quality)
#     return inserted_image
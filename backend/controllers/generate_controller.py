# Libraries Import
import qrcode
from dotenv import load_dotenv
import requests as requests
import json
import copy

# App imports
from utils.payload_config import payloadConfig
from controllers.images_controller import insert_image
from utils.utils import readImage, prepare_doc


load_dotenv()
webui_url = "http://127.0.0.1:7860"

def predict(prompt, website, negative_prompt, seed, image_quality, qr_weight, user_id):
    # Prepare QR Code Image
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
    # Initial Payload
    payload = copy.deepcopy(payloadConfig)
    payload["prompt"] = prompt
    payload["negative_prompt"] = negative_prompt
    payload["seed"] = int(seed)
    payload["alwayson_scripts"]["ControlNet"]["args"][0]["image"] = image_base64_str
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["image"] = image_base64_str
    
    if image_quality == "low":
        payload["steps"] = 10
    elif image_quality == "medium":
        payload["steps"] = 20  
    elif image_quality == "high":
        payload["steps"] = 30

    # Translate qr_weight into guidance start, end and weight
    qr_weight_fl = float(qr_weight)
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_start"] -= qr_weight_fl * 0.05
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_end"] += qr_weight_fl * 0.05
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["weight"] += qr_weight_fl * 0.1
    

    # Initiate Request
    response = requests.post(url=f"{webui_url}/sdapi/v1/txt2img", json=payload)
    api_response = response.json()
    info = json.loads(api_response["info"])
    image = api_response["images"][0]

    # Create database entry
    
    doc = prepare_doc(image, payload, info, website, image_quality, qr_weight, user_id)

    inserted_image = insert_image(doc)
    return inserted_image
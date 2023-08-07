from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import base64
import qrcode
from dotenv import load_dotenv
import requests as requests
import cv2
from payload_config import payloadConfig
from pymongo import MongoClient
import datetime
import json
import os
from bson import ObjectId
import copy



load_dotenv()
mongo_url = os.environ["MONGO_URL"]
webui_url = "http://127.0.0.1:7860"


app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")


def readImage(path):
    img = cv2.imread(path)
    retval, buffer = cv2.imencode(".jpg", img)
    b64img = base64.b64encode(buffer).decode("utf-8")
    return b64img


@app.get("/generate")
async def predict(prompt, website, negative_prompt, seed, image_quality, qr_weight):
    # Initial Payload
    payload = copy.deepcopy(payloadConfig)
    payload["prompt"] = prompt
    payload["negative_prompt"] = negative_prompt
    payload["seed"] = int(seed)
    
    if image_quality == "low":
        payload["steps"] = 10
    elif image_quality == "medium":
        payload["steps"] = 20  
    elif image_quality == "high":
        payload["steps"] = 30

    
    qr_weight_fl = float(qr_weight)
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_start"] -= qr_weight_fl * 0.05
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_end"] += qr_weight_fl * 0.05
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["weight"] += qr_weight_fl * 0.1

    # print("inputs:")
    # print("Seed:")
    # print({payload["seed"]})
    # print("QR Weight:")
    # print(qr_weight)
    # print("Guidance Start:")
    # print(payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_start"])
    # print("Guidance End:")
    # print(payload["alwayson_scripts"]["ControlNet"]["args"][1]["guidance_end"])
    # print("weight:")
    # print(payload["alwayson_scripts"]["ControlNet"]["args"][1]["weight"])
    # print("Image quality:")
    # print(image_quality)


    # Prepare QR Code Image
    # Create QR code instance
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4
    )

    # Add website data
    qr.add_data(website)  

    # Generate image
    qr_image = qr.make_image()
    qr_image.save("qrcode.png")
    image_base64_str = readImage("qrcode.png")
    payload["alwayson_scripts"]["ControlNet"]["args"][0]["image"] = image_base64_str
    payload["alwayson_scripts"]["ControlNet"]["args"][1]["image"] = image_base64_str

    # Initiate Request
    response = requests.post(url=f"{webui_url}/sdapi/v1/txt2img", json=payload)
    api_response = response.json()
    info = json.loads(api_response["info"])
    image = api_response["images"][0]

    # Create database entry
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

    try:
        # Insert the initiative into MongoDB
        result = db["images"].insert_one(doc)

        # Fetch the inserted initiative using the _id
        inserted_image = db["images"].find_one({"_id": result.inserted_id})

        # Convert ObjectId to string
        inserted_image["_id"] = str(inserted_image["_id"])
        return inserted_image

    # Error handling
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get("/images/get")
async def get_images(page: int = Query(1, alias="page")):
    # TODO: make user_id input parameter
    user_id = "64cacd9a2dd6a86ac819705b"
    try:
        images_per_page = 12

        # Calculate the offset based on the current page
        offset = (page - 1) * images_per_page

        # Get images for the given user_id with pagination
        images = db["images"].find({"user_id": user_id}).sort("created_at", -1).skip(offset).limit(images_per_page)


        # Convert the images to a list
        images = list(images)

        # Convert ObjectIds to strings
        for image in images:
            image["_id"] = str(image["_id"])
        return images

    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

@app.delete("/images/delete/{id}")
async def delete_image(id: str):
    # Convert id to ObjectId
  object_id = ObjectId(id)

  # Delete image 
  result = db["images"].delete_one({"_id": object_id})

  if result.deleted_count == 0:
    raise HTTPException(status_code=404, detail=f"Image with id {id} not found")

  return {"deleted": True}
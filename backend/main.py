from fastapi import FastAPI, HTTPException
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
import bson
import os


load_dotenv()
mongo_url = os.environ['MONGO_URL']
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


class MyJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()  # Format dates as ISO strings
        elif isinstance(obj, bson.Binary) and obj.subtype == bson.binary.UUID_SUBTYPE:
            return obj.as_uuid()  # Format binary data as UUIDs
        elif hasattr(obj, "__str__"):
            return str(obj)  # This will handle ObjectIds

        return super(MyJsonEncoder, self).default(obj)


@app.get("/generate")
async def predict(prompt, website, negative_prompt=None):
    # Initial Payload
    payload = payloadConfig
    payload["prompt"] = prompt

    # Prepare QR Code Image
    qr_image = qrcode.make(website)
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
    doc = {
        "user_id": "64cacd9a2dd6a86ac819705b",
        "created_at": datetime.datetime.utcnow(),
        "image_str": image,
        "prompt": info["prompt"],
        "neg_prompt": "",
        "content": website,
        "presets": [""],
        "seed": info["seed"],
        "fidelity": "low",
        "width": "512",
        "height": "512",
        "query_type": "txt2img",
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


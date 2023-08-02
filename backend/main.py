from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import base64
import qrcode
from dotenv import load_dotenv
import requests as requests
import cv2
from payload_config import payloadConfig
import json

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

def readImage(path):
    img = cv2.imread(path)
    retval, buffer = cv2.imencode('.jpg', img)
    b64img = base64.b64encode(buffer).decode("utf-8")
    return b64img


@app.get("/generate")
async def predict(prompt, website, negative_prompt=None):

    # Initial Payload
    payload = payloadConfig
    payload['prompt'] = prompt

    # Prepare QR Code Image
    qr_image = qrcode.make(website)
    qr_image.save("qrcode.png")
    image_base64_str = readImage("qrcode.png")
    payload['alwayson_scripts']['ControlNet']['args'][0]['image'] = image_base64_str
    payload['alwayson_scripts']['ControlNet']['args'][1]['image'] = image_base64_str
    
    # Initiate Request
    response = requests.post(url=f"{webui_url}/sdapi/v1/txt2img", json=payload)
    api_response = response.json()
    print("API RESPONSE")
    info = json.loads(api_response['info'])
    image = api_response['images'][0]
    response = {"image": image, "info": info}

    # Send response to client
    return response
    

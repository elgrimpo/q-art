# Libraries Import
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import requests as requests
from dotenv import load_dotenv
from oauthlib.oauth2 import WebApplicationClient

import os

load_dotenv()

# App imports
from controllers.images_controller import get_images, delete_image
from controllers.generate_controller import predict

app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/generate")
async def generate_endpoint(
    prompt, website, negative_prompt, seed, image_quality, qr_weight
):
    return predict(prompt, website, negative_prompt, seed, image_quality, qr_weight)


@app.get("/images/get")
async def images_endpoint(page: int = Query(1, alias="page")):
    return get_images(page)


@app.delete("/images/delete/{id}")
async def delete_image_endpoint(id: str):
    return delete_image(id)
# Libraries Import
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests as requests
from dotenv import load_dotenv
from pymongo import DESCENDING, ASCENDING
import os
from typing import Optional
from pymongo import MongoClient
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

# App imports
from controllers.images_controller import get_images, delete_image
from controllers.generate_controller import predict, upscale
from controllers.models_controller import get_models
from controllers.auth_controller import google_login, google_auth, google_logout
from controllers.users_controller import get_user_info

# ---------------------------------------------------------------------------- #
#                                INITIALIZE APP                                #
# ---------------------------------------------------------------------------- #
load_dotenv()

app = FastAPI()

# Session middleware
app.add_middleware(
    SessionMiddleware,
    # TODO: generate secret key and store in .env
    secret_key="some-random-string",
)

# CORS middleware
origins = ["http://192.168.1.116.nip.io:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------- #
#                                  API ROUTES                                  #
# ---------------------------------------------------------------------------- #


# ------------------------------ GENERATE ROUTES ----------------------------- #

# GENERATE IMAGE
@app.get("/generate")
async def generate_endpoint(
    prompt,
    website,
    negative_prompt,
    seed,
    image_quality,
    qr_weight,
    sd_model,
    user_id,
    request: Request,
):
    return await predict(
        prompt,
        website,
        negative_prompt,
        seed,
        image_quality,
        qr_weight,
        sd_model,
        user_id,
        request,
    )

# UPSCALE IMAGE
@app.get("/upscale/{image_id}")
async def upscale_endpoint(
    image_id,
    user_id,
    request: Request,
):
    return await upscale(
        image_id,
        user_id,
        request,
    )


# ------------------------------- IMAGE ROUTES ------------------------------- #

# GET IMAGES
@app.get("/images/get")
async def images_endpoint(
    page: int = 1,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    likes: Optional[str] = None,
    time_period: Optional[str] = None,
    sd_model: Optional[str] = None,
    images_per_page: int = 12,
    sort_by: str = "created_at",
    sort_direction: int = DESCENDING
):
    print(likes)

    return get_images(
        page, user_id, exclude_user_id, likes, time_period, sd_model, images_per_page, sort_by, sort_direction
    )

# DELETE IMAGE
@app.delete("/images/delete/{id}")
async def delete_image_endpoint(id: str):
    return delete_image(id)

# ------------------------------- MODELS ROUTES ------------------------------ #

# GET MODEL
@app.get("/models/get")
async def get_models_endpoint():
    return get_models()


# -------------------------------- AUTH ROUTES ------------------------------- #

# GOOGLE LOGIN
@app.get("/login/google")
async def google_login_endpoint(request: Request):
    return await google_login(request)

# GOOGLE AUTH
@app.get("/auth/google")
async def google_auth_endpoint(request: Request):
    return await google_auth(request)

# LOGOUT
@app.get("/logout")
async def logout_endpoint(request: Request):
    return google_logout(request)

# -------------------------------- USER ROUTES ------------------------------- #


# GET USER INFO
@app.get("/user/info")
async def get_user_info_endpoint(request: Request):
    return await get_user_info(request)


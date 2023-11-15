# Libraries Import
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests as requests
from dotenv import load_dotenv

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

load_dotenv()

app = FastAPI()
app.add_middleware(
    SessionMiddleware,
    # TODO: generate secret key and store in .env
    secret_key="some-random-string",
)

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- ROUTES ---------- #


# Generate Routes
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


# Images Routes
@app.get("/images/get")
async def images_endpoint(
    page: int = 1,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    images_per_page: int = 12,
):
    return get_images(
        page, user_id, exclude_user_id, sort_by, sort_order, images_per_page
    )


@app.delete("/images/delete/{id}")
async def delete_image_endpoint(id: str):
    return delete_image(id)


@app.get("/models/get")
async def get_models_endpoint():
    return get_models()


# Auth Routes
@app.get("/login/google")
async def google_login_endpoint(request: Request):
    return await google_login(request)


@app.get("/auth/google")
async def google_auth_endpoint(request: Request):
    return await google_auth(request)


@app.get("/logout")
async def logout_endpoint(request: Request):
    return google_logout(request)


# User Routes
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")


@app.get("/user/info")
async def get_user_info(request: Request):
    user_info = request.session.get("user_info", None)
    print(user_info)
    if user_info is None:
        return {"message": "User information not found in session"}
    return user_info

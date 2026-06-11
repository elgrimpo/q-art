# Libraries Import
from fastapi import FastAPI, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
import requests as requests
from dotenv import load_dotenv
from pymongo import DESCENDING, ASCENDING
from typing import Annotated, Optional
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import os

# App imports
from api.controllers.images_controller import get_images, get_image, toggle_like, delete_image
from api.controllers.generate_controller import predict, upscale
from api.controllers.users_controller import get_user_info, authenticate_user
from api.controllers.payment_controller import create_checkout_session, stripe_webhook
from api.schemas.schemas import User, UserAuth
from api.utils.auth import get_current_user, require_service_token


def _get_real_ip(request: Request) -> str:
    # Heroku (and most proxies) forward the real client IP in X-Forwarded-For.
    # Take the leftmost entry (the originating client).
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_get_real_ip)

# ---------------------------------------------------------------------------- #
#                                INITIALIZE APP                                #
# ---------------------------------------------------------------------------- #
load_dotenv()

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET_KEY"],
)

# CORS middleware
origins = ["http://192.168.1.116", "https://checkout.stripe.com", "http://localhost:3000", "http://192.168.1.116.nip.io:3000", "https://dev.qr-ai.co", "https://www.qr-ai.co"]
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

# -------------------------------- USER ROUTES ------------------------------- #

# GET USER INFO
@app.get("/api/user/info")
async def get_user_info_endpoint(current_user: dict = Depends(get_current_user)):
    return await get_user_info(current_user["email"])

# AUTHENTICATE USER (sign-in bootstrap; service-token protected)
@app.post("/api/user/auth")
async def authenticate_user_endpoint(user_auth: UserAuth, _: None = Depends(require_service_token)):
    return await authenticate_user(user_auth)

# ------------------------------ GENERATE ROUTES ----------------------------- #

# GENERATE IMAGE
@app.get("/api/generate")
@limiter.limit("20/hour")
async def generate_endpoint(
    request: Request,
    website: Annotated[str, Query(min_length=1, max_length=2048)],
    sd_model: Annotated[str, Query(min_length=1, max_length=200)],
    prompt: Annotated[str, Query(max_length=500)] = "",
    negative_prompt: Annotated[str, Query(max_length=500)] = "",
    style_prompt: Annotated[str, Query(max_length=1000)] = "",
    style_title: Annotated[str, Query(max_length=100)] = "",
    seed: Annotated[int, Query(ge=-1)] = -1,
    qr_weight: Annotated[float, Query(ge=0.0, le=1.0)] = 0.5,
    current_user: dict = Depends(get_current_user),
):
    return await predict(
        prompt,
        website,
        negative_prompt,
        seed,
        qr_weight,
        sd_model,
        current_user["user_id"],
        style_prompt,
        style_title
    )

# UPSCALE IMAGE
@app.get("/api/upscale/{image_id}")
async def upscale_endpoint(
    image_id,
    resolution,
    current_user: dict = Depends(get_current_user),
):
    return await upscale(
        image_id,
        current_user["user_id"],
        resolution
    )

# ------------------------------- IMAGE ROUTES ------------------------------- #

# GET IMAGES
@app.get("/api/images/get")
async def images_endpoint(
    page: int = 1,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    likes: Optional[str] = None,
    time_period: Optional[str] = None,
    image_style: Optional[str] = None,
    images_per_page: int = 12,
    sort_by: str = "Newest",
):
    return await get_images(
        page, user_id, exclude_user_id, likes, time_period, image_style, images_per_page, sort_by
    )

# GET IMAGE BY ID
@app.get("/api/images/get/{id}")
async def image_endpoint(id: str):
    return await get_image(id)

# LIKE IMAGE
@app.put("/api/images/like/{id}")
async def toggle_like_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    return await toggle_like(id, current_user["user_id"])

# DELETE IMAGE
@app.delete("/api/images/delete/{id}")
async def delete_image_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    return await delete_image(id, current_user["user_id"])

# ------------------------------ PAYMENTS ROUTES ----------------------------- #

@app.post('/api/checkout')
async def create_checkout_session_endpoint(
    stripeId: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return create_checkout_session(stripeId, current_user["user_id"])

@app.post("/api/stripe-webhook")
async def stripe_webhook_endpoint(request: Request, stripe_signature: str = Header(None)):
    return await stripe_webhook(request, stripe_signature)

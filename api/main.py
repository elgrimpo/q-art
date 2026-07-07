# Libraries Import
from fastapi import FastAPI, Header, Depends, Query, HTTPException
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
import asyncio
import logging
import os
import uuid

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

# App imports
from api.controllers.images_controller import get_images, get_image, toggle_like, delete_image, toggle_featured, toggle_hero
from api.controllers.generate_controller import seed_job, start_generation, get_job, sweep_old_jobs
from api.controllers.styles_controller import get_style
from api.controllers.users_controller import get_user_info, authenticate_user
from api.controllers.login_code_controller import request_login_code, verify_login_code
from api.controllers.payment_controller import create_unlock_checkout_session, stripe_webhook
from api.controllers.unlock_controller import unlock_image
from api.controllers.admin_controller import admin_download_image, admin_get_image_info
from api.schemas.schemas import User, UserAuth, LoginCodeRequest, LoginCodeVerify
from api.utils.auth import get_current_user, require_service_token, require_admin
from novita_client import Img2V3ImgLoRA


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
    user = await get_user_info(current_user["email"])
    user_dict = user.dict(by_alias=True) if hasattr(user, "dict") else user
    user_dict["is_admin"] = current_user["is_admin"]
    return user_dict

# AUTHENTICATE USER (sign-in bootstrap; service-token protected)
@app.post("/api/user/auth")
async def authenticate_user_endpoint(user_auth: UserAuth, _: None = Depends(require_service_token)):
    return await authenticate_user(user_auth)

# REQUEST EMAIL LOGIN CODE (service-token protected)
@app.post("/api/user/request-code")
async def request_code_endpoint(body: LoginCodeRequest, _: None = Depends(require_service_token)):
    return await request_login_code(body.email)

# VERIFY EMAIL LOGIN CODE (service-token protected)
@app.post("/api/user/verify-code")
async def verify_code_endpoint(body: LoginCodeVerify, _: None = Depends(require_service_token)):
    return await verify_login_code(body.email, body.code)

# ------------------------------ GENERATE ROUTES ----------------------------- #

# START GENERATION (returns immediately; runs predict() in the background)
@app.post("/api/generate/start")
@limiter.limit("20/hour")
async def generate_start_endpoint(
    request: Request,
    website: Annotated[str, Query(min_length=1, max_length=2048)],
    style_id: Annotated[str, Query(min_length=1, max_length=64)],
    prompt: Annotated[str, Query(max_length=500)] = "",
    negative_prompt: Annotated[str, Query(max_length=500)] = "",
    seed: Annotated[int, Query(ge=-1)] = -1,
    qr_weight: Annotated[int, Query(ge=-2, le=2)] = 0,
    current_user: dict = Depends(get_current_user),
):
    sweep_old_jobs()
    style = await get_style(style_id)
    loras = [Img2V3ImgLoRA(model_name=l.model_name, strength=l.strength) for l in style.loras]
    job_id = str(uuid.uuid4())
    seed_job(job_id, current_user["user_id"])
    asyncio.create_task(start_generation(
        job_id, prompt, website, negative_prompt, seed, style.sd_model,
        current_user["user_id"], style.id, style.title, style.prompt, loras,
        qr_weight, style.style_modifier,
    ))
    return {"job_id": job_id}


# GENERATION PROGRESS
@app.get("/api/generate/progress/{job_id}")
@limiter.limit("120/minute")
async def generate_progress_endpoint(
    request: Request,
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your job")

    response = {
        "status": job["status"],
        "percent": job["percent"],
        "stage": job["stage"],
        "eta": job["eta"],
    }
    if job["status"] == "succeeded":
        response["result"] = job["result"]
    elif job["status"] == "failed":
        response["error"] = job["error"]
    return response

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
    featured: Optional[bool] = None,
):
    return await get_images(
        page, user_id, exclude_user_id, likes, time_period, image_style, images_per_page, sort_by,
        featured=featured,
    )

# GET IMAGE BY ID
@app.get("/api/images/get/{id}")
async def image_endpoint(id: str):
    return await get_image(id)

# LIKE IMAGE
@app.put("/api/images/like/{id}")
async def toggle_like_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    return await toggle_like(id, current_user["user_id"])

# BOOKMARK / FEATURE IMAGE (admin only)
@app.put("/api/images/bookmark/{id}")
async def toggle_featured_endpoint(id: str, _: dict = Depends(require_admin)):
    return await toggle_featured(id)

# HERO IMAGE (admin only) — requires the image to already be featured
@app.put("/api/images/hero/{id}")
async def toggle_hero_endpoint(id: str, _: dict = Depends(require_admin)):
    return await toggle_hero(id)

# DELETE IMAGE
@app.delete("/api/images/delete/{id}")
async def delete_image_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    return await delete_image(id, current_user["user_id"], is_admin=current_user["is_admin"])

# ------------------------------ PAYMENTS ROUTES ----------------------------- #

@app.post('/api/checkout/unlock')
async def create_unlock_checkout_endpoint(
    image_id: str,
    current_user: dict = Depends(get_current_user),
):
    return create_unlock_checkout_session(image_id, current_user["user_id"])

@app.post('/api/unlock/{image_id}')
async def unlock_endpoint(
    image_id: str,
    stripe_session_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return await unlock_image(image_id, stripe_session_id, current_user["user_id"])

@app.post("/api/stripe-webhook")
async def stripe_webhook_endpoint(request: Request, stripe_signature: str = Header(None)):
    return await stripe_webhook(request, stripe_signature)

# ADMIN DOWNLOAD (full-res, no unlock required, no mutation of the target doc)
@app.get("/api/admin/download/{image_id}")
async def admin_download_endpoint(image_id: str, _: dict = Depends(require_admin)):
    return await admin_download_image(image_id)

# ADMIN IMAGE INFO (full MongoDB doc, admin only)
@app.get("/api/admin/image/{image_id}/info")
async def admin_image_info_endpoint(image_id: str, _: dict = Depends(require_admin)):
    return await admin_get_image_info(image_id)

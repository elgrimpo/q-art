# Libraries Import
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests as requests
from dotenv import load_dotenv

import os

from pymongo import MongoClient
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.exceptions import HTTPException as StarletteHTTPException
import sys


# App imports
from controllers.images_controller import get_images, delete_image
from controllers.generate_controller import predict

load_dotenv()

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="some-random-string")

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


# --------------- AUTH ------------------------
# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")


# Authlib

config = Config(".env")
oauth = OAuth(config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    client_kwargs={"scope": "openid profile email"},
)


# FastAPI route for Google OAuth2 login
@app.get("/login/google")
async def login(request: Request):
    try:
        print("login route invoked")
        google = oauth.create_client("google")
        redirect_uri = request.url_for("google_auth")
        print(redirect_uri)
        return await google.authorize_redirect(request, redirect_uri, prompt="select_account")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/google")
async def google_auth(request: Request):
    print("auth route invoked")
    token = await oauth.google.authorize_access_token(request)

    google_user = {
        "google_id": token["userinfo"]["sub"],
        "name": token["userinfo"]["name"],
        "picture": token["userinfo"]["picture"],
        "email": token["userinfo"]["email"]
    }

    #check if user exists in db
    existing_user = users.find_one({"google_id": google_user["google_id"]})
    print("existing_user")
    print(existing_user)

    if existing_user:
        # Update the existing user
        users.update_one({"google_id": google_user["google_id"]}, {"$set": google_user})
    else:
        # Create a new user entry
        users.insert_one(google_user)
    
    # Get user info from DB
    loggedInUser = users.find_one({"google_id": google_user["google_id"]})
    loggedInUser["_id"] = str(loggedInUser["_id"])
    # Store user information in the session
    request.session["user_info"] = loggedInUser

    frontend_redirect_uri = "http://localhost:3000"
    return RedirectResponse(url=frontend_redirect_uri)

@app.get('/logout')
async def logout(request: Request):
    request.session.pop('user_info', None)
    message='user logged out successfully'
    return message


@app.get("/user/info")
async def get_user_info(request: Request):
    user_info = request.session.get("user_info", None)
    print(user_info)
    if user_info is None:
        return {"message": "User information not found in session"}
    return user_info

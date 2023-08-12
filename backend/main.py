# Libraries Import
from fastapi import FastAPI, status, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests as requests
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer
import os
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from fastapi.responses import RedirectResponse
import urllib
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from fastapi.exceptions import RequestValidationError
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
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs
="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")


# Google credentials
client_id = os.environ["GOOGLE_CLIENT_ID"]
client_secret = os.environ["GOOGLE_CLIENT_SECRET"]


# # OAuth2 setup
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Authlib

config = Config('.env')
oauth = OAuth(config)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_id=client_id,
    client_secret=client_secret,
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    client_kwargs={
        'scope': 'openid profile email'}
)

# FastAPI route for Google OAuth2 login
@app.get('/login/google')
async def login(request: Request):
    try:
        print("login route invoked")
        google=oauth.create_client('google')
        redirect_uri = request.url_for('google_auth')
        print(redirect_uri)
        return await google.authorize_redirect(request, redirect_uri)
    
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/google/auth')
async def google_auth(request: Request):
    print("auth route invoked")
    token = await oauth.google.authorize_access_token(request)
    # <=0.15
    # user = await oauth.google.parse_id_token(request, token)
    user = token['userinfo']
    print(user)
    frontend_redirect_uri = "http://localhost:3000"  # Your frontend URL
    return RedirectResponse(url=frontend_redirect_uri)






# @app.get("/login")
# async def google_login():
#     print("login invoked")
#     # Redirect users to Google OAuth2 login page
#     redirect_uri = "http://localhost:8000/callback"
#     return {"redirect_uri": f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=openid%20profile%20email"}

# # FastAPI route for handling Google OAuth2 callback
# @app.get("/callback")
# async def google_callback(code: str):
#     print("callback function invoked")
#     # Exchange authorization code for an access token
#     access_token_url = "https://oauth2.googleapis.com/token"
#     payload = {
#         "code": code,
#         "client_id": client_id,
#         "client_secret": client_secret,
#         "redirect_uri": "http://localhost:8000/callback",
#         "grant_type": "authorization_code",
#     }
#     response = requests.post(access_token_url, data=payload)
#     access_token = response.json().get("access_token")

#     # Fetch user info using the access token
#     userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
#     headers = {"Authorization": f"Bearer {access_token}"}
#     userinfo_response = requests.get(userinfo_url, headers=headers)
#     userinfo = userinfo_response.json()
#     print(userinfo)

#     # Store user info in MongoDB
#     user_id = userinfo["sub"]
#     existing_user = users.find_one({"google_id": user_id})
#     print("existing_user")
#     print(existing_user)

#     if existing_user:
#         # Update the existing user
#         users.update_one(
#             {"google_id": user_id}, {"$set": userinfo}
#         )
#     else:
#         # Create a new user entry
#         userinfo["google_id"] = user_id
#         users.insert_one(userinfo)
#     user_data = {"user_id": user_id}
#     return user_data

# @app.get("/success")
# async def success():
#     redirect_uri = "http://localhost:3000"
#     return {"redirect_uri": redirect_uri}

# # FastAPI route for retrieving user info from MongoDB
# @app.get("/user")
# async def get_user_info(token: str = Depends(oauth2_scheme)):
#     user_id = extract_user_id_from_token(token)
#     user_info = users.find_one({"_id": user_id})
#     return user_info

# # FastAPI route for logging out
# @app.get("/logout")
# async def google_logout():
#     # You can implement your own logout logic here
#     return {"message": "Logged out successfully"}

# def extract_user_id_from_token(token: str):
#     # Implement the logic to extract and validate user ID from the token
#     # This might involve JWT decoding or other methods depending on your setup
#     # Return the user ID extracted from the token
#     pass
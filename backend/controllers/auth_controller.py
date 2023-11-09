# Libraries Import
from fastapi import HTTPException
import requests as requests
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.exceptions import HTTPException

load_dotenv()

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")

#Authlib
config = Config(".env")
oauth = OAuth(config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    client_kwargs={"scope": "openid profile email"},
)

def google_login(request):
    try:
        google = oauth.create_client("google")
        redirect_uri = request.url_for("google_auth_endpoint")
        return google.authorize_redirect(request, redirect_uri, prompt="select_account")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    
async def google_auth(request):
    token = await oauth.google.authorize_access_token(request)

    google_user = {
        "google_id": token["userinfo"]["sub"],
        "name": token["userinfo"]["name"],
        "picture": token["userinfo"]["picture"],
        "email": token["userinfo"]["email"]
    }

    #check if user exists in db
    existing_user = users.find_one({"google_id": google_user["google_id"]})

    if existing_user:
        # Update the existing user
        users.update_one({"google_id": google_user["google_id"]}, {"$set": google_user})
    else:
        # Create a new user entry
        users.insert_one(google_user)
    
    # Get user info from DB
    loggedInUser = users.find_one({"google_id": google_user["google_id"]})
    loggedInUser["_id"] = str(loggedInUser["_id"])
    if "last_image_created_at" in loggedInUser:
        loggedInUser["last_image_created_at"] = loggedInUser["last_image_created_at"].strftime('%Y-%m-%dT%H:%M:%S.%f+00:00')

    # Store user information in the session
    request.session["user_info"] = loggedInUser

    frontend_redirect_uri = "http://localhost:3000"
    return RedirectResponse(url=frontend_redirect_uri)
    return ""

def google_logout(request):
    request.session.pop('user_info', None)
    message='user logged out successfully'
    return message
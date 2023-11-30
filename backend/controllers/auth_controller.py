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

# App imports
from controllers.users_controller import User

load_dotenv()

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MONGODB CLIENT
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")

# OAUTH
config = Config(".env")
oauth = OAuth(config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    client_kwargs={"scope": "openid profile email"},
)

# ---------------------------------------------------------------------------- #
#                                 GOOGLE LOGIN                                 #
# ---------------------------------------------------------------------------- #


def google_login(request):
    try:
        google = oauth.create_client("google")
        redirect_uri = request.url_for("google_auth_endpoint")
        return google.authorize_redirect(request, redirect_uri, prompt="select_account")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------- #
#                                  GOOGLE AUTH                                 #
# ---------------------------------------------------------------------------- #


async def google_auth(request):
    try:
        # ------------------------------- AUTHENTICATE ------------------------------- #
        try:
            token = await oauth.google.authorize_access_token(request)

            google_user = {
                "google_id": token["userinfo"]["sub"],
                "name": token["userinfo"]["name"],
                "picture": token["userinfo"]["picture"],
                "email": token["userinfo"]["email"],
            }

        except Exception as e:
            # Handle authentication error
            raise HTTPException(status_code=401, detail=e)
        # ----------------------------- UPDATE USER INFO ----------------------------- #
        try:
            existing_user = users.find_one({"google_id": google_user['google_id']})
            if existing_user:
                users.update_one({"google_id": google_user['google_id']}, {"$set": google_user})
            else:
                users.insert_one(User(**google_user).dict())
        except Exception:
            # Handle database operation error
            raise HTTPException(status_code=500, detail="Database operation failed")

        # ----------------------------- CREATE USER SESSION ----------------------------- #
        try:
            logged_in_user = users.find_one({"google_id": google_user['google_id']})
            if logged_in_user:
                user_info = {
                    "_id": str(logged_in_user["_id"]),
                    "is_authenticated": True,
                }

                request.session["user_info"] = user_info
            else:
                raise HTTPException(status_code=404, detail="User not found")
            
        except Exception:
            # Handle session creation error
            raise HTTPException(status_code=500, detail="Session creation failed")

        # Redirect to frontend
        frontend_redirect_uri = os.environ["FRONTEND_URL"]
        return RedirectResponse(url=frontend_redirect_uri)

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception:
        # Log unexpected errors and return a generic error message
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ---------------------------------------------------------------------------- #
#                                    LOGOUT                                    #
# ---------------------------------------------------------------------------- #

def google_logout(request):
    request.session.pop("user_info", None)
    message = "user logged out successfully"
    return message

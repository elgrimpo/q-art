# Libraries Import
import requests as requests
from dotenv import load_dotenv
from fastapi import HTTPException
from bson import ObjectId
import datetime
from starlette.exceptions import HTTPException
import os
from pymongo import MongoClient, ReturnDocument

# ---------------------------- INITIALIAZE CLIENT ---------------------------- #
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")

# ---------------------------------------------------------------------------- #
#                                 GET USER INFO                                #
# ---------------------------------------------------------------------------- #


async def get_user_info(request):
    user_info = request.session.get("user_info", None)

    if user_info is None:
        return {"message": "User information not found in session"}
    return user_info


# ---------------------------------------------------------------------------- #
#                             INCREMENT USER COUNT                             #
# ---------------------------------------------------------------------------- #


async def increment_user_count(user_id, service_config, credits_deducted, request):
    try:
        # Increment user count for generated images
        current_year = datetime.datetime.utcnow().year
        current_month = datetime.datetime.utcnow().month

        # Increment user count for credits
        image_quality = service_config.get("image_quality")
        upscale_resize = service_config.get("upscale_resize")

        # ---------------------- UPDATE IMAGE QUALITY INCREMENT ---------------------- #
        if image_quality:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        f"image_counts.{current_year}.{current_month}.{image_quality}": 1,
                    },
                    "$set": {"last_image_created_at": datetime.datetime.utcnow()},
                },
                upsert=True,
            )

        # ------------------------- UPDATE UPSCALE INCREMENT ------------------------- #

        if upscale_resize:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        f"image_counts.{current_year}.{current_month}.upscale": 1,
                    }
                },
                upsert=True,
            )

        # ------------------------------ UPDATE CREDITS ------------------------------ #

        updated_user_info = db["users"].find_one_and_update(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {
                    "credits": -credits_deducted,
                },
            },
            return_document=True,
        )

        # ---------------------------- UPDATE USER SESSION --------------------------- #

        # Convert ObjectId to String
        updated_user_info["_id"] = str(updated_user_info["_id"])

        # Convert Datetime to String
        if "last_image_created_at" in updated_user_info:
            updated_user_info["last_image_created_at"] = updated_user_info[
                "last_image_created_at"
            ].strftime("%Y-%m-%dT%H:%M:%S.%f+00:00")

        # Update user session
        request.session["user_info"] = updated_user_info

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

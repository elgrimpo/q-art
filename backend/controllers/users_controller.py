# Libraries Import
import requests as requests
from dotenv import load_dotenv
from fastapi import HTTPException
from bson import ObjectId
import datetime
from starlette.exceptions import HTTPException
import os
from pymongo import MongoClient
from controllers.auth_controller import refresh_token


mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")

def increment_user_count(user_id, service_config, credits_deducted, request):
    try:
        # Increment user count for generated images
        current_year = datetime.datetime.utcnow().year
        current_month = datetime.datetime.utcnow().month

        image_quality = service_config.get('image_quality')
        upscale_count = service_config.get('upscale_resize', {}).get('upscaling_resize', 0)

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

        if upscale_count:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        "upscale_count": upscale_count,
                    },
                    "$set": {"last_image_created_at": datetime.datetime.utcnow()},
                },
                upsert=True,
            )

        # Deduct the credits from the user's balance
        updated_user_info = db["users"].find_one_and_update(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {
                    "credits": -credits_deducted,
                },
            },
            return_document=True
        )

        print("New credit count:")
        print(updated_user_info.get("credits"))

        refresh_token(request)

    except Exception as e:
        print(f"Error during user count increment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# Libraries Import
import requests as requests
from dotenv import load_dotenv
from fastapi import HTTPException
from bson import ObjectId
import datetime
from starlette.exceptions import HTTPException
import os
from pymongo import MongoClient, ReturnDocument


mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")


async def increment_user_count(user_id, service_config, credits_deducted, request):
    try:
        # Increment user count for generated images
        current_year = datetime.datetime.utcnow().year
        current_month = datetime.datetime.utcnow().month

        image_quality = service_config.get("image_quality")
        upscale_resize = service_config.get('upscale_resize')

        # print("8a checking image quality")
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
            # print("8b user count updated for image quality")
        
        # print("8a checking upscaling")
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
            # print("9b user count updated for upscaling")

        # Deduct the credits from the user's balance
        # print("10 getting user info")
        updated_user_info = db["users"].find_one_and_update(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {
                    "credits": -credits_deducted,
                },
            },
            return_document=True,
        )
        # print("11. User retrieved with info:")
        

        updated_user_info["_id"] = str(updated_user_info["_id"])
        if "last_image_created_at" in updated_user_info:
            updated_user_info["last_image_created_at"] = updated_user_info[
                "last_image_created_at"
            ].strftime("%Y-%m-%dT%H:%M:%S.%f+00:00")

        # print(updated_user_info)
        # print("12. updating user info in session")

        request.session["user_info"] = user_id
        # print("13. session updated with session details:")
        # print(request.session["user_info"])

    except Exception as e:
        # print(f"Error during user count increment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
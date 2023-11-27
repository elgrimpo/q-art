# Libraries Import
import requests as requests
from dotenv import load_dotenv
from fastapi import HTTPException
from bson import ObjectId
import datetime
from starlette.exceptions import HTTPException
import os
from pymongo import MongoClient, ReturnDocument
import json


# ---------------------------- INITIALIAZE CLIENT ---------------------------- #
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")

# ---------------------------------------------------------------------------- #
#                                 GET USER INFO                                #
# ---------------------------------------------------------------------------- #


async def get_user_info(request):
    user_info = request.session.get("user_info")
    
    if not user_info:
        return {"message": "User information not found in session"}
    
    try:
        logged_in_user = users.find_one({"_id": ObjectId(user_info.get("_id"))})
        
        if logged_in_user:
            serialized_user = json.dumps(logged_in_user, indent=4, sort_keys=True, default=str)
            return serialized_user
        else:
            return {"message": "User not found in the database"}
    
    except Exception as e:
        # Handle specific exceptions such as database connection issues, etc.
        return {"message": f"Error retrieving user information: {str(e)}"}


# ---------------------------------------------------------------------------- #
#                             INCREMENT USER COUNT                             #
# ---------------------------------------------------------------------------- #


async def increment_user_count(user_id, service_config, credits_deducted):
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

        db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {
                    "credits": -credits_deducted,
                },
            },
            upsert=True,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------- #
#                               Add User Payment                               #
# ---------------------------------------------------------------------------- #

def add_user_payment(user_id, transaction_amount, product_id, credit_amount, payment_intent, timestamp):

    # Create a new payment history object
    payment_history_obj = {
        "date_time": timestamp,
        "transaction_amount": int(transaction_amount),
        "product_id": product_id,
        "credit_amount": int(credit_amount),
        "payment_intent_id": payment_intent
    }

    try:
        # Find and update the user document
        db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$push": {"payment_history": payment_history_obj},
                "$inc": {"credits": int(credit_amount)}
            },
            upsert=True  # Return the modified document
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


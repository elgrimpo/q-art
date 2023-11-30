# Libraries Import
import requests as requests
from fastapi import HTTPException
from bson import ObjectId
import datetime
from starlette.exceptions import HTTPException
import os
from pymongo import MongoClient
from datetime import datetime


# App imports 
from schemas.schemas import PaymentHistory, User

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
            user_instance = User(**logged_in_user)
            return user_instance
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
        current_year = datetime.utcnow().year
        current_month = datetime.utcnow().month

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
                    "$set": {"last_image_created_at": datetime.utcnow()},
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
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------- #
#                               Add User Payment                               #
# ---------------------------------------------------------------------------- #

def add_user_payment(user_id, transaction_amount, product_id, credit_amount, payment_intent, timestamp):

    # Create a new payment history object
    payment_history_instance = PaymentHistory(
        date_time = datetime(timestamp),
        transaction_amount = int(transaction_amount),
        product_id = product_id,
        credit_amount = int(credit_amount),
        payment_intent_id = payment_intent
    )

    try:
        # Find and update the user document
        db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$push": {"payment_history": payment_history_instance},
                "$inc": {"credits": int(credit_amount)}
            },
            upsert=True  # Return the modified document
        )
    
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


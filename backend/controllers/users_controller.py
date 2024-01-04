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

        # Get values from service_config
        upscale_resize = service_config.get("upscale_resize")
        download = service_config.get("download")

        # ------------------------ INCREMENT IMAGE GENERATIOM ------------------------ #
        generate = service_config.get("generate")
        if generate:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        f"image_counts.{current_year}.{current_month}.generate": 1,
                    },
                    "$set": {"last_image_created_at": datetime.utcnow()},
                },
                upsert=True,
            )

        # ----------------------------- INCREMENT UPSCALE ---------------------------- #
        if upscale_resize and upscale_resize != 0:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        f"image_counts.{current_year}.{current_month}.upscale": 1,
                    }
                },
                upsert=True,
            )

        # ---------------------------- INCREMENT DOWNLOAD ---------------------------- #
        if download:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        f"image_counts.{current_year}.{current_month}.download": 1,
                    }
                },
                upsert=True,
            )

        # ---------------------------- UPDATE USER CREDITS --------------------------- #
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
    date_time=timestamp,
    transaction_amount=int(transaction_amount),
    product_id=product_id,
    credit_amount=int(credit_amount),
    payment_intent_id=payment_intent
    )

    try:
        # Find and update the user document
        db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$push": {"payment_history": payment_history_instance.dict()},
                "$inc": {"credits": int(credit_amount)}
            },
            upsert=True  # Return the modified document
        )
    
    except Exception as e:
        print("error at add_user_payment")
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


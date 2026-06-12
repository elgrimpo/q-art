# Libraries Import
import requests as requests
from fastapi import HTTPException
from bson import ObjectId
import datetime
import logging
import os
from datetime import datetime
from fastapi.responses import JSONResponse
import certifi
import motor.motor_asyncio as motor

# App imports
from api.schemas.schemas import PaymentHistory, User, UserAuth

logger = logging.getLogger(__name__)

# ---------------------------- INITIALIAZE CLIENT ---------------------------- #
mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
client = motor.AsyncIOMotorClient(mongo_url, **_tls)
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")

# ---------------------------------------------------------------------------- #
#                                 GET USER INFO                                #
# ---------------------------------------------------------------------------- #

async def get_user_info(email):
    try:
        logged_in_user = await users.find_one({"email": email})
        if logged_in_user:
            user_instance = User(**logged_in_user)
            return user_instance
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception:
        logger.error("Error in get_user_info for %s", email, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# ---------------------------------------------------------------------------- #
#                               AUTHENTICATE USER                              #
# ---------------------------------------------------------------------------- #

async def authenticate_user(user_auth: UserAuth):
    try:        
        auth_providers_dicts = [provider.dict() for provider in user_auth.auth_providers]
        
        user_data = {
            "name": user_auth.name,
            "email": user_auth.email,
            "auth_providers": auth_providers_dicts,
            "picture": user_auth.picture,
            "image_counts": {},
            "credits": 10,
            "payment_history": []
        }
        
        # Check if user exists
        user_exists = await users.find_one({"email": user_auth.email})
        
        # -------------------------------- USER EXISTS ------------------------------- #
        if user_exists:
            # Check if the auth_provider exists
            auth_provider_exists = False
            new_provider = user_auth.auth_providers[0].dict()
            
            for provider in user_exists["auth_providers"]:
                if provider["provider"] == new_provider["provider"]:
                    auth_provider_exists = True
                    break

            # If the auth_provider does not exist, add it to auth_providers
            if not auth_provider_exists:
                await users.update_one(
                    {"email": user_auth.email},
                    {"$push": {"auth_providers": new_provider}},
                )

            # If guest_id provided, transfer any images
            if user_auth.guest_id and user_auth.guest_id.startswith('guest_'):
                result = await images.update_many(
                    {"user_id": user_auth.guest_id},
                    {"$set": {"user_id": str(user_exists["_id"])}}
                )
        # ---------------------------- USER DOES NOT EXIST --------------------------- #
        else:
            # Create new user
            result = await users.insert_one(user_data)

            # If guest_id provided, transfer any images to the new user
            if user_auth.guest_id and user_auth.guest_id.startswith('guest_'):
                result = await images.update_many(
                    {"user_id": user_auth.guest_id},
                    {"$set": {"user_id": str(result.inserted_id)}}
                )

        return JSONResponse(content={"message": "User authenticated successfully"})
    except Exception:
        logger.error("Error in authenticate_user", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# ---------------------------------------------------------------------------- #
#                             INCREMENT USER COUNT                             #
# ---------------------------------------------------------------------------- #

async def increment_user_count(user_id, service_config, credits_deducted):
    try:
        # Skip database operations for guest users
        if str(user_id).startswith('guest_'):
            return

        current_year = datetime.utcnow().year
        current_month = datetime.utcnow().month

        # Get values from service_config
        upscale_resize = service_config.get("upscale_resize")
        download = service_config.get("download")

        # ------------------------ INCREMENT IMAGE GENERATIOM ------------------------ #
        generate = service_config.get("generate")
        if generate:
            await db["users"].update_one(
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
            await db["users"].update_one(
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
            await db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        f"image_counts.{current_year}.{current_month}.download": 1,
                    }
                },
                upsert=True,
            )

        # ---------------------------- UPDATE USER CREDITS --------------------------- #
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {
                    "credits": -credits_deducted,
                },
            },
            upsert=True,
        )
        logger.debug("User count incremented successfully for %s", user_id)

    except Exception:
        logger.error("Error in increment_user_count for %s", user_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# ---------------------------------------------------------------------------- #
#                               Add User Payment                               #
# ---------------------------------------------------------------------------- #

async def add_user_payment(
    user_id, transaction_amount, product_id, credit_amount, payment_intent, timestamp
):
    payment_history_instance = PaymentHistory(
        date_time=timestamp,
        transaction_amount=int(transaction_amount),
        product_id=product_id,
        credit_amount=int(credit_amount),
        payment_intent_id=payment_intent,
    )

    try:
        result = await db["users"].update_one(
            {
                "_id": ObjectId(user_id),
                "payment_history.payment_intent_id": {"$ne": payment_intent},
            },
            {
                "$push": {"payment_history": payment_history_instance.dict()},
                "$inc": {"credits": int(credit_amount)},
            },
        )
        if result.modified_count == 0:
            logger.warning(
                "add_user_payment: payment_intent %r already applied or user not found, skipping",
                payment_intent,
            )

    except Exception:
        logger.error("Error in add_user_payment for payment_intent %r", payment_intent, exc_info=True)
        raise HTTPException(status_code=500, detail="Payment processing failed")

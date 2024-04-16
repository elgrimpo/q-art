# Libraries Import
import requests as requests
from fastapi import HTTPException
from bson import ObjectId
import datetime
from starlette.exceptions import HTTPException
import os
from datetime import datetime
from fastapi.responses import JSONResponse
import certifi
import motor.motor_asyncio as motor



# App imports
from api.schemas.schemas import PaymentHistory, User

# ---------------------------- INITIALIAZE CLIENT ---------------------------- #
mongo_url = os.environ["MONGO_URL"]
client = motor.AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client.get_database("QART")
users = db.get_collection("users")

# ---------------------------------------------------------------------------- #
#                                 GET USER INFO                                #
# ---------------------------------------------------------------------------- #


async def get_user_info(email):

    try:
        logged_in_user = await users.find_one({"email": email})
        # print(logged_in_user)
        if logged_in_user:
            user_instance = User(**logged_in_user)

            return user_instance
        else:
            raise HTTPException(status_code=404, detail="User not found")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------- #
#                               AUTHENTICATE USER                              #
# ---------------------------------------------------------------------------- #


async def authenticate_user(user: User):
    try:
        # Check if user exists
        user_exists = await users.find_one({"email": user.email})

        # -------------------------------- USER EXISTS ------------------------------- #
        if user_exists:

            # Check if the auth_provider exists
            auth_provider_exists = False
            for provider in user_exists["auth_providers"]:
                if provider["provider"] == user.auth_providers[0].provider:
                    auth_provider_exists = True
                    break

            # If the auth_provider does not exist, add it to auth_providers
            if not auth_provider_exists:
                await users.update_one(
                    {"email": user.email},
                    {"$push": {"auth_providers": user.auth_providers[0].dict()}},
                )

        # ---------------------------- USER DOES NOT EXIST --------------------------- #
        else:
            await users.insert_one(user.dict())

        return JSONResponse(content={"message": "User authenticated successfully"})
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


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

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------- #
#                               Add User Payment                               #
# ---------------------------------------------------------------------------- #


async def add_user_payment(
    user_id, transaction_amount, product_id, credit_amount, payment_intent, timestamp
):
    print("Adding payment to user")

    # Create a new payment history object
    payment_history_instance = PaymentHistory(
        date_time=timestamp,
        transaction_amount=int(transaction_amount),
        product_id=product_id,
        credit_amount=int(credit_amount),
        payment_intent_id=payment_intent,
    )

    try:
        # Find and update the user document
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$push": {"payment_history": payment_history_instance.dict()},
                "$inc": {"credits": int(credit_amount)},
            },
            upsert=True,  # Return the modified document
        )

    except Exception as e:
        print("error at add_user_payment")
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

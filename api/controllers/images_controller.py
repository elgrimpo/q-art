# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
import os
import logging
import asyncio
from bson import ObjectId
import aioboto3
from pymongo import DESCENDING, ASCENDING
import motor.motor_asyncio as motor
from typing import Optional
from io import BytesIO
import certifi
from datetime import datetime, timedelta



# App imports
from api.utils.utils import createImagesFilterQuery, prepare_doc


load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MongoDB
mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
client = motor.AsyncIOMotorClient(mongo_url, **_tls)
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")

# S3
s3_bucket_name = "qrartimages"
s3_bucket_watermarked_name = "qrartimageswatermarked"
s3_session = aioboto3.Session()

# Tried caching a single long-lived client here to skip the per-call
# TCP+TLS handshake, but reverted: aiobotocore's connector defaults to a
# 12s keepalive, and real generate requests land minutes apart, so the
# pooled connection is always already dead by the next call — the client
# then pays a failed-reuse-and-retry penalty on top of a fresh handshake,
# which measured *slower* than just opening a new client every time.


# ---------------------------------------------------------------------------- #
#                                 INSERT IMAGE DOC                             #
# ---------------------------------------------------------------------------- #
async def create_image_doc(req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id=None):
    try:
        # Prepare the document
        doc = prepare_doc(
            req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id
        )

        # Insert image document into MongoDB
        result = await db["images"].insert_one(doc.dict())

        # Return the inserted image ID
        return str(result.inserted_id)

    except Exception:
        logger.error("Error in create_image_doc", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")



# ---------------------------------------------------------------------------- #
#                                 UPLOAD IMAGE                                 #
# ---------------------------------------------------------------------------- #
    
async def upload_image_to_s3(image, object_name, s3_bucket_name):
    try:
        # Convert the PIL Image to bytes
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)

        # Create an aioboto3 client
        async with s3_session.client(
            "s3",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        ) as s3_client:
            # Upload file to S3 asynchronously
            await s3_client.upload_fileobj(buffer, s3_bucket_name, object_name)

            # Create image_url for image doc
            image_url = f"https://{s3_bucket_name}.s3.us-west-1.amazonaws.com/{object_name}"

        return image_url

    except Exception:
        logger.error("S3 upload failed", exc_info=True)
        raise HTTPException(status_code=500, detail="S3 upload failed")

# ---------------------------------------------------------------------------- #
#                                 UPDATE IMAGE                                 #
# ---------------------------------------------------------------------------- #


async def update_image(document_id, update_data):
    try:
        # Update image with provided data dict
        updated_image = await db["images"].find_one_and_update(
            {"_id": ObjectId(document_id)}, {"$set": update_data}, return_document=True
        )

        if updated_image:
            # Convert ObjectIds to strings
            updated_image["_id"] = str(updated_image["_id"])
            return updated_image

        else:
            return {
                "message": f"Image with id {document_id} not found.",
            }

    except Exception:
        logger.error("Error updating document %s", document_id, exc_info=True)
        return {
            "message": f"Error updating document: {document_id}",
        }


# ---------------------------------------------------------------------------- #
#                                  GET IMAGE BY ID                             #
# ---------------------------------------------------------------------------- #


async def get_image(id):
    try:
        object_id = ObjectId(id)

        # Query DB for image._id
        image = await db["images"].find_one({"_id": object_id})

        if not image:
            raise HTTPException(status_code=404, detail=f"Image with id {id} not found")

        # Convert ObjectIds to strings
        image["_id"] = str(image["_id"])

        return image

    except HTTPException as http_exception:
        raise http_exception

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------- #
#                                  GET IMAGES                                  #
# ---------------------------------------------------------------------------- 

async def get_images(
    page: int = Query(1, alias="page"),
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    likes: Optional[str] = None,
    time_period: Optional[str] = None,
    image_style: Optional[str] = None,
    images_per_page: int = 12,
    sort_by: str = "Newest",
    featured: Optional[bool] = None,
):
    # -------------------------- CREATE QUERY PARAMETERS ------------------------- #
    try:
        # Create query
        query = createImagesFilterQuery(
            likes, time_period, image_style, user_id, exclude_user_id, featured=featured
        )

        # Calculate the offset based on the current page
        offset = (page - 1) * images_per_page

        # ------------------------------ QUERY DATABASE ------------------------------ #
        if sort_by == "Most Liked":
            # likes is an array of objects, so sort by array length via aggregation
            pipeline = [
                {"$match": query},
                {"$addFields": {"likes_count": {"$size": {"$ifNull": ["$likes", []]}}}},
                {"$sort": {"likes_count": DESCENDING, "created_at": DESCENDING}},
                {"$skip": offset},
                {"$limit": images_per_page},
            ]
            images_result = db["images"].aggregate(pipeline)
        else:
            if sort_by == "Oldest":
                sort_statement = [("created_at", ASCENDING)]
            else:
                sort_statement = [("created_at", DESCENDING)]
            images_result = (
                db["images"]
                .find(query)
                .sort(sort_statement)
                .skip(offset)
                .limit(images_per_page)
            )

        # Convert the images to a list
        images_list = await images_result.to_list(length=images_per_page)

        # Convert ObjectIds to strings
        for image in images_list:
            image["_id"] = str(image["_id"])

        return images_list

    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))


# ---------------------------------------------------------------------------- #
#                                 DELETE IMAGE                                 #
# ---------------------------------------------------------------------------- #


async def delete_image(id: str, user_id: str, is_admin: bool = False):
    try:
        object_id = ObjectId(id)
        object_name = f"{id}.png"

        # --------------------------- OWNERSHIP CHECK -------------------------- #
        image = await images.find_one({"_id": object_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        if image.get("user_id") != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this image")

        # --------------------------- DELETE IMAGE FROM S3 --------------------------- #
        try:
            # Create an aioboto3 client
            async with s3_session.client(
                "s3",
                aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            ) as s3_client:
                await asyncio.gather(
                    s3_client.delete_object(Bucket=s3_bucket_name, Key=object_name),
                    s3_client.delete_object(Bucket=s3_bucket_watermarked_name, Key=object_name),
                )
        except Exception:
            # Handle S3 deletion error
            raise HTTPException(status_code=500, detail="S3 deletion failed")

        # ---------------------- DELETE IMAGE DOC FROM DATABASE ---------------------- #
        try:
            result = await db["images"].delete_one({"_id": object_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Image not found")
        except HTTPException:
            # Reraise HTTP exceptions for FastAPI to handle
            raise
        except Exception:
            # Handle database deletion error
            raise HTTPException(status_code=500, detail="Database deletion failed")

        return {"message": "Image and document deleted successfully"}

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception:
        logger.error("Unexpected error in delete_image", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

    # ---------------------------------------------------------------------------- #
    #                               TOOGLE LIKE IMAGE                              #
    # ---------------------------------------------------------------------------- #


async def toggle_like(id, user_id):

    # ----------------------------- QUERY IMAGE IN DB ---------------------------- #
    try:
        image = await images.find_one({"_id": ObjectId(id)})

        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        # -------------------------- UPDATE IMAGE DOC IN DB -------------------------- #
        # Update image document in DB
        likes = image.get("likes", [])
        # Check if user_id is in "likes" array
        if user_id in [like["userId"] for like in likes]:
            likes = [like for like in likes if like["userId"] != user_id]
        else:
            likes.append({"userId": user_id, "time": datetime.utcnow()})
        # Update db with updated "likes" array
        await images.update_one({"_id": ObjectId(id)}, {"$set": {"likes": likes}})

        return {"message": "Like toggled successfully"}

    except HTTPException:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception:
        logger.error("Unexpected error in toggle_like", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ---------------------------------------------------------------------------- #
#                              TOGGLE FEATURED                                  #
# ---------------------------------------------------------------------------- #


async def toggle_featured(id):
    try:
        image = await images.find_one({"_id": ObjectId(id)})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        new_value = not image.get("featured", False)
        await images.update_one({"_id": ObjectId(id)}, {"$set": {"featured": new_value}})

        return {"message": "Featured toggled successfully", "featured": new_value}

    except HTTPException:
        raise
    except Exception:
        logger.error("Unexpected error in toggle_featured", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ---------------------------------------------------------------------------- #
#                                TOGGLE HERO                                    #
# ---------------------------------------------------------------------------- #


async def toggle_hero(id):
    try:
        image = await images.find_one({"_id": ObjectId(id)})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        if not image.get("featured", False):
            raise HTTPException(status_code=400, detail="Image must be featured before it can be a hero")

        new_value = not image.get("is_hero", False)
        await images.update_one({"_id": ObjectId(id)}, {"$set": {"is_hero": new_value}})

        return {"message": "Hero toggled successfully", "is_hero": new_value}

    except HTTPException:
        raise
    except Exception:
        logger.error("Unexpected error in toggle_hero", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

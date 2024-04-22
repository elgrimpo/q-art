# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
import os
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

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = motor.AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")

# S3
s3_bucket_name = "qrartimages"
s3_bucket_watermarked_name = "qrartimageswatermarked"
s3_session = aioboto3.Session()


# ---------------------------------------------------------------------------- #
#                                 INSERT IMAGE DOC                             #
# ---------------------------------------------------------------------------- #
async def create_image_doc(req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title):
    try:
        # Prepare the document
        doc = prepare_doc(
            req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title
        )

        # Insert image document into MongoDB
        result = await db["images"].insert_one(doc.dict())

        # Return the inserted image ID
        return str(result.inserted_id)

    except Exception as unexpected_error:
        print(str(unexpected_error))
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

    except Exception as upload_error:
        print(upload_error)
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

    except Exception as e:
        print(f"Error updating document: {str(e)}")
        return {
            "message": f"Error updating document: {str(e)}",
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
):
    # -------------------------- CREATE QUERY PARAMETERS ------------------------- #
    try:
        # Create query
        query = createImagesFilterQuery(
            likes, time_period, image_style, user_id, exclude_user_id
        )

        # Create sort
        sort_statement = None
        if sort_by == "Newest":
            sort_statement = [("created_at", DESCENDING)]
        elif sort_by == "Oldest":
            sort_statement = [("created_at", ASCENDING)]
        elif sort_by == "Most Liked":
            sort_statement = [("likes", DESCENDING), ("created_at", DESCENDING)]

        # Calculate the offset based on the current page
        offset = (page - 1) * images_per_page

        # ------------------------------ QUERY DATABASE ------------------------------ #
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


async def delete_image(id: str):
    try:
        object_id = ObjectId(id)
        object_name = f"{id}.png"

        # --------------------------- DELETE IMAGE FROM S3 --------------------------- #
        try:
            # Create an aioboto3 client
            async with s3_session.client(
                "s3",
                aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            ) as s3_client:
                # Upload file to S3 asynchronously
                await s3_client.delete_object(Bucket=s3_bucket_name, Key=object_name)
                await s3_client.delete_object(Bucket=s3_bucket_watermarked_name, Key=object_name)
            print("Image deleted from S3 successfully.")
        except Exception:
            # Handle S3 deletion error
            raise HTTPException(status_code=500, detail="S3 deletion failed")

        # ---------------------- DELETE IMAGE DOC FROM DATABASE ---------------------- #
        try:
            result = await db["images"].delete_one({"_id": object_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Image not found")
            print("Image document deleted from MongoDB successfully.")
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
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(f"Error during image deletion: {str(unexpected_error)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    # ---------------------------------------------------------------------------- #
    #                               TOOGLE LIKE IMAGE                              #
    # ---------------------------------------------------------------------------- #


async def toggle_like(id, user_id):

    # ----------------------------- QUERY IMAGE IN DB ---------------------------- #
    try:
        image = await images.find_one({"_id": ObjectId(id)})

        if not image:
            return {"message": "Image not found"}, 404

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

    except Exception as e:
        return {"message": f"Error toggling like: {e}"}, 500

# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
from pymongo import MongoClient
import os
from bson import ObjectId
import boto3
from botocore.exceptions import ClientError
from pymongo import DESCENDING, ASCENDING
from typing import Optional

# App imports
from utils.utils import createImagesFilterQuery

load_dotenv()

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")

# S3
api_url = os.environ["S3_URL"]
s3_bucket_name = "qrartimages"
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
)


# ---------------------------------------------------------------------------- #
#                                 IMSERT IMAGE                                 #
# ---------------------------------------------------------------------------- #
async def insert_image(doc):
    try:
        # -------------------------- CREATE IMAGE DOC IN DB -------------------------- #

        try:
            # Create new image document
            result = db["images"].insert_one(doc)
        except Exception as insert_error:
            # Handle database insertion error
            raise HTTPException(status_code=500, detail="Database insertion failed")

        # Create name for image file
        inserted_image_id = str(result.inserted_id)
        object_name = f"{inserted_image_id}.png"

        # -------------------------- UPLOAD IMAGE FILE TO S3 ------------------------- #
        try:
            with open("./qrcode-art.png", "rb") as file:
                # Upload file to S3
                s3_client.upload_file(file.name, s3_bucket_name, object_name)
                print("File uploaded successfully.")

                # Create image_url for image doc
                image_url = (
                    f"https://{s3_bucket_name}.s3.us-west-1.amazonaws.com/{object_name}"
                )
        except Exception as upload_error:
            # Handle S3 upload error
            raise HTTPException(status_code=500, detail="S3 upload failed")

        # ---------------------- AMEND IMAGE DOC WITH IMAGE_URL ---------------------- #
        try:
            # Update Image doc
            inserted_image = db["images"].find_one_and_update(
                {"_id": ObjectId(inserted_image_id)},
                {"$set": {"image_url": image_url}},
                return_document=True,
            )
        except Exception as update_error:
            # Handle database update error
            raise HTTPException(status_code=500, detail="Database update failed")

        # Convert ObjectIds to strings
        inserted_image["_id"] = str(inserted_image["_id"])

        return inserted_image

    except HTTPException as http_exception:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(f"Error during image insertion: {str(unexpected_error)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ---------------------------------------------------------------------------- #
#                                 UPDATE IMAGE                                 #
# ---------------------------------------------------------------------------- #


async def update_image(document_id, update_data):
    try:
        # Update image with provided data dict
        updated_image = db["images"].find_one_and_update(
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

def get_image(id):
    try:
        object_id = ObjectId(id)

        # Query DB for image._id
        image = db["images"].find_one({"_id": object_id})

        if not image:
            raise HTTPException(status_code=404, detail=f"Image with id {id} not found")
        
        # Convert ObjectIds to strings
        image["_id"] = str(image["_id"])

        return image

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------- #
#                                  GET IMAGES                                  #
# ---------------------------------------------------------------------------- #

def get_images(
    page: int = Query(1, alias="page"),
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    likes: Optional[str] = None,
    time_period: Optional[str] = None,
    sd_model: Optional[str] = None,
    images_per_page: int = 12,
    sort_by: str = "created_at",
    sort_direction: int = DESCENDING,
):
    # -------------------------- CREATE QUERY PARAMETERS ------------------------- #
    try:
        
        # Create query
        query = createImagesFilterQuery(
            likes, time_period, sd_model, user_id, exclude_user_id
        )

        # Calculate the offset based on the current page
        offset = (page - 1) * images_per_page

        # TODO: Sorting function

        # ------------------------------ QUERY DATABASE ------------------------------ #
        images_result = (
            db["images"]
            .find(query)
            .sort(sort_by, sort_direction)
            .skip(offset)
            .limit(images_per_page)
        )

        # Convert the images to a list
        images_list = list(images_result)

        # Convert ObjectIds to strings
        for image in images_list:
            image["_id"] = str(image["_id"])

        return images_list

    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))


# ---------------------------------------------------------------------------- #
#                                 DELETE IMAGE                                 #
# ---------------------------------------------------------------------------- #


def delete_image(id: str):
    try:
        object_id = ObjectId(id)
        object_name = f"{id}.png"

        # --------------------------- DELETE IMAGE FROM S3 --------------------------- #
        try:
            s3_client.delete_object(Bucket=s3_bucket_name, Key=object_name)
            print("Image deleted from S3 successfully.")
        except Exception as s3_delete_error:
            # Handle S3 deletion error
            raise HTTPException(status_code=500, detail="S3 deletion failed")

        # ---------------------- DELETE IMAGE DOC FROM DATABASE ---------------------- #
        try:
            result = db["images"].delete_one({"_id": object_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Image not found")
            print("Image document deleted from MongoDB successfully.")
        except HTTPException:
            # Reraise HTTP exceptions for FastAPI to handle
            raise
        except Exception as db_delete_error:
            # Handle database deletion error
            raise HTTPException(status_code=500, detail="Database deletion failed")

        return {"message": "Image and document deleted successfully"}

    except HTTPException as http_exception:
        # Reraise HTTP exceptions for FastAPI to handle
        raise
    except Exception as unexpected_error:
        # Log unexpected errors and return a generic error message
        print(f"Error during image deletion: {str(unexpected_error)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
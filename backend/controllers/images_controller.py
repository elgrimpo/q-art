# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
from pymongo import MongoClient
import os
from bson import ObjectId
import datetime
import boto3
from botocore.exceptions import ClientError
from pymongo import DESCENDING, ASCENDING
from typing import Optional

load_dotenv()

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


def insert_image(doc):
    try:
        # Create new image document
        result = db["images"].insert_one(doc)

        # Upload image to S3
        inserted_image_id = str(result.inserted_id)
        object_name = f"{inserted_image_id}.png"

        with open("./qrcode-art.png", "rb") as file:
            s3_client.upload_file(file.name, s3_bucket_name, object_name)
            print("File uploaded successfully.")

            # Update image document with image_url
            image_url = f"https://{s3_bucket_name}.s3.us-west-1.amazonaws.com/{object_name}"

            inserted_image = db["images"].find_one_and_update(
                {"_id": ObjectId(inserted_image_id)},
                {"$set": {"image_url": image_url}},
                return_document=True
            )

        inserted_image["_id"] = str(inserted_image["_id"])


        return inserted_image
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))


def update_image(document_id, update_data):
    try:
        # Update the image doc with the provided data and retrieve the updated document
        updated_image = db["images"].find_one_and_update(
            {"_id": ObjectId(document_id)},
            {"$set": update_data},
            return_document=True
        )

        if updated_image:
            # Return a success response with details about the updated image
            updated_image["_id"] = str(updated_image["_id"])
            return updated_image
            
        else:
            # Return an error response if the document is not found
            return {
                "message": f"Image with id {document_id} not found.",
            }

    except Exception as e:
        print(f"Error updating document: {str(e)}")

        # Return an error response
        return {
            "message": f"Error updating document: {str(e)}",
        }

def get_image(id):
    try:
        object_id = ObjectId(id)
        image = db["images"].find_one({"_id": object_id})
        if not image:
            raise HTTPException(status_code=404, detail=f"Image with id {id} not found")
        image["_id"] = str(image["_id"])
        return image
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_images(
    page: int = Query(1, alias="page"),
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    images_per_page: int = 12,
):
    try:
        # Calculate the offset based on the current page
        offset = (page - 1) * images_per_page

        # Define the sort order
        sort_direction = DESCENDING if sort_order.lower() == "desc" else ASCENDING

        # Build the query based on the parameters
        query = {}
        if user_id:
            query["user_id"] = user_id
        if exclude_user_id:
            query["user_id"] = {"$ne": exclude_user_id}

        # Get images with pagination, sorting, and filtering
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


def delete_image(id: str):
    
    object_name = id + ".png"
    object_id = ObjectId(id)
    try:
        # Delete image from S3
        s3_client.delete_object(Bucket=s3_bucket_name, Key=object_name)

        # Delete image docement from Mongo
        result = db["images"].delete_one({"_id": object_id})
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Error if image _id was not found
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Image with id {id} not found")
    return {"deleted": True}


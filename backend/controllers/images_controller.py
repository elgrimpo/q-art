# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
from pymongo import MongoClient
import os
from bson import ObjectId


load_dotenv()
mongo_url = os.environ["MONGO_URL"]

client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs
="CERT_NONE")
db = client.get_database("QART")
users = db.get_collection("users")
images = db.get_collection("images")


def insert_image(doc):
    try:
        result = db["images"].insert_one(doc)
        inserted_image = db["images"].find_one({"_id": result.inserted_id})
        inserted_image["_id"] = str(inserted_image["_id"])
        return inserted_image
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

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

def get_images(page: int = Query(1, alias="page"), user_id: str = ""):
    try:
        images_per_page = 12

        # Calculate the offset based on the current page
        offset = (page - 1) * images_per_page

        # Get images for the given user_id with pagination
        print("user_id")
        print(user_id)
        images_result = db["images"].find({"user_id": user_id}).sort("created_at", -1).skip(offset).limit(images_per_page)

        # Convert the images to a list
        images_list = list(images_result)

        # Convert ObjectIds to strings
        for image in images_list:
            image["_id"] = str(image["_id"])

        return images_list

    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))


def delete_image(id: str):
    try:
        # Convert id to ObjectId
        object_id = ObjectId(id)

        # Delete image
        result = db["images"].delete_one({"_id": object_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Image with id {id} not found")

        return {"deleted": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
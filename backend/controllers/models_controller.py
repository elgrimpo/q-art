# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
from pymongo import MongoClient
import os



load_dotenv()
mongo_url = os.environ["MONGO_URL"]

client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs
="CERT_NONE")
db = client.get_database("QART")
models = db.get_collection("models")



def get_models():
    try:
        models_result = db["models"].find()
        print(models_result)
        # Convert the images to a list
        models_list = list(models_result)

        # Convert ObjectIds to strings
        for model in models_list:
            model["_id"] = str(model["_id"])
        
        print(models_list)

        return models_list

    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))



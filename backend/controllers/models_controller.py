# Libraries Imports
from fastapi import HTTPException, Query
from dotenv import load_dotenv
import requests as requests
from pymongo import MongoClient
import os

load_dotenv()

# ----------------------------- INITIALIZE CLIENT ---------------------------- #
mongo_url = os.environ["MONGO_URL"]
client = MongoClient(mongo_url, ssl=True, ssl_cert_reqs
="CERT_NONE")
db = client.get_database("QART")
models = db.get_collection("models")


# ---------------------------------------------------------------------------- #
#                                  GET MODELS                                  #
# ---------------------------------------------------------------------------- #

def get_models():
    try:
        models_result = db["models"].find()
        
        # Convert the images to a list
        models_list = list(models_result)

        # Convert ObjectIds to strings
        for model in models_list:
            model["_id"] = str(model["_id"])
        return models_list

    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))



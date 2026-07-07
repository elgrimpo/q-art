# Libraries Import
import os
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from dotenv import load_dotenv
import motor.motor_asyncio as motor
import certifi

# App imports
from api.schemas.schemas import Style


load_dotenv()

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
client = motor.AsyncIOMotorClient(mongo_url, **_tls)
db = client.get_database("QART")
styles = db.get_collection("styles")


# ---------------------------------------------------------------------------- #
#                                  GET STYLE                                    #
# ---------------------------------------------------------------------------- #


async def get_style(style_id: str) -> Style:
    """Look up a style by its Mongo _id. Called by the /api/generate/start
    endpoint before creating a generation job, so an invalid or missing
    style_id fails fast with a clean HTTP error instead of surfacing only
    as an async job failure."""
    if not style_id:
        raise HTTPException(status_code=400, detail="Invalid style_id")
    try:
        object_id = ObjectId(style_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid style_id")

    doc = await styles.find_one({"_id": object_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Style not found")

    return Style(**doc)

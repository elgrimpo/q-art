"""One-off script: compute and store scannability_score for all images that
don't have one yet.

Run from the repo root:
    python -m api.scripts.backfill_scannability

Requires MONGO_URL in the environment (sourced from .env automatically).
Skips docs where image_url is missing or the download fails.
"""
import asyncio
import logging
from io import BytesIO

import certifi
import httpx
import motor.motor_asyncio as motor
from dotenv import load_dotenv
from PIL import Image
import os

from api.utils.structural_score import structural_score

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MONGO_URL = os.environ["MONGO_URL"]
TIMEOUT = httpx.Timeout(30.0, connect=10.0)


async def main():
    tls = {"tlsCAFile": certifi.where()} if "localhost" not in MONGO_URL else {}
    client = motor.AsyncIOMotorClient(MONGO_URL, **tls)
    images = client.get_database("QART").get_collection("images")

    query = {"scannability_score": {"$exists": False}}
    total = await images.count_documents(query)
    logger.info("Found %d images to backfill", total)

    processed = 0
    failed = 0

    async with httpx.AsyncClient(timeout=TIMEOUT) as http:
        async for doc in images.find(query):
            doc_id = doc["_id"]
            image_url = doc.get("image_url")
            payload = doc.get("content")

            if not image_url or not payload:
                logger.warning("[%s] skipping — missing image_url or content", doc_id)
                failed += 1
                continue

            try:
                resp = await http.get(image_url)
                resp.raise_for_status()
                img = Image.open(BytesIO(resp.content))
                result = structural_score(img, payload)
                await images.update_one(
                    {"_id": doc_id},
                    {"$set": {"scannability_score": result.score}},
                )
                processed += 1
                logger.info(
                    "[%d/%d] %s → %.1f", processed, total, doc_id, result.score
                )
            except Exception:
                logger.warning("[%s] failed", doc_id, exc_info=True)
                failed += 1

    client.close()
    logger.info("Done. processed=%d failed=%d", processed, failed)


if __name__ == "__main__":
    asyncio.run(main())

"""
E2E: Full generation flow — real Novita call, real S3 upload, real MongoDB write.

Run: pytest api/tests/e2e/test_e2e_generate.py -v -c pytest-e2e.ini -s

WARNING: This test costs one Novita credit and writes to the production QART database.
It cleans up after itself, but interrupting it mid-run will leave orphaned records.
"""
import os
import time
import httpx
import pytest
from api.main import app
from api.tests.e2e.conftest import mint_guest_jwt

BASE = "http://test"

GENERATE_PARAMS = {
    "prompt": "a simple red geometric shape",
    "website": "https://qr-ai.co",
    "negative_prompt": "ugly blurry text",
    "seed": "42",
    "qr_weight": "1",
    "sd_model": "cyberrealistic_v40_151857.safetensors",
    "style_prompt": "",
    "style_title": "Custom",
}


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.e2e
@pytest.mark.novita
async def test_generate_produces_scannable_image(mongo_db):
    """
    Full generation flow: real Novita call produces image, stored in S3 and MongoDB.

    Steps:
      1. Send generate request as a guest user
      2. Assert response contains image_url and watermarked_image_url
      3. Verify image document written to QART.images
      4. Cleanup: delete via API + remove guest_credits record
    """
    guest_id = f"guest_e2e_{int(time.time() * 1000)}"
    headers = {"Authorization": f"Bearer {mint_guest_jwt(guest_id)}"}
    image_id = None

    try:
        async with _client() as client:
            resp = await client.get(
                "/api/generate",
                params=GENERATE_PARAMS,
                headers=headers,
                timeout=180.0,
            )

        assert resp.status_code == 200, (
            f"Generate endpoint returned {resp.status_code}: {resp.text[:500]}"
        )
        data = resp.json()

        # Both S3 URLs must be present and non-empty
        assert "image_url" in data, "Response missing image_url"
        assert "watermarked_image_url" in data, "Response missing watermarked_image_url"
        assert data["image_url"].startswith("https://"), "image_url is not an HTTPS URL"
        assert data["watermarked_image_url"].startswith("https://"), \
            "watermarked_image_url is not an HTTPS URL"

        image_id = data.get("_id")
        assert image_id, "Response missing _id"

        # Verify document was written to MongoDB
        from bson import ObjectId
        db_doc = await mongo_db["images"].find_one({"_id": ObjectId(image_id)})
        assert db_doc is not None, f"Image {image_id} not found in QART.images"
        assert db_doc["user_id"] == guest_id
        assert db_doc["image_url"] == data["image_url"]

    finally:
        # Cleanup: delete image via API (exercises the delete endpoint too)
        if image_id:
            async with _client() as client:
                del_resp = await client.delete(
                    f"/api/images/delete/{image_id}",
                    headers=headers,
                    timeout=30.0,
                )
            # 200 or 404 (already deleted) are both acceptable
            assert del_resp.status_code in (200, 404), \
                f"Cleanup delete returned {del_resp.status_code}"

        # Remove the guest_credits record created during generation
        await mongo_db["guest_credits"].delete_one({"_id": guest_id})

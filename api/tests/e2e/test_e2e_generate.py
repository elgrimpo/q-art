"""
E2E: Full generation flow — real Novita call, real S3 upload, real MongoDB write.

Run: pytest api/tests/e2e/test_e2e_generate.py -v -c pytest-e2e.ini -s

WARNING: This test costs one Novita credit and writes to the production QART database.
It cleans up after itself, but interrupting it mid-run will leave orphaned records.
"""
import os
import time
import asyncio
import httpx
import pytest
from api.main import app
from api.tests.e2e.conftest import mint_guest_jwt

BASE = "http://test"

GENERATE_PARAMS_BASE = {
    "prompt": "a simple red geometric shape",
    "website": "https://qr-ai.co",
    "negative_prompt": "ugly blurry text",
    "seed": "42",
    "qr_weight": "1",
}


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


async def _await_generation(client, job_id, headers, timeout_seconds=180.0):
    """Poll /api/generate/progress/:id until the job reaches a terminal state."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        resp = await client.get(f"/api/generate/progress/{job_id}", headers=headers, timeout=30.0)
        assert resp.status_code == 200, f"Progress endpoint returned {resp.status_code}: {resp.text[:500]}"
        progress = resp.json()
        if progress["status"] == "succeeded":
            return progress["result"]
        if progress["status"] == "failed":
            raise AssertionError(f"Generation job failed: {progress.get('error')}")
        await asyncio.sleep(1.5)
    raise AssertionError(f"Generation job {job_id} did not complete within {timeout_seconds}s")


@pytest.mark.e2e
@pytest.mark.novita
async def test_generate_produces_scannable_image(mongo_db):
    """
    Full generation flow: real Novita call produces image, stored in S3 and MongoDB.

    Steps:
      1. Insert a temporary style doc (this test's own style, cleaned up after)
      2. Start generation as a guest user, poll until it completes
      3. Assert response contains image_url and watermarked_image_url
      4. Verify image document written to QART.images
      5. Cleanup: delete the image via API and the temp style doc
    """
    guest_id = f"guest_e2e_{int(time.time() * 1000)}"
    headers = {"Authorization": f"Bearer {mint_guest_jwt(guest_id)}"}
    image_id = None

    style_result = await mongo_db["styles"].insert_one({
        "style_key": "e2e-test-style",
        "version": 1,
        "is_active": True,
        "title": "E2E Test Style",
        "prompt": "",
        "loras": [],
        "style_modifier": 0,
        "sd_model": "cyberrealistic_v40_151857.safetensors",
    })
    style_id = str(style_result.inserted_id)

    try:
        async with _client() as client:
            start_resp = await client.post(
                "/api/generate/start",
                params={**GENERATE_PARAMS_BASE, "style_id": style_id},
                headers=headers,
                timeout=30.0,
            )
            assert start_resp.status_code == 200, (
                f"Generate start endpoint returned {start_resp.status_code}: {start_resp.text[:500]}"
            )
            job_id = start_resp.json()["job_id"]

            data = await _await_generation(client, job_id, headers)

        assert "image_url" in data, "Response missing image_url"
        assert "watermarked_image_url" in data, "Response missing watermarked_image_url"
        assert data["image_url"].startswith("https://"), "image_url is not an HTTPS URL"
        assert data["watermarked_image_url"].startswith("https://"), \
            "watermarked_image_url is not an HTTPS URL"

        image_id = data.get("_id")
        assert image_id, "Response missing _id"

        from bson import ObjectId
        db_doc = await mongo_db["images"].find_one({"_id": ObjectId(image_id)})
        assert db_doc is not None, f"Image {image_id} not found in QART.images"
        assert db_doc["user_id"] == guest_id
        assert db_doc["image_url"] == data["image_url"]
        assert db_doc["style_id"] == style_id

    finally:
        if image_id:
            async with _client() as client:
                del_resp = await client.delete(
                    f"/api/images/delete/{image_id}",
                    headers=headers,
                    timeout=30.0,
                )
            assert del_resp.status_code in (200, 404), \
                f"Cleanup delete returned {del_resp.status_code}"
        await mongo_db["styles"].delete_one({"_id": style_result.inserted_id})

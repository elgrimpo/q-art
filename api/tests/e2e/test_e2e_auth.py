"""
E2E: Auth bootstrap — guest images re-attributed to new account on first sign-in.

Run: pytest api/tests/e2e/test_e2e_auth.py -v -c pytest-e2e.ini -s
"""
import os
import time
import httpx
import pytest
from bson import ObjectId
from datetime import datetime, timezone

from api.main import app
from api.tests.e2e.conftest import mint_service_jwt

BASE = "http://test"


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.e2e
async def test_auth_creates_user_and_transfers_guest_images(mongo_db):
    """
    Auth bootstrap flow:
      1. Seed a guest image in QART.images
      2. POST /api/user/auth with guest_id (simulating Google sign-in)
      3. Assert new user created with 10 starter credits
      4. Assert image re-attributed to new user's _id
    """
    ts = int(time.time() * 1000)
    guest_id = f"guest_e2e_auth_{ts}"
    test_email = f"e2e_auth_{ts}@test.example.com"
    google_provider_id = f"google_e2e_{ts}"
    image_id = ObjectId()

    # Seed a guest-owned image
    await mongo_db["images"].insert_one({
        "_id": image_id,
        "user_id": guest_id,
        "prompt": "e2e auth test image",
        "content": "qr|image",
        "website": "https://test.example.com",
        "created_at": datetime.now(timezone.utc),
        "image_url": "https://s3.example/img.png",
        "watermarked_image_url": "https://s3.example/img_wm.png",
        "style_title": "Custom",
        "sd_model": "test-model",
        "seed": 42,
        "qr_weight": 0.5,
        "negative_prompt": "",
        "width": 512,
        "height": 512,
        "query_type": "test",
        "steps": 20,
        "controlnet0": {
            "model": "test-control",
            "weight": 0.5,
            "guidance_start": 0.0,
            "guidance_end": 1.0,
        },
        "downloaded": False,
        "likes": [],
    })

    auth_body = {
        "name": "E2E Auth Test",
        "email": test_email,
        "auth_providers": [{"provider": "google", "providerId": google_provider_id}],
        "guest_id": guest_id,
        "picture": None,
    }

    try:
        async with _client() as client:
            resp = await client.post(
                "/api/user/auth",
                json=auth_body,
                headers={"Authorization": f"Bearer {mint_service_jwt()}"},
            )

        assert resp.status_code == 200, f"Auth returned {resp.status_code}: {resp.text}"

        # New user must exist with 10 starter credits
        new_user = await mongo_db["users"].find_one({"email": test_email})
        assert new_user is not None, f"User with email {test_email} was not created"
        assert new_user["credits"] == 10, (
            f"Expected 10 starter credits, got {new_user['credits']}"
        )

        # Image must be re-attributed from guest_id to new user's _id
        updated_image = await mongo_db["images"].find_one({"_id": image_id})
        assert updated_image is not None, "Image not found after auth"
        assert updated_image["user_id"] == str(new_user["_id"]), (
            f"Image user_id not updated: expected {new_user['_id']}, "
            f"got {updated_image['user_id']}"
        )

    finally:
        await mongo_db["users"].delete_one({"email": test_email})
        await mongo_db["images"].delete_one({"_id": image_id})


@pytest.mark.e2e
async def test_auth_with_existing_user_adds_auth_provider(mongo_db):
    """
    Auth flow when user already exists with a different auth provider:
      1. Seed a user with one auth provider (e.g., google)
      2. POST /api/user/auth with the same email but a different provider (e.g., github)
      3. Assert new provider was added to auth_providers list
      4. Assert user still has original credits
    """
    ts = int(time.time() * 1000)
    test_email = f"e2e_existing_{ts}@test.example.com"
    google_provider_id = f"google_e2e_{ts}"
    github_provider_id = f"github_e2e_{ts}"
    original_credits = 10

    # Seed an existing user with google auth
    user_result = await mongo_db["users"].insert_one({
        "name": "Existing User",
        "email": test_email,
        "auth_providers": [{"provider": "google", "providerId": google_provider_id}],
        "picture": None,
        "image_counts": {},
        "credits": original_credits,
        "payment_history": [],
    })
    user_id = user_result.inserted_id

    # Attempt auth with github provider for the same email
    auth_body = {
        "name": "Existing User",
        "email": test_email,
        "auth_providers": [{"provider": "github", "providerId": github_provider_id}],
        "guest_id": None,
        "picture": None,
    }

    try:
        async with _client() as client:
            resp = await client.post(
                "/api/user/auth",
                json=auth_body,
                headers={"Authorization": f"Bearer {mint_service_jwt()}"},
            )

        assert resp.status_code == 200, f"Auth returned {resp.status_code}: {resp.text}"

        # User must still exist with original credits
        updated_user = await mongo_db["users"].find_one({"_id": user_id})
        assert updated_user is not None, "User was deleted"
        assert updated_user["credits"] == original_credits, (
            f"Credits should remain {original_credits}, got {updated_user['credits']}"
        )

        # User must now have both google and github auth providers
        providers = updated_user["auth_providers"]
        provider_names = [p["provider"] for p in providers]
        assert "google" in provider_names, "Google provider was removed"
        assert "github" in provider_names, "GitHub provider was not added"

    finally:
        await mongo_db["users"].delete_one({"_id": user_id})


@pytest.mark.e2e
async def test_auth_transfers_guest_images_to_existing_user(mongo_db):
    """
    Auth flow when user exists and guest_id is provided:
      1. Seed an existing user
      2. Seed a guest image
      3. POST /api/user/auth with guest_id
      4. Assert guest image is re-attributed to existing user's _id
    """
    ts = int(time.time() * 1000)
    guest_id = f"guest_e2e_existing_{ts}"
    test_email = f"e2e_existing_with_images_{ts}@test.example.com"
    google_provider_id = f"google_e2e_{ts}"
    image_id = ObjectId()

    # Seed an existing user
    user_result = await mongo_db["users"].insert_one({
        "name": "Existing User",
        "email": test_email,
        "auth_providers": [{"provider": "google", "providerId": google_provider_id}],
        "picture": None,
        "image_counts": {},
        "credits": 10,
        "payment_history": [],
    })
    user_id = user_result.inserted_id

    # Seed a guest-owned image
    await mongo_db["images"].insert_one({
        "_id": image_id,
        "user_id": guest_id,
        "prompt": "guest image for existing user",
        "content": "qr|image",
        "website": "https://test.example.com",
        "created_at": datetime.now(timezone.utc),
        "image_url": "https://s3.example/img.png",
        "watermarked_image_url": "https://s3.example/img_wm.png",
        "style_title": "Custom",
        "sd_model": "test-model",
        "seed": 99,
        "qr_weight": 0.7,
        "negative_prompt": "",
        "width": 512,
        "height": 512,
        "query_type": "test",
        "steps": 20,
        "controlnet0": {
            "model": "test-control",
            "weight": 0.5,
            "guidance_start": 0.0,
            "guidance_end": 1.0,
        },
        "downloaded": False,
        "likes": [],
    })

    auth_body = {
        "name": "Existing User",
        "email": test_email,
        "auth_providers": [{"provider": "google", "providerId": google_provider_id}],
        "guest_id": guest_id,
        "picture": None,
    }

    try:
        async with _client() as client:
            resp = await client.post(
                "/api/user/auth",
                json=auth_body,
                headers={"Authorization": f"Bearer {mint_service_jwt()}"},
            )

        assert resp.status_code == 200, f"Auth returned {resp.status_code}: {resp.text}"

        # Guest image must be re-attributed to existing user's _id
        updated_image = await mongo_db["images"].find_one({"_id": image_id})
        assert updated_image is not None, "Image not found after auth"
        assert updated_image["user_id"] == str(user_id), (
            f"Image user_id not updated: expected {user_id}, "
            f"got {updated_image['user_id']}"
        )

    finally:
        await mongo_db["users"].delete_one({"_id": user_id})
        await mongo_db["images"].delete_one({"_id": image_id})

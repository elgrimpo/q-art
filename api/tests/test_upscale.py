# TODO(QRAI-53 Task 3/7): test_upscale.py exercises the pre-migration upscale() controller
# which still uses "downloaded" field and the old route. This file will be deleted in Task 7
# when /api/upscale/{image_id} is retired. Assertions here use raw dicts, not Pydantic models.
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from api.controllers.generate_controller import upscale


FAKE_IMAGE_ID = "507f1f77bcf86cd799439011"
FAKE_USER_ID = "507f1f77bcf86cd799439012"
ORIG_URL = f"https://qrartimages.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png"
WMARK_URL = f"https://qrartimageswatermarked.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png"


def _fake_image(width=512, downloaded=False):
    return {
        "_id": FAKE_IMAGE_ID,
        "user_id": FAKE_USER_ID,
        "created_at": datetime.now(timezone.utc),
        "prompt": "a dragon",
        "negative_prompt": "ugly",
        "content": "https://example.com",
        "sd_model": "sd-v1-5",
        "seed": 42,
        "qr_weight": 0.5,
        "width": width,
        "height": width,
        "query_type": "img2img",
        "steps": 30,
        "controlnet0": {
            "model": "control_v1p_sd15_brightness",
            "weight": 0.35,
            "guidance_start": 0.0,
            "guidance_end": 1.0,
        },
        "image_url": ORIG_URL,
        "watermarked_image_url": WMARK_URL,
        "downloaded": downloaded,
    }


def _mock_s3_session():
    """Return a mock aioboto3 session whose .client() works as an async context manager."""
    mock_s3_client = AsyncMock()
    mock_s3_ctx = AsyncMock()
    mock_s3_ctx.__aenter__ = AsyncMock(return_value=mock_s3_client)
    mock_s3_ctx.__aexit__ = AsyncMock(return_value=False)
    mock_session = MagicMock()
    mock_session.client.return_value = mock_s3_ctx
    return mock_session, mock_s3_client


# ---------------------------------------------------------------------------- #
#                    ALREADY AT REQUESTED RESOLUTION                           #
# No actual upscale — only a download-flag update is written.                  #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.users")
@patch("api.controllers.generate_controller.images")
async def test_upscale_already_at_resolution_marks_downloaded(
    mock_images,
    mock_users,
    mock_update,
    _mock_increment,
):
    """When the image is already at the requested resolution, only downloaded=True is written."""
    mock_images.find_one = AsyncMock(return_value=_fake_image(width=512, downloaded=False))
    mock_users.find_one_and_update = AsyncMock(return_value={"credits": 10})
    mock_update.return_value = {**_fake_image(width=512), "downloaded": True}

    await upscale(image_id=FAKE_IMAGE_ID, user_id=FAKE_USER_ID, resolution="512")

    mock_update.assert_called_once()
    update_data = mock_update.call_args.args[1]
    assert update_data == {"downloaded": True}


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.users")
@patch("api.controllers.generate_controller.images")
async def test_upscale_already_downloaded_at_resolution_skips_update(
    mock_images,
    mock_users,
    _mock_increment,
):
    """When already downloaded at the same resolution, no DB write occurs."""
    mock_images.find_one = AsyncMock(return_value=_fake_image(width=512, downloaded=True))
    mock_users.find_one_and_update = AsyncMock(return_value={"credits": 10})

    with patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock) as mock_update:
        await upscale(image_id=FAKE_IMAGE_ID, user_id=FAKE_USER_ID, resolution="512")
        mock_update.assert_not_called()


# ---------------------------------------------------------------------------- #
#                        UPSCALE NEEDED (HAPPY PATH)                           #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
@patch("api.controllers.generate_controller.s3_session")
@patch("api.controllers.generate_controller.users")
@patch("api.controllers.generate_controller.images")
async def test_upscale_calls_novita_and_stores_result(
    mock_images,
    mock_users,
    mock_s3_session,
    mock_novita_client,
    mock_update,
    _mock_increment,
):
    """When resolution > current width, Novita upscale is called and DB is updated with new size."""
    mock_images.find_one = AsyncMock(return_value=_fake_image(width=512, downloaded=False))
    mock_users.find_one_and_update = AsyncMock(return_value={"credits": 50})

    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client

    mock_body = AsyncMock()
    mock_body.read = AsyncMock(return_value=b"fake-image-bytes")
    mock_s3_client.get_object = AsyncMock(return_value={"Body": mock_body})
    mock_s3_client.put_object = AsyncMock()

    mock_upscale_response = MagicMock()
    mock_upscale_response.data.imgs_bytes = [b"upscaled-content"]
    mock_novita_client.sync_upscale.return_value = mock_upscale_response

    mock_update.return_value = {**_fake_image(width=1024), "downloaded": True}

    await upscale(image_id=FAKE_IMAGE_ID, user_id=FAKE_USER_ID, resolution="1024")

    mock_novita_client.sync_upscale.assert_called_once()
    mock_s3_client.put_object.assert_called_once()
    update_data = mock_update.call_args.args[1]
    assert update_data["width"] == 1024
    assert update_data["downloaded"] is True


# ---------------------------------------------------------------------------- #
#                         INSUFFICIENT CREDITS → 403                           #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.users")
@patch("api.controllers.generate_controller.images")
async def test_upscale_insufficient_credits_raises_403(mock_images, mock_users):
    """A user without enough credits must get a 403."""
    mock_images.find_one = AsyncMock(return_value=_fake_image(width=512, downloaded=False))
    mock_users.find_one_and_update = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await upscale(image_id=FAKE_IMAGE_ID, user_id=FAKE_USER_ID, resolution="1024")

    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------- #
#                         OWNERSHIP / NOT-FOUND GUARDS                         #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.users")
@patch("api.controllers.generate_controller.images")
async def test_upscale_rejects_non_owner(mock_images, mock_users):
    img = _fake_image()
    img["user_id"] = "someone_else"
    mock_images.find_one = AsyncMock(return_value=img)
    mock_users.find_one_and_update = AsyncMock(return_value={"_id": FAKE_USER_ID, "credits": 1000})

    with pytest.raises(HTTPException) as exc:
        await upscale(FAKE_IMAGE_ID, FAKE_USER_ID, 1024)

    assert exc.value.status_code == 403
    # Credits must not be touched on a rejected upscale
    mock_users.find_one_and_update.assert_not_called()


@patch("api.controllers.generate_controller.images")
async def test_upscale_image_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await upscale(FAKE_IMAGE_ID, FAKE_USER_ID, 1024)
    assert exc.value.status_code == 404


@patch("api.controllers.generate_controller.images")
async def test_upscale_malformed_image_id_404(mock_images):
    """A malformed id must return a clean 404, not a raw 500 from ObjectId()."""
    mock_images.find_one = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await upscale("not-a-valid-objectid", FAKE_USER_ID, 1024)
    assert exc.value.status_code == 404
    # The DB is never touched for an id that can't be a real document.
    mock_images.find_one.assert_not_called()


# ---------------------------------------------------------------------------- #
#                         RESOLUTION VALIDATION → 400                          #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.images")
async def test_upscale_non_numeric_resolution_400(mock_images):
    """A non-numeric resolution is rejected before any DB access."""
    mock_images.find_one = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await upscale(FAKE_IMAGE_ID, FAKE_USER_ID, "huge")
    assert exc.value.status_code == 400
    mock_images.find_one.assert_not_called()


@patch("api.controllers.generate_controller.images")
async def test_upscale_off_tier_resolution_400(mock_images):
    """An off-tier size (not in the price map) must be rejected, not run for free."""
    mock_images.find_one = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await upscale(FAKE_IMAGE_ID, FAKE_USER_ID, 999)
    assert exc.value.status_code == 400
    mock_images.find_one.assert_not_called()

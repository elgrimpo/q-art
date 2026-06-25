import io
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from bson import ObjectId
from fastapi import HTTPException

from api.controllers.admin_controller import admin_download_image

FAKE_IMAGE_ID = "507f1f77bcf86cd799439011"


@patch("api.controllers.admin_controller.images")
async def test_admin_download_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await admin_download_image(FAKE_IMAGE_ID)
    assert exc.value.status_code == 404


@patch("api.controllers.admin_controller._download_from_s3")
@patch("api.controllers.admin_controller.images")
async def test_admin_download_already_unlocked_serves_existing_s3_file(mock_images, mock_download):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "unlocked": True})
    mock_download.return_value = b"already-upscaled-bytes"

    response = await admin_download_image(FAKE_IMAGE_ID)

    mock_download.assert_called_once_with(FAKE_IMAGE_ID)
    assert response.media_type == "image/png"
    assert "attachment" in response.headers["Content-Disposition"]


@patch("api.controllers.admin_controller._run_upscale")
@patch("api.controllers.admin_controller.images")
async def test_admin_download_not_unlocked_runs_upscale_without_persisting(mock_images, mock_run_upscale):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "unlocked": False})
    mock_run_upscale.return_value = (b"freshly-upscaled-bytes", 2048, 2048)

    response = await admin_download_image(FAKE_IMAGE_ID)

    mock_run_upscale.assert_called_once_with(FAKE_IMAGE_ID)
    assert response.media_type == "image/png"


@patch("api.controllers.admin_controller.update_image")
@patch("api.controllers.admin_controller._run_upscale")
@patch("api.controllers.admin_controller.images")
async def test_admin_download_does_not_call_update_image(mock_images, mock_run_upscale, mock_update_image):
    """The whole point of this endpoint: it must never mutate the target ImageDoc."""
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "unlocked": False})
    mock_run_upscale.return_value = (b"bytes", 2048, 2048)

    await admin_download_image(FAKE_IMAGE_ID)

    mock_update_image.assert_not_called()

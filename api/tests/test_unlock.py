import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from fastapi import HTTPException

from api.controllers.unlock_controller import unlock_image

FAKE_USER_ID = "507f1f77bcf86cd799439011"
FAKE_IMAGE_ID = "607f1f77bcf86cd799439022"
FAKE_SESSION_ID = "cs_test_abc123"


def _image_doc(unlocked=False, unlock_pending=False, user_id=FAKE_USER_ID):
    return {
        "_id": ObjectId(FAKE_IMAGE_ID),
        "user_id": user_id,
        "unlocked": unlocked,
        "unlock_pending": unlock_pending,
        "width": 768,
        "height": 768,
        "image_url": f"https://qrartimages.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png",
        "watermarked_image_url": f"https://qrartimageswatermarked.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png",
    }


def _stripe_session(image_id=FAKE_IMAGE_ID, status="complete", payment_status="paid"):
    session = MagicMock()
    session.status = status
    session.payment_status = payment_status
    session.metadata = {"image_id": image_id}
    return session


def _upscale_response():
    resp = MagicMock()
    resp.data.imgs_bytes = [b"fake-png-bytes"]
    return resp


@patch("api.controllers.unlock_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller.s3_session")
@patch("api.controllers.unlock_controller.novita_client")
@patch("api.controllers.unlock_controller.stripe")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_success_via_stripe_session(
    mock_images, mock_stripe, mock_novita, mock_s3, mock_update_image
):
    """Happy path: valid Stripe session → upscale → DB update → return unlocked image."""
    mock_images.find_one = AsyncMock(return_value=_image_doc())
    mock_stripe.checkout.Session.retrieve.return_value = _stripe_session()

    # Mock S3 get (download original)
    mock_body = AsyncMock()
    mock_body.read = AsyncMock(return_value=b"fake-original-bytes")
    mock_s3_client = AsyncMock()
    mock_s3_client.get_object = AsyncMock(return_value={"Body": mock_body})
    mock_s3_client.put_object = AsyncMock()
    mock_s3_client.__aenter__ = AsyncMock(return_value=mock_s3_client)
    mock_s3_client.__aexit__ = AsyncMock(return_value=False)
    mock_s3.client.return_value = mock_s3_client

    mock_novita.sync_upscale.return_value = _upscale_response()

    unlocked_doc = {**_image_doc(unlocked=True), "_id": FAKE_IMAGE_ID, "width": 2048, "height": 2048}
    mock_update_image.return_value = unlocked_doc

    result = await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)

    assert result["unlocked"] is True
    assert result["width"] == 2048
    mock_stripe.checkout.Session.retrieve.assert_called_once_with(FAKE_SESSION_ID)
    mock_s3_client.put_object.assert_called_once()
    mock_update_image.assert_called_once()
    update_data = mock_update_image.call_args.args[1]
    assert update_data["unlocked"] is True
    assert update_data["unlock_pending"] is False
    assert update_data["width"] == 2048
    assert update_data["height"] == 2048


@patch("api.controllers.unlock_controller.images")
async def test_unlock_already_unlocked_returns_immediately(mock_images):
    """Idempotent: an already-unlocked image is returned without calling Stripe or Novita."""
    doc = {**_image_doc(unlocked=True), "_id": FAKE_IMAGE_ID}
    mock_images.find_one = AsyncMock(return_value=doc)

    result = await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)

    assert result["unlocked"] is True


@patch("api.controllers.unlock_controller.images")
async def test_unlock_wrong_owner_raises_403(mock_images):
    mock_images.find_one = AsyncMock(return_value=_image_doc(user_id="other_user_id"))
    with pytest.raises(HTTPException) as exc_info:
        await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 403


@patch("api.controllers.unlock_controller.stripe")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_unpaid_session_raises_402(mock_images, mock_stripe):
    mock_images.find_one = AsyncMock(return_value=_image_doc())
    mock_stripe.checkout.Session.retrieve.return_value = _stripe_session(payment_status="unpaid")
    with pytest.raises(HTTPException) as exc_info:
        await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 402


@patch("api.controllers.unlock_controller.stripe")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_session_image_mismatch_raises_400(mock_images, mock_stripe):
    mock_images.find_one = AsyncMock(return_value=_image_doc())
    mock_stripe.checkout.Session.retrieve.return_value = _stripe_session(image_id="other_image_id")
    with pytest.raises(HTTPException) as exc_info:
        await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 400


@patch("api.controllers.unlock_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller.s3_session")
@patch("api.controllers.unlock_controller.novita_client")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_via_pending_flag_no_session_id(
    mock_images, mock_novita, mock_s3, mock_update_image
):
    """Tab-close path: unlock_pending=True with no stripe_session_id triggers upscale."""
    mock_images.find_one = AsyncMock(return_value=_image_doc(unlock_pending=True))

    mock_body = AsyncMock()
    mock_body.read = AsyncMock(return_value=b"fake-original-bytes")
    mock_s3_client = AsyncMock()
    mock_s3_client.get_object = AsyncMock(return_value={"Body": mock_body})
    mock_s3_client.put_object = AsyncMock()
    mock_s3_client.__aenter__ = AsyncMock(return_value=mock_s3_client)
    mock_s3_client.__aexit__ = AsyncMock(return_value=False)
    mock_s3.client.return_value = mock_s3_client

    mock_novita.sync_upscale.return_value = _upscale_response()
    unlocked_doc = {**_image_doc(unlocked=True), "_id": FAKE_IMAGE_ID, "width": 2048, "height": 2048}
    mock_update_image.return_value = unlocked_doc

    result = await unlock_image(FAKE_IMAGE_ID, None, FAKE_USER_ID)

    assert result["unlocked"] is True


@patch("api.controllers.unlock_controller.images")
async def test_unlock_no_session_and_no_pending_raises_402(mock_images):
    """No session ID and no unlock_pending flag → payment not confirmed → 402."""
    mock_images.find_one = AsyncMock(return_value=_image_doc(unlock_pending=False))
    with pytest.raises(HTTPException) as exc_info:
        await unlock_image(FAKE_IMAGE_ID, None, FAKE_USER_ID)
    assert exc_info.value.status_code == 402

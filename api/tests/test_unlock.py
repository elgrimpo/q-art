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


def _mock_s3(mock_s3):
    """Wire an aioboto3-style mock whose client supports get/put_object as an async ctx mgr."""
    mock_body = AsyncMock()
    mock_body.read = AsyncMock(return_value=b"fake-original-bytes")
    mock_s3_client = AsyncMock()
    mock_s3_client.get_object = AsyncMock(return_value={"Body": mock_body})
    mock_s3_client.put_object = AsyncMock()
    mock_s3_client.__aenter__ = AsyncMock(return_value=mock_s3_client)
    mock_s3_client.__aexit__ = AsyncMock(return_value=False)
    mock_s3.client.return_value = mock_s3_client
    return mock_s3_client


@patch("api.controllers.unlock_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller._run_upscale", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller.s3_session")
@patch("api.controllers.unlock_controller.stripe")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_success_via_stripe_session(
    mock_images, mock_stripe, mock_s3, mock_run_upscale, mock_update_image
):
    """Happy path: valid Stripe session → upscale → DB update → return unlocked image."""
    mock_images.find_one = AsyncMock(return_value=_image_doc())
    mock_stripe.checkout.Session.retrieve.return_value = _stripe_session()
    mock_s3_client = _mock_s3(mock_s3)

    # _run_upscale returns (bytes, width, height)
    mock_run_upscale.return_value = (b"fake-png-bytes", 2048, 2048)

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
@patch("api.controllers.unlock_controller._run_upscale", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller.s3_session")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_via_pending_flag_no_session_id(
    mock_images, mock_s3, mock_run_upscale, mock_update_image
):
    """Tab-close path: unlock_pending=True with no stripe_session_id triggers upscale."""
    mock_images.find_one = AsyncMock(return_value=_image_doc(unlock_pending=True))
    _mock_s3(mock_s3)

    mock_run_upscale.return_value = (b"fake-png-bytes", 2048, 2048)
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


@patch("api.controllers.unlock_controller.images")
async def test_unlock_invalid_image_id_raises_404(mock_images):
    """A malformed image_id must raise 404, not a raw ObjectId exception."""
    with pytest.raises(HTTPException) as exc_info:
        await unlock_image("not-a-valid-object-id", FAKE_SESSION_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 404
    mock_images.find_one.assert_not_called()


@patch("api.controllers.unlock_controller.stripe")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_stripe_network_error_raises_502(mock_images, mock_stripe):
    """A Stripe network error during session retrieval must raise 502, not 500."""
    import stripe as stripe_module
    mock_images.find_one = AsyncMock(return_value=_image_doc())
    mock_stripe.checkout.Session.retrieve.side_effect = stripe_module.error.APIConnectionError("timeout")
    mock_stripe.error.InvalidRequestError = stripe_module.error.InvalidRequestError
    with pytest.raises(HTTPException) as exc_info:
        await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 502


@patch("api.controllers.unlock_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller._run_upscale", new_callable=AsyncMock)
@patch("api.controllers.unlock_controller.s3_session")
@patch("api.controllers.unlock_controller.stripe")
@patch("api.controllers.unlock_controller.images")
async def test_unlock_update_image_failure_raises_500(
    mock_images, mock_stripe, mock_s3, mock_run_upscale, mock_update_image
):
    """If update_image returns an error dict after successful upscale, raise 500."""
    mock_images.find_one = AsyncMock(return_value=_image_doc())
    mock_stripe.checkout.Session.retrieve.return_value = _stripe_session()
    _mock_s3(mock_s3)

    mock_run_upscale.return_value = (b"fake-png-bytes", 2048, 2048)
    mock_update_image.return_value = {"message": "Error updating document: ..."}

    with pytest.raises(HTTPException) as exc_info:
        await unlock_image(FAKE_IMAGE_ID, FAKE_SESSION_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 500

import httpx
import pytest
from io import BytesIO
from PIL import Image
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from novita_client import V3TaskResponseStatus

from api.controllers.generate_controller import (
    predict,
    download_image_bytes,
    IMAGE_DOWNLOAD_TIMEOUT,
)


# ---------------------------------------------------------------------------- #
#                                   HELPERS                                    #
# ---------------------------------------------------------------------------- #

FAKE_IMAGE_ID = "507f1f77bcf86cd799439011"
ORIG_URL = f"https://qrartimages.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png"
WMARK_URL = f"https://qrartimageswatermarked.s3.us-west-1.amazonaws.com/{FAKE_IMAGE_ID}.png"

PREDICT_KWARGS = dict(
    prompt="a dragon",
    website="https://example.com",
    negative_prompt="ugly blurry",
    seed=42,
    qr_weight=0.5,
    sd_model="sd-v1-5",
    user_id=FAKE_IMAGE_ID,
    style_prompt=", cinematic",
    style_title="Cinematic",
)


def _white_png_bytes():
    buf = BytesIO()
    Image.new("RGB", (512, 512), "white").save(buf, format="PNG")
    return buf.getvalue()


def _build_novita_mocks():
    img2img_result = MagicMock()
    img2img_result.task.task_id = "novita-task-123"

    task_result = MagicMock()
    task_result.task.status = V3TaskResponseStatus.TASK_STATUS_SUCCEED
    task_result.extra.seed = 99
    task_result.get_image_urls.return_value = ["http://novita.example/img.png"]

    return img2img_result, task_result


async def _run_predict(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Wire up all mocks and call predict(). Returns (result, mocks)."""
    img2img_result, task_result = _build_novita_mocks()
    mock_novita_client.img2img_v3.return_value = img2img_result
    mock_novita_client.wait_for_task_v3.return_value = task_result

    mock_download.return_value = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")
    mock_create_doc.return_value = FAKE_IMAGE_ID
    mock_upload.side_effect = [ORIG_URL, WMARK_URL]
    mock_update.return_value = {
        "_id": FAKE_IMAGE_ID,
        "image_url": ORIG_URL,
        "watermarked_image_url": WMARK_URL,
    }

    result = await predict(**PREDICT_KWARGS)
    return result, {
        "create_doc": mock_create_doc,
        "upload": mock_upload,
        "update": mock_update,
        "client": mock_novita_client,
        "download": mock_download,
    }


# ---------------------------------------------------------------------------- #
#               TEST 1: ABILITY TO GENERATE AN IMAGE                           #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_generate_returns_image_urls(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    result, _ = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    assert result["image_url"] == ORIG_URL
    assert result["watermarked_image_url"] == WMARK_URL


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_generate_calls_novita_twice(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """client.img2img_v3 and client.wait_for_task_v3 are each called once."""
    _, mocks = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    mocks["client"].img2img_v3.assert_called_once()
    mocks["client"].wait_for_task_v3.assert_called_once()


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_generate_does_not_check_credits_for_logged_in_user(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Logged-in users must generate without any DB credit check — generation completes successfully."""
    result, _ = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )
    assert result["image_url"] == ORIG_URL


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
@patch("api.controllers.generate_controller.guest_credits_col")
async def test_generate_guest_skips_db_credit_check(
    mock_guest_credits,
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Guest users must use the guest_credits quota, not the users collection."""
    img2img_result, task_result = _build_novita_mocks()
    mock_novita_client.img2img_v3.return_value = img2img_result
    mock_novita_client.wait_for_task_v3.return_value = task_result
    mock_guest_credits.find_one_and_update = AsyncMock(return_value={"_id": "guest_abc123", "used": 1})
    mock_download.return_value = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")
    mock_create_doc.return_value = FAKE_IMAGE_ID
    mock_upload.side_effect = [ORIG_URL, WMARK_URL]
    mock_update.return_value = {"_id": FAKE_IMAGE_ID, "image_url": ORIG_URL, "watermarked_image_url": WMARK_URL}

    await predict(**{**PREDICT_KWARGS, "user_id": "guest_abc123"})

    mock_guest_credits.find_one_and_update.assert_called_once()


@patch("api.controllers.generate_controller.guest_credits_col")
async def test_generate_guest_exhausted_quota_raises_403(mock_guest_credits):
    """A guest that has used all free credits must get a 403."""
    mock_guest_credits.find_one_and_update = AsyncMock(
        return_value={"_id": "guest_abc123", "used": 4}  # > GUEST_FREE_CREDITS (3)
    )
    mock_guest_credits.update_one = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await predict(**{**PREDICT_KWARGS, "user_id": "guest_abc123"})

    assert exc_info.value.status_code == 403
    assert "credits" in exc_info.value.detail.lower()
    mock_guest_credits.update_one.assert_called_once()  # undo increment


# ---------------------------------------------------------------------------- #
#               TEST 2: SUCCESSFUL STORAGE OF THE IMAGE                        #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_storage_creates_image_doc(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """predict() must insert an image document into MongoDB."""
    await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    mock_create_doc.assert_called_once()
    call_kwargs = mock_create_doc.call_args
    # Verify core fields are passed through
    assert call_kwargs.args[4] == FAKE_IMAGE_ID   # user_id
    assert call_kwargs.args[5] == PREDICT_KWARGS["prompt"]
    assert call_kwargs.args[2] == PREDICT_KWARGS["website"]


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_storage_uploads_to_both_s3_buckets(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Both original and watermarked images must be uploaded to their respective S3 buckets."""
    _, mocks = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    assert mocks["upload"].call_count == 2
    bucket_names = [call.args[2] for call in mocks["upload"].call_args_list]
    assert "qrartimages" in bucket_names
    assert "qrartimageswatermarked" in bucket_names


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_storage_updates_doc_with_urls(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """After upload, update_image must be called with both S3 URLs."""
    _, mocks = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    mocks["update"].assert_called_once()
    update_data = mocks["update"].call_args.args[1]
    assert "image_url" in update_data
    assert "watermarked_image_url" in update_data
    assert update_data["image_url"] == ORIG_URL
    assert update_data["watermarked_image_url"] == WMARK_URL


# ---------------------------------------------------------------------------- #
#                         TEST 3: ERROR PATHS                                  #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_predict_novita_failure_raises_500(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
):
    """A failed Novita task (status != SUCCEED) must surface as a 500."""
    mock_download.return_value = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")

    img2img_result = MagicMock()
    img2img_result.task.task_id = "novita-task-fail"

    failed_task = MagicMock()
    failed_task.task.status = V3TaskResponseStatus.TASK_STATUS_FAILED
    failed_task.task.reason = "out of memory"

    mock_novita_client.img2img_v3.return_value = img2img_result
    mock_novita_client.wait_for_task_v3.return_value = failed_task

    with pytest.raises(HTTPException) as exc_info:
        await predict(**PREDICT_KWARGS)

    assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------- #
#          TEST 4: IMAGE DOWNLOAD IS ASYNC + TIMEOUT-BOUNDED (QRAI-39)         #
# ---------------------------------------------------------------------------- #

def _mock_async_client(mock_client_class, response):
    """Wire an httpx.AsyncClient mock to behave as an async context manager
    whose .get() resolves to `response`."""
    mock_client = MagicMock()
    mock_client.get = AsyncMock(return_value=response)
    mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client_class.return_value.__aexit__ = AsyncMock(return_value=False)
    return mock_client


@patch("api.controllers.generate_controller.httpx.AsyncClient")
async def test_download_image_bytes_uses_timeout_and_returns_content(mock_client_class):
    """The download must run through an httpx.AsyncClient constructed with an
    explicit timeout, await the GET, and return the response bytes — so a slow
    upstream can never block the event loop indefinitely."""
    png = _white_png_bytes()
    response = MagicMock()
    response.content = png
    mock_client = _mock_async_client(mock_client_class, response)

    result = await download_image_bytes("http://novita.example/img.png")

    assert result == png
    # Client must be given an explicit (non-default/unbounded) timeout.
    assert mock_client_class.call_args.kwargs["timeout"] is IMAGE_DOWNLOAD_TIMEOUT
    mock_client.get.assert_awaited_once_with("http://novita.example/img.png")
    response.raise_for_status.assert_called_once()


@patch("api.controllers.generate_controller.httpx.AsyncClient")
async def test_download_image_bytes_raises_on_http_error(mock_client_class):
    """A non-2xx download must propagate as an exception so predict() surfaces a 500."""
    response = MagicMock()
    response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "404", request=MagicMock(), response=MagicMock()
    )
    _mock_async_client(mock_client_class, response)

    with pytest.raises(httpx.HTTPStatusError):
        await download_image_bytes("http://novita.example/missing.png")

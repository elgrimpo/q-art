import concurrent.futures
import pytest
from io import BytesIO
from PIL import Image
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from novita_client import V3TaskResponseStatus

from api.controllers.generate_controller import predict


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


def _resolved_future(result):
    """Return a concurrent.futures.Future that is already resolved."""
    f = concurrent.futures.Future()
    f.set_result(result)
    return f


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


def _setup_executor(mock_executor_class, img2img_result, task_result):
    mock_executor = MagicMock()
    mock_executor_class.return_value.__enter__.return_value = mock_executor
    mock_executor_class.return_value.__exit__.return_value = False
    mock_executor.submit.side_effect = [
        _resolved_future(img2img_result),
        _resolved_future(task_result),
    ]
    return mock_executor


# ---------------------------------------------------------------------------- #
#                          SHARED PATCH STACK                                  #
# ---------------------------------------------------------------------------- #
# All tests in this file patch the same 8 external dependencies.
# We stack them here as module-level decorators on a base fixture so each test
# only needs to declare the args it cares about.

_PATCHES = [
    patch("api.controllers.generate_controller.users"),
    patch("concurrent.futures.ProcessPoolExecutor"),
    patch("api.controllers.generate_controller.requests.get"),
    patch("api.controllers.generate_controller.create_watermark"),
    patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock),
    patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock),
    patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock),
    patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock),
]


async def _run_predict(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Wire up all mocks and call predict(). Returns (result, mocks)."""
    img2img_result, task_result = _build_novita_mocks()
    _setup_executor(mock_executor_class, img2img_result, task_result)

    mock_users.find_one_and_update = AsyncMock(return_value={"_id": FAKE_IMAGE_ID, "credits": 10})
    mock_get.return_value.content = _white_png_bytes()
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
        "executor": mock_executor_class,
        "get": mock_get,
    }


# ---------------------------------------------------------------------------- #
#               TEST 1: ABILITY TO GENERATE AN IMAGE                           #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_generate_returns_image_urls(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    result, _ = await _run_predict(
        mock_users, mock_executor_class, mock_get, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    assert result["image_url"] == ORIG_URL
    assert result["watermarked_image_url"] == WMARK_URL


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_generate_calls_novita_twice(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Novita executor.submit is called once for img2img_v3 and once for wait_for_task_v3."""
    _, mocks = await _run_predict(
        mock_users, mock_executor_class, mock_get, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    executor = mocks["executor"].return_value.__enter__.return_value
    assert executor.submit.call_count == 2


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_generate_checks_user_credits(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """For non-guest users, predict() must query the DB for credits."""
    await _run_predict(
        mock_users, mock_executor_class, mock_get, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )

    mock_users.find_one_and_update.assert_called_once()


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.guest_credits_col")
@patch("api.controllers.generate_controller.users")
async def test_generate_guest_skips_db_credit_check(
    mock_users,
    mock_guest_credits,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Guest users must use the guest_credits quota, not the users collection."""
    img2img_result, task_result = _build_novita_mocks()
    _setup_executor(mock_executor_class, img2img_result, task_result)
    mock_users.find_one = AsyncMock(return_value=None)
    mock_guest_credits.find_one_and_update = AsyncMock(return_value={"_id": "guest_abc123", "used": 1})
    mock_get.return_value.content = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")
    mock_create_doc.return_value = FAKE_IMAGE_ID
    mock_upload.side_effect = [ORIG_URL, WMARK_URL]
    mock_update.return_value = {"_id": FAKE_IMAGE_ID, "image_url": ORIG_URL, "watermarked_image_url": WMARK_URL}

    await predict(**{**PREDICT_KWARGS, "user_id": "guest_abc123"})

    mock_users.find_one.assert_not_called()
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
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_storage_creates_image_doc(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """predict() must insert an image document into MongoDB."""
    await _run_predict(
        mock_users, mock_executor_class, mock_get, mock_create_watermark,
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
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_storage_uploads_to_both_s3_buckets(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """Both original and watermarked images must be uploaded to their respective S3 buckets."""
    _, mocks = await _run_predict(
        mock_users, mock_executor_class, mock_get, mock_create_watermark,
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
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_storage_updates_doc_with_urls(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """After upload, update_image must be called with both S3 URLs."""
    _, mocks = await _run_predict(
        mock_users, mock_executor_class, mock_get, mock_create_watermark,
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

@patch("api.controllers.generate_controller.users")
async def test_predict_insufficient_credits_raises_403(mock_users):
    """A user with 0 credits must get a 403, not a 500."""
    mock_users.find_one_and_update = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await predict(**PREDICT_KWARGS)

    assert exc_info.value.status_code == 403
    assert "credits" in exc_info.value.detail.lower()


@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.requests.get")
@patch("concurrent.futures.ProcessPoolExecutor")
@patch("api.controllers.generate_controller.users")
async def test_predict_novita_failure_raises_500(
    mock_users,
    mock_executor_class,
    mock_get,
    mock_create_watermark,
):
    """A failed Novita task (status != SUCCEED) must surface as a 500."""
    mock_users.find_one_and_update = AsyncMock(return_value={"_id": FAKE_IMAGE_ID, "credits": 10})
    mock_get.return_value.content = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")

    img2img_result = MagicMock()
    img2img_result.task.task_id = "novita-task-fail"

    failed_task = MagicMock()
    failed_task.task.status = V3TaskResponseStatus.TASK_STATUS_FAILED
    failed_task.task.reason = "out of memory"

    _setup_executor(mock_executor_class, img2img_result, failed_task)

    with pytest.raises(HTTPException) as exc_info:
        await predict(**PREDICT_KWARGS)

    assert exc_info.value.status_code == 500

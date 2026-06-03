import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, call, patch
from bson import ObjectId
from pymongo import DESCENDING, ASCENDING

from fastapi import HTTPException

from api.controllers.images_controller import toggle_like, delete_image, get_images


FAKE_IMAGE_ID = "507f1f77bcf86cd799439011"
FAKE_USER_ID = "user_abc123"


def _mock_s3_session():
    mock_s3_client = AsyncMock()
    mock_s3_ctx = AsyncMock()
    mock_s3_ctx.__aenter__ = AsyncMock(return_value=mock_s3_client)
    mock_s3_ctx.__aexit__ = AsyncMock(return_value=False)
    mock_session = MagicMock()
    mock_session.client.return_value = mock_s3_ctx
    return mock_session, mock_s3_client


# ---------------------------------------------------------------------------- #
#                              TOGGLE LIKE                                      #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.images_controller.images")
async def test_toggle_like_adds_like_when_not_yet_liked(mock_images):
    """Calling toggle_like for a user not in likes must append their userId."""
    mock_images.find_one = AsyncMock(return_value={
        "_id": ObjectId(FAKE_IMAGE_ID),
        "likes": [],
    })
    mock_images.update_one = AsyncMock()

    result = await toggle_like(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert result == {"message": "Like toggled successfully"}
    update_call = mock_images.update_one.call_args
    updated_likes = update_call.args[1]["$set"]["likes"]
    assert any(like["userId"] == FAKE_USER_ID for like in updated_likes)


@patch("api.controllers.images_controller.images")
async def test_toggle_like_removes_like_when_already_liked(mock_images):
    """Calling toggle_like for a user already in likes must remove their entry."""
    mock_images.find_one = AsyncMock(return_value={
        "_id": ObjectId(FAKE_IMAGE_ID),
        "likes": [{"userId": FAKE_USER_ID, "time": datetime.utcnow()}],
    })
    mock_images.update_one = AsyncMock()

    await toggle_like(FAKE_IMAGE_ID, FAKE_USER_ID)

    update_call = mock_images.update_one.call_args
    updated_likes = update_call.args[1]["$set"]["likes"]
    assert not any(like["userId"] == FAKE_USER_ID for like in updated_likes)


@patch("api.controllers.images_controller.images")
async def test_toggle_like_image_not_found_returns_404(mock_images):
    """When the image doesn't exist, toggle_like must return a 404 tuple."""
    mock_images.find_one = AsyncMock(return_value=None)

    result = await toggle_like(FAKE_IMAGE_ID, FAKE_USER_ID)

    # The controller returns (dict, 404) for missing images
    assert result[1] == 404


# ---------------------------------------------------------------------------- #
#                               DELETE IMAGE                                   #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.images_controller.s3_session")
@patch("api.controllers.images_controller.db")
async def test_delete_image_removes_from_s3_and_mongo(mock_db, mock_s3_session):
    """Happy path: both S3 objects deleted and MongoDB document removed."""
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client

    mock_collection = AsyncMock()
    mock_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    result = await delete_image(FAKE_IMAGE_ID)

    assert mock_s3_client.delete_object.call_count == 2
    bucket_names = {c.kwargs["Bucket"] for c in mock_s3_client.delete_object.call_args_list}
    assert "qrartimages" in bucket_names
    assert "qrartimageswatermarked" in bucket_names
    mock_collection.delete_one.assert_called_once()
    assert result == {"message": "Image and document deleted successfully"}


@patch("api.controllers.images_controller.s3_session")
@patch("api.controllers.images_controller.db")
async def test_delete_image_not_found_raises_404(mock_db, mock_s3_session):
    """When MongoDB finds nothing to delete, a 404 must be raised."""
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client

    mock_collection = AsyncMock()
    mock_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=0))
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    with pytest.raises(HTTPException) as exc_info:
        await delete_image(FAKE_IMAGE_ID)

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------- #
#                          GET IMAGES — PAGINATION & SORTING                   #
# ---------------------------------------------------------------------------- #

def _mock_cursor(results=None):
    """Motor cursor mock: supports .sort().skip().limit().to_list() chaining."""
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=results or [])
    return cursor


@patch("api.controllers.images_controller.db")
async def test_get_images_page_1_skips_zero(mock_db):
    """Page 1 must not skip any documents (offset = 0)."""
    cursor = _mock_cursor()
    mock_db.__getitem__.return_value.find.return_value = cursor

    await get_images(page=1, images_per_page=12)

    cursor.skip.assert_called_once_with(0)


@patch("api.controllers.images_controller.db")
async def test_get_images_page_2_skips_12(mock_db):
    """Page 2 with 12-per-page must skip exactly 12 documents."""
    cursor = _mock_cursor()
    mock_db.__getitem__.return_value.find.return_value = cursor

    await get_images(page=2, images_per_page=12)

    cursor.skip.assert_called_once_with(12)


@patch("api.controllers.images_controller.db")
async def test_get_images_custom_page_size(mock_db):
    """Limit must match images_per_page, not a hardcoded value."""
    cursor = _mock_cursor()
    mock_db.__getitem__.return_value.find.return_value = cursor

    await get_images(page=1, images_per_page=6)

    cursor.limit.assert_called_once_with(6)


@patch("api.controllers.images_controller.db")
async def test_get_images_sort_newest_is_descending(mock_db):
    """sort_by='Newest' must sort created_at DESCENDING."""
    cursor = _mock_cursor()
    mock_db.__getitem__.return_value.find.return_value = cursor

    await get_images(page=1, sort_by="Newest")

    sort_arg = cursor.sort.call_args.args[0]
    assert sort_arg == [("created_at", DESCENDING)]


@patch("api.controllers.images_controller.db")
async def test_get_images_sort_oldest_is_ascending(mock_db):
    """sort_by='Oldest' must sort created_at ASCENDING."""
    cursor = _mock_cursor()
    mock_db.__getitem__.return_value.find.return_value = cursor

    await get_images(page=1, sort_by="Oldest")

    sort_arg = cursor.sort.call_args.args[0]
    assert sort_arg == [("created_at", ASCENDING)]


@patch("api.controllers.images_controller.db")
async def test_get_images_sort_most_liked(mock_db):
    """sort_by='Most Liked' must sort by likes DESCENDING then created_at DESCENDING."""
    cursor = _mock_cursor()
    mock_db.__getitem__.return_value.find.return_value = cursor

    await get_images(page=1, sort_by="Most Liked")

    sort_arg = cursor.sort.call_args.args[0]
    assert sort_arg == [("likes", DESCENDING), ("created_at", DESCENDING)]

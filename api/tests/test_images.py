import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, call, patch
from bson import ObjectId
from pymongo import DESCENDING, ASCENDING

from fastapi import HTTPException

from api.controllers.images_controller import toggle_like, delete_image, get_images, get_image


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
async def test_toggle_like_image_not_found_raises_404(mock_images):
    """When the image doesn't exist, toggle_like must raise a 404 HTTPException."""
    mock_images.find_one = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await toggle_like(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------- #
#                               DELETE IMAGE                                   #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.images_controller.s3_session")
@patch("api.controllers.images_controller.db")
@patch("api.controllers.images_controller.images")
async def test_delete_image_removes_from_s3_and_mongo(mock_images, mock_db, mock_s3_session):
    """Happy path: both S3 objects deleted and MongoDB document removed."""
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client

    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": FAKE_USER_ID})

    mock_collection = AsyncMock()
    mock_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    result = await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert mock_s3_client.delete_object.call_count == 2
    bucket_names = {c.kwargs["Bucket"] for c in mock_s3_client.delete_object.call_args_list}
    assert "qrartimages" in bucket_names
    assert "qrartimageswatermarked" in bucket_names
    mock_collection.delete_one.assert_called_once()
    assert result == {"message": "Image and document deleted successfully"}


@patch("api.controllers.images_controller.images")
async def test_delete_image_not_found_raises_404(mock_images):
    """When the image doesn't exist in MongoDB, a 404 must be raised before S3 deletion."""
    mock_images.find_one = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert exc_info.value.status_code == 404


@patch("api.controllers.images_controller.db")
@patch("api.controllers.images_controller.images")
@patch("api.controllers.images_controller.s3_session")
async def test_delete_image_rejects_non_owner(mock_s3_session, mock_images, mock_db):
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": "someone_else"})

    with pytest.raises(HTTPException) as exc:
        await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert exc.value.status_code == 403
    mock_s3_client.delete_object.assert_not_called()


@patch("api.controllers.images_controller.db")
@patch("api.controllers.images_controller.images")
@patch("api.controllers.images_controller.s3_session")
async def test_delete_image_allows_owner(mock_s3_session, mock_images, mock_db):
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": FAKE_USER_ID})
    delete_result = MagicMock(deleted_count=1)
    mock_db.__getitem__.return_value.delete_one = AsyncMock(return_value=delete_result)

    result = await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert result == {"message": "Image and document deleted successfully"}
    assert mock_s3_client.delete_object.call_count == 2


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
    """sort_by='Most Liked' uses aggregation to sort by likes array length DESCENDING."""
    mock_collection = MagicMock()
    agg_cursor = MagicMock()
    agg_cursor.to_list = AsyncMock(return_value=[])
    mock_collection.aggregate.return_value = agg_cursor
    mock_db.__getitem__.return_value = mock_collection

    await get_images(page=1, sort_by="Most Liked")

    mock_collection.aggregate.assert_called_once()
    pipeline = mock_collection.aggregate.call_args.args[0]

    add_fields = next(s for s in pipeline if "$addFields" in s)
    assert "likes_count" in add_fields["$addFields"]

    sort_stage = next(s for s in pipeline if "$sort" in s)
    assert sort_stage["$sort"]["likes_count"] == DESCENDING
    assert sort_stage["$sort"]["created_at"] == DESCENDING


# ---------------------------------------------------------------------------- #
#                           GET IMAGE BY ID                                    #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.images_controller.db")
async def test_get_image_found(mock_db):
    """get_image returns the document with _id converted to str."""
    image_doc = {
        "_id": ObjectId(FAKE_IMAGE_ID),
        "user_id": FAKE_USER_ID,
        "prompt": "a dragon",
    }
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=image_doc)

    result = await get_image(FAKE_IMAGE_ID)

    assert result["_id"] == FAKE_IMAGE_ID
    assert result["prompt"] == "a dragon"
    mock_db.__getitem__.return_value.find_one.assert_awaited_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}
    )


@patch("api.controllers.images_controller.db")
async def test_get_image_not_found_raises_404(mock_db):
    """get_image raises HTTPException 404 when no document matches."""
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await get_image(FAKE_IMAGE_ID)

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------- #
#                        DELETE IMAGE — ADMIN BYPASS                           #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.images_controller.db")
@patch("api.controllers.images_controller.images")
@patch("api.controllers.images_controller.s3_session")
async def test_delete_image_admin_can_delete_others_image(mock_s3_session, mock_images, mock_db):
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": "someone_else"})
    delete_result = MagicMock(deleted_count=1)
    mock_db.__getitem__.return_value.delete_one = AsyncMock(return_value=delete_result)

    result = await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID, is_admin=True)

    assert result == {"message": "Image and document deleted successfully"}
    assert mock_s3_client.delete_object.call_count == 2


@patch("api.controllers.images_controller.images")
async def test_delete_image_non_admin_non_owner_still_403(mock_images):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": "someone_else"})
    with pytest.raises(HTTPException) as exc:
        await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID, is_admin=False)
    assert exc.value.status_code == 403


# ---------------------------------------------------------------------------- #
#                              TOGGLE FEATURED                                  #
# ---------------------------------------------------------------------------- #

from api.controllers.images_controller import toggle_featured


@patch("api.controllers.images_controller.images")
async def test_toggle_featured_sets_true_when_false(mock_images):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": False})
    mock_images.update_one = AsyncMock()

    result = await toggle_featured(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"featured": True}}
    )
    assert result == {"message": "Featured toggled successfully", "featured": True}


@patch("api.controllers.images_controller.images")
async def test_toggle_featured_sets_false_when_true(mock_images):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True})
    mock_images.update_one = AsyncMock()

    result = await toggle_featured(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"featured": False, "is_hero": False}}
    )
    assert result == {"message": "Featured toggled successfully", "featured": False}


@patch("api.controllers.images_controller.images")
async def test_toggle_featured_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await toggle_featured(FAKE_IMAGE_ID)
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------- #
#                                TOGGLE HERO                                    #
# ---------------------------------------------------------------------------- #

from api.controllers.images_controller import toggle_hero


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_sets_true_when_featured_and_not_hero(mock_images):
    mock_images.find_one = AsyncMock(
        return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True, "is_hero": False}
    )
    mock_images.update_one = AsyncMock()

    result = await toggle_hero(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"is_hero": True}}
    )
    assert result == {"message": "Hero toggled successfully", "is_hero": True}


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_sets_false_when_true(mock_images):
    mock_images.find_one = AsyncMock(
        return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True, "is_hero": True}
    )
    mock_images.update_one = AsyncMock()

    result = await toggle_hero(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"is_hero": False}}
    )
    assert result == {"message": "Hero toggled successfully", "is_hero": False}


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_rejects_when_not_featured(mock_images):
    mock_images.find_one = AsyncMock(
        return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": False, "is_hero": False}
    )
    with pytest.raises(HTTPException) as exc:
        await toggle_hero(FAKE_IMAGE_ID)
    assert exc.value.status_code == 400


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await toggle_hero(FAKE_IMAGE_ID)
    assert exc.value.status_code == 404

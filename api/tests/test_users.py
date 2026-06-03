import pytest
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock, call, patch

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from api.controllers.users_controller import (
    authenticate_user,
    get_user_info,
    increment_user_count,
)
from api.schemas.schemas import AuthProvider, UserAuth


# ---------------------------------------------------------------------------- #
#                                   FIXTURES                                   #
# ---------------------------------------------------------------------------- #

FAKE_USER_ID = "507f1f77bcf86cd799439011"
FAKE_GUEST_ID = "guest_session_xyz"

GOOGLE_PROVIDER = AuthProvider(provider="google", providerId="google_123")
GITHUB_PROVIDER = AuthProvider(provider="github", providerId="github_456")


def _db_user(**overrides):
    base = {
        "_id": ObjectId(FAKE_USER_ID),
        "name": "Test User",
        "email": "test@example.com",
        "auth_providers": [{"provider": "google", "providerId": "google_123"}],
        "picture": None,
        "image_counts": {},
        "credits": 10,
        "payment_history": [],
    }
    base.update(overrides)
    return base


def _user_auth(**overrides):
    defaults = dict(
        name="Test User",
        email="test@example.com",
        auth_providers=[GOOGLE_PROVIDER],
        guest_id=None,
        picture=None,
    )
    defaults.update(overrides)
    return UserAuth(**defaults)


# ---------------------------------------------------------------------------- #
#                              GET USER INFO                                   #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.users_controller.users")
async def test_get_user_info_returns_user_when_found(mock_users):
    mock_users.find_one = AsyncMock(return_value=_db_user())

    result = await get_user_info("test@example.com")

    assert result.email == "test@example.com"
    assert result.name == "Test User"
    assert result.credits == 10


@patch("api.controllers.users_controller.users")
async def test_get_user_info_raises_404_when_not_found(mock_users):
    mock_users.find_one = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await get_user_info("nobody@example.com")

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------- #
#                            AUTHENTICATE USER                                 #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.users_controller.images")
@patch("api.controllers.users_controller.users")
async def test_authenticate_creates_new_user(mock_users, mock_images):
    """First-time login: a new user document is inserted with 10 starter credits."""
    mock_users.find_one = AsyncMock(return_value=None)
    mock_users.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId(FAKE_USER_ID)))
    mock_images.update_many = AsyncMock()

    response = await authenticate_user(_user_auth())

    mock_users.insert_one.assert_called_once()
    inserted_doc = mock_users.insert_one.call_args.args[0]
    assert inserted_doc["email"] == "test@example.com"
    assert inserted_doc["credits"] == 10
    assert isinstance(response, JSONResponse)


@patch("api.controllers.users_controller.images")
@patch("api.controllers.users_controller.users")
async def test_authenticate_existing_user_same_provider_no_update(mock_users, mock_images):
    """Returning user logging in with the same provider: auth_providers must not be modified."""
    mock_users.find_one = AsyncMock(return_value=_db_user())
    mock_users.update_one = AsyncMock()
    mock_images.update_many = AsyncMock()

    await authenticate_user(_user_auth(auth_providers=[GOOGLE_PROVIDER]))

    # update_one should NOT be called to push a new provider
    mock_users.update_one.assert_not_called()


@patch("api.controllers.users_controller.images")
@patch("api.controllers.users_controller.users")
async def test_authenticate_existing_user_new_provider_adds_it(mock_users, mock_images):
    """Returning user logging in with a new OAuth provider: the provider is appended."""
    mock_users.find_one = AsyncMock(return_value=_db_user())  # only has google
    mock_users.update_one = AsyncMock()
    mock_images.update_many = AsyncMock()

    await authenticate_user(_user_auth(auth_providers=[GITHUB_PROVIDER]))

    mock_users.update_one.assert_called_once()
    push_op = mock_users.update_one.call_args.args[1]
    assert push_op["$push"]["auth_providers"]["provider"] == "github"


@patch("api.controllers.users_controller.images")
@patch("api.controllers.users_controller.users")
async def test_authenticate_new_user_with_guest_id_transfers_images(mock_users, mock_images):
    """On first login with a guest_id, images created as guest must be re-owned."""
    mock_users.find_one = AsyncMock(return_value=None)
    insert_result = MagicMock(inserted_id=ObjectId(FAKE_USER_ID))
    mock_users.insert_one = AsyncMock(return_value=insert_result)
    mock_images.update_many = AsyncMock()

    await authenticate_user(_user_auth(guest_id=FAKE_GUEST_ID))

    mock_images.update_many.assert_called_once()
    filter_q, update_op = mock_images.update_many.call_args.args
    assert filter_q["user_id"] == FAKE_GUEST_ID
    assert update_op["$set"]["user_id"] == str(insert_result.inserted_id)


@patch("api.controllers.users_controller.images")
@patch("api.controllers.users_controller.users")
async def test_authenticate_existing_user_with_guest_id_transfers_images(mock_users, mock_images):
    """Returning user logging in after a guest session: guest images transferred to their account."""
    existing = _db_user()
    mock_users.find_one = AsyncMock(return_value=existing)
    mock_users.update_one = AsyncMock()
    mock_images.update_many = AsyncMock()

    await authenticate_user(_user_auth(guest_id=FAKE_GUEST_ID))

    mock_images.update_many.assert_called_once()
    filter_q, update_op = mock_images.update_many.call_args.args
    assert filter_q["user_id"] == FAKE_GUEST_ID
    assert update_op["$set"]["user_id"] == str(existing["_id"])


@patch("api.controllers.users_controller.images")
@patch("api.controllers.users_controller.users")
async def test_authenticate_ignores_invalid_guest_id(mock_users, mock_images):
    """A guest_id that doesn't start with 'guest_' must not trigger image transfer."""
    mock_users.find_one = AsyncMock(return_value=None)
    mock_users.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId(FAKE_USER_ID)))
    mock_images.update_many = AsyncMock()

    await authenticate_user(_user_auth(guest_id="not-a-guest-id"))

    mock_images.update_many.assert_not_called()


# ---------------------------------------------------------------------------- #
#                          INCREMENT USER COUNT                                #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.users_controller.db")
async def test_increment_skips_db_for_guest_user(mock_db):
    """Guest users must never trigger any database write."""
    await increment_user_count("guest_abc123", {"generate": "1"}, 1)

    mock_db.__getitem__.assert_not_called()


@patch("api.controllers.users_controller.db")
async def test_increment_deducts_credits(mock_db):
    """Credits must be decremented by the exact amount passed."""
    mock_collection = AsyncMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    await increment_user_count(FAKE_USER_ID, {"generate": "1"}, 1)

    credit_update = next(
        c for c in mock_collection.update_one.call_args_list
        if "$inc" in c.args[1] and "credits" in c.args[1]["$inc"]
    )
    assert credit_update.args[1]["$inc"]["credits"] == -1


@patch("api.controllers.users_controller.db")
async def test_increment_generate_increments_count(mock_db):
    """A generate action must increment the image_counts.year.month.generate field."""
    mock_collection = AsyncMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    await increment_user_count(FAKE_USER_ID, {"generate": "1"}, 1)

    generate_call = next(
        c for c in mock_collection.update_one.call_args_list
        if any("generate" in k for k in c.args[1].get("$inc", {}).keys())
    )
    assert generate_call is not None


@patch("api.controllers.users_controller.db")
async def test_increment_upscale_increments_count(mock_db):
    """An upscale action must increment the image_counts.year.month.upscale field."""
    mock_collection = AsyncMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    await increment_user_count(FAKE_USER_ID, {"upscale_resize": 1024}, 15)

    upscale_call = next(
        c for c in mock_collection.update_one.call_args_list
        if any("upscale" in k for k in c.args[1].get("$inc", {}).keys())
    )
    assert upscale_call is not None


@patch("api.controllers.users_controller.db")
async def test_increment_download_increments_count(mock_db):
    """A download action must increment the image_counts.year.month.download field."""
    mock_collection = AsyncMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)

    await increment_user_count(FAKE_USER_ID, {"download": True}, 10)

    download_call = next(
        c for c in mock_collection.update_one.call_args_list
        if any("download" in k for k in c.args[1].get("$inc", {}).keys())
    )
    assert download_call is not None

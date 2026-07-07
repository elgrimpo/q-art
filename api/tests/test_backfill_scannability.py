from unittest.mock import AsyncMock, MagicMock, patch

from bson import ObjectId

from api.scripts.backfill_scannability import main

FAKE_IMAGE_ID = ObjectId("507f1f77bcf86cd799439011")


def _mock_mongo_client(docs):
    """Build a mock AsyncIOMotorClient whose images collection yields `docs`."""
    mock_images = MagicMock()
    mock_images.count_documents = AsyncMock(return_value=len(docs))
    mock_images.update_one = AsyncMock()

    async def _find_iter(*_args, **_kwargs):
        for d in docs:
            yield d

    mock_images.find = MagicMock(return_value=_find_iter())

    mock_client = MagicMock()
    mock_client.get_database.return_value.get_collection.return_value = mock_images
    mock_client.close = MagicMock()
    return mock_client, mock_images


def _mock_http_get(content=b"fake-bytes"):
    mock_resp = MagicMock()
    mock_resp.content = content
    mock_resp.raise_for_status = MagicMock()
    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)
    return mock_http


@patch("api.scripts.backfill_scannability.structural_score")
@patch("api.scripts.backfill_scannability.Image")
@patch("api.scripts.backfill_scannability.httpx.AsyncClient")
@patch("api.scripts.backfill_scannability.motor.AsyncIOMotorClient")
async def test_main_scores_against_normalized_content(
    mock_motor_client, mock_httpx_client, mock_image_module, mock_structural_score
):
    """Regression test: the actual embedded QR (and generation-time scoring)
    always uses normalize_qr_url(content). Scoring against the raw content
    field compares the real image against the WRONG expected QR pattern for
    any URL with a 'www.', protocol prefix, or trailing slash — silently
    corrupting an already-correct score with a near-zero floor value."""
    doc = {
        "_id": FAKE_IMAGE_ID,
        "image_url": "http://example.com/img.png",
        "content": "www.example.com/",
    }
    mock_client, mock_images = _mock_mongo_client([doc])
    mock_motor_client.return_value = mock_client

    mock_http = _mock_http_get()
    mock_httpx_client.return_value.__aenter__ = AsyncMock(return_value=mock_http)
    mock_httpx_client.return_value.__aexit__ = AsyncMock(return_value=False)

    fake_img = MagicMock()
    mock_image_module.open.return_value = fake_img

    mock_structural_score.return_value = MagicMock(score=94.7)

    await main()

    mock_structural_score.assert_called_once_with(fake_img, "example.com")
    mock_images.update_one.assert_called_once_with(
        {"_id": FAKE_IMAGE_ID}, {"$set": {"scannability_score": 94.7}}
    )


@patch("api.scripts.backfill_scannability.structural_score")
@patch("api.scripts.backfill_scannability.Image")
@patch("api.scripts.backfill_scannability.httpx.AsyncClient")
@patch("api.scripts.backfill_scannability.motor.AsyncIOMotorClient")
async def test_main_leaves_already_normalized_content_unchanged(
    mock_motor_client, mock_httpx_client, mock_image_module, mock_structural_score
):
    doc = {
        "_id": FAKE_IMAGE_ID,
        "image_url": "http://example.com/img.png",
        "content": "example.com",
    }
    mock_client, mock_images = _mock_mongo_client([doc])
    mock_motor_client.return_value = mock_client

    mock_http = _mock_http_get()
    mock_httpx_client.return_value.__aenter__ = AsyncMock(return_value=mock_http)
    mock_httpx_client.return_value.__aexit__ = AsyncMock(return_value=False)

    fake_img = MagicMock()
    mock_image_module.open.return_value = fake_img

    mock_structural_score.return_value = MagicMock(score=94.7)

    await main()

    mock_structural_score.assert_called_once_with(fake_img, "example.com")

import pytest
from unittest.mock import AsyncMock, patch
from bson import ObjectId
from fastapi import HTTPException

from api.controllers.styles_controller import get_style

FAKE_STYLE_ID = "507f1f77bcf86cd799439099"

FAKE_STYLE_DOC = {
    "_id": ObjectId(FAKE_STYLE_ID),
    "style_key": "ukiyo-e",
    "version": 1,
    "is_active": True,
    "title": "Ukiyo-e",
    "prompt": "ukiyo-e, woodblock print",
    "loras": [{"model_name": "LAS_17554", "strength": 0.7}],
    "style_modifier": -1,
    "sd_model": "colorful_v31_62333.safetensors",
}


@patch("api.controllers.styles_controller.styles.find_one", new_callable=AsyncMock)
async def test_get_style_returns_resolved_style(mock_find_one):
    mock_find_one.return_value = FAKE_STYLE_DOC
    style = await get_style(FAKE_STYLE_ID)
    assert style.title == "Ukiyo-e"
    assert style.id == FAKE_STYLE_ID
    assert style.loras[0].model_name == "LAS_17554"
    assert style.loras[0].strength == 0.7
    assert style.sd_model == "colorful_v31_62333.safetensors"


@patch("api.controllers.styles_controller.styles.find_one", new_callable=AsyncMock)
async def test_get_style_looks_up_by_object_id(mock_find_one):
    mock_find_one.return_value = FAKE_STYLE_DOC
    await get_style(FAKE_STYLE_ID)
    mock_find_one.assert_awaited_once_with({"_id": ObjectId(FAKE_STYLE_ID)})


@patch("api.controllers.styles_controller.styles.find_one", new_callable=AsyncMock)
async def test_get_style_raises_404_when_missing(mock_find_one):
    mock_find_one.return_value = None
    with pytest.raises(HTTPException) as exc_info:
        await get_style(FAKE_STYLE_ID)
    assert exc_info.value.status_code == 404


async def test_get_style_raises_400_for_malformed_id():
    with pytest.raises(HTTPException) as exc_info:
        await get_style("not-a-valid-object-id")
    assert exc_info.value.status_code == 400

import os
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from api.controllers.login_code_controller import (
    request_login_code,
    verify_login_code,
    _hash_code,
)

EMAIL = "user@example.com"


# ------------------------------ REQUEST CODE ------------------------------- #

@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_stores_hashed_code_and_sends(mock_codes, _idx, mock_send):
    mock_codes.find_one = AsyncMock(return_value=None)
    mock_codes.replace_one = AsyncMock()

    result = await request_login_code(EMAIL)

    assert isinstance(result, JSONResponse)
    mock_send.assert_awaited_once()
    sent_email, sent_code = mock_send.await_args.args
    assert sent_email == EMAIL
    assert len(sent_code) == 6 and sent_code.isdigit()

    stored = mock_codes.replace_one.await_args.args[1]
    # The plaintext code is never stored; only its hash.
    assert stored["code_hash"] == _hash_code(EMAIL, sent_code)
    assert stored["code_hash"] != sent_code
    assert stored["attempts"] == 0
    assert stored["expires_at"] > datetime.utcnow()


@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_enforces_resend_cooldown(mock_codes, _idx, mock_send):
    mock_codes.find_one = AsyncMock(return_value={
        "email": EMAIL,
        "last_sent_at": datetime.utcnow(),       # just sent
        "window_start": datetime.utcnow(),
        "send_count": 1,
    })
    mock_codes.replace_one = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await request_login_code(EMAIL)

    assert exc.value.status_code == 429
    assert exc.value.detail == "ResendCooldown"
    mock_send.assert_not_awaited()


@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_enforces_hourly_send_cap(mock_codes, _idx, mock_send):
    mock_codes.find_one = AsyncMock(return_value={
        "email": EMAIL,
        "last_sent_at": datetime.utcnow() - timedelta(minutes=5),  # past cooldown
        "window_start": datetime.utcnow() - timedelta(minutes=10), # window still open
        "send_count": 5,                                           # cap reached
    })
    mock_codes.replace_one = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await request_login_code(EMAIL)

    assert exc.value.status_code == 429
    assert exc.value.detail == "TooManyRequests"
    mock_send.assert_not_awaited()


@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_does_not_persist_when_send_fails(mock_codes, _idx, mock_send):
    """A Resend failure must not burn a rate-limit slot or start the cooldown."""
    mock_codes.find_one = AsyncMock(return_value=None)
    mock_codes.replace_one = AsyncMock()
    mock_send.side_effect = HTTPException(status_code=502, detail="EmailSendFailed")

    with pytest.raises(HTTPException) as exc:
        await request_login_code(EMAIL)

    assert exc.value.status_code == 502
    mock_codes.replace_one.assert_not_awaited()

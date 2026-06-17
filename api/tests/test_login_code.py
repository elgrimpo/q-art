import json
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
    MAX_ATTEMPTS,
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


# ------------------------------- VERIFY CODE ------------------------------- #

def _valid_doc(code, **overrides):
    base = {
        "email": EMAIL,
        "code_hash": _hash_code(EMAIL, code),
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
        "attempts": 0,
    }
    base.update(overrides)
    return base


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_success_returns_name_and_clears_code(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=_valid_doc("123456"))
    mock_codes.delete_one = AsyncMock()

    result = await verify_login_code(EMAIL, "123456")

    assert isinstance(result, JSONResponse)
    mock_codes.delete_one.assert_awaited_once_with({"email": EMAIL})
    body = json.loads(result.body)
    assert body["name"] == "user"


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_wrong_code_increments_attempts(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=_valid_doc("123456"))
    mock_codes.update_one = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "000000")

    assert exc.value.status_code == 400
    assert exc.value.detail == "InvalidCode"
    inc = mock_codes.update_one.await_args.args[1]
    assert inc["$inc"]["attempts"] == 1


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_no_code_is_invalid(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "123456")
    assert exc.value.detail == "InvalidCode"


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_expired_code(mock_codes):
    mock_codes.find_one = AsyncMock(
        return_value=_valid_doc("123456", expires_at=datetime.utcnow() - timedelta(seconds=1))
    )
    mock_codes.delete_one = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "123456")
    assert exc.value.detail == "CodeExpired"


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_locks_out_after_max_attempts(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=_valid_doc("123456", attempts=MAX_ATTEMPTS))
    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "123456")
    assert exc.value.detail == "TooManyAttempts"


# ------------------------------ ROUTE WIRING ------------------------------- #

@patch("api.main.request_login_code", new_callable=AsyncMock)
async def test_request_code_endpoint_delegates(mock_req):
    from api.main import request_code_endpoint
    from api.schemas.schemas import LoginCodeRequest

    await request_code_endpoint(LoginCodeRequest(email=EMAIL), _=None)
    mock_req.assert_awaited_once_with(EMAIL)


@patch("api.main.verify_login_code", new_callable=AsyncMock)
async def test_verify_code_endpoint_delegates(mock_verify):
    from api.main import verify_code_endpoint
    from api.schemas.schemas import LoginCodeVerify

    await verify_code_endpoint(LoginCodeVerify(email=EMAIL, code="123456"), _=None)
    mock_verify.assert_awaited_once_with(EMAIL, "123456")

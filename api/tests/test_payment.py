import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

import stripe
from fastapi import HTTPException

from api.controllers.payment_controller import (
    stripe_webhook,
    create_unlock_checkout_session,
)

FAKE_USER_ID = "507f1f77bcf86cd799439011"
FAKE_IMAGE_ID = "607f1f77bcf86cd799439022"
FAKE_PI = "pi_test_abc123"


def _mock_request(body=b'{"type":"test"}'):
    req = AsyncMock()
    req.body = AsyncMock(return_value=body)
    return req


def _unlock_event(image_id=FAKE_IMAGE_ID, user_id=FAKE_USER_ID, payment_intent=FAKE_PI, created=1700000000):
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "amount_total": 399,
                "metadata": {"image_id": image_id},
                "payment_intent": payment_intent,
                "created": created,
            }
        },
    }


# --- create_unlock_checkout_session ---

@patch("api.controllers.payment_controller.stripe.checkout.Session.create")
def test_create_unlock_checkout_returns_session_url(mock_create):
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc"
    mock_create.return_value = mock_session

    result = create_unlock_checkout_session(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert result == {"session_url": "https://checkout.stripe.com/pay/cs_test_abc"}
    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["metadata"]["image_id"] == FAKE_IMAGE_ID
    assert call_kwargs["client_reference_id"] == FAKE_USER_ID
    assert FAKE_IMAGE_ID in call_kwargs["success_url"]
    assert "{CHECKOUT_SESSION_ID}" in call_kwargs["success_url"]


@patch("api.controllers.payment_controller.stripe.checkout.Session.create")
def test_create_unlock_checkout_stripe_error_raises_500(mock_create):
    mock_create.side_effect = Exception("Stripe down")
    with pytest.raises(HTTPException) as exc_info:
        create_unlock_checkout_session(FAKE_IMAGE_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 500


# --- stripe_webhook (signature) ---

@patch("stripe.Webhook.construct_event",
       side_effect=stripe.error.SignatureVerificationError("Bad sig", "hdr"))
async def test_webhook_invalid_signature_returns_400(mock_construct):
    with pytest.raises(HTTPException) as exc_info:
        await stripe_webhook(_mock_request(), "bad-signature")
    assert exc_info.value.status_code == 400


# --- stripe_webhook (unlock path) ---

@patch("api.controllers.payment_controller.mark_image_unlock_paid", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_unlock_event_calls_mark_unlock_paid(mock_construct, mock_mark):
    mock_construct.return_value = _unlock_event(image_id=FAKE_IMAGE_ID)
    await stripe_webhook(_mock_request(), "valid-sig")
    mock_mark.assert_called_once_with(FAKE_IMAGE_ID)


@patch("api.controllers.payment_controller.mark_image_unlock_paid", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_unknown_event_type_ignored(mock_construct, mock_mark):
    mock_construct.return_value = {"type": "customer.subscription.created", "data": {"object": {}}}
    await stripe_webhook(_mock_request(), "valid-sig")
    mock_mark.assert_not_called()

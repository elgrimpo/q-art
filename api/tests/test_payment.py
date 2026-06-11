import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

import stripe
from bson import ObjectId
from fastapi import HTTPException

from api.controllers.payment_controller import stripe_webhook, PRICE_CREDITS_MAP
from api.controllers.users_controller import add_user_payment

# Use a real price ID from the map so tests reflect the actual product catalogue.
VALID_PRICE_ID = "price_1OpINoAaPyl1Ov3PufRg0KrR"   # 100 credits
VALID_CREDITS   = PRICE_CREDITS_MAP[VALID_PRICE_ID]
FAKE_USER_ID    = "507f1f77bcf86cd799439011"
FAKE_PI         = "pi_test_abc123"


def _mock_request(body=b'{"type":"test"}'):
    req = AsyncMock()
    req.body = AsyncMock(return_value=body)
    return req


def _checkout_event(user_id=FAKE_USER_ID, amount=999, product_id=VALID_PRICE_ID,
                    payment_intent=FAKE_PI, created=1700000000):
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "amount_total": amount,
                "metadata": {"product_id": product_id},
                "payment_intent": payment_intent,
                "created": created,
            }
        },
    }


# ---------------------------------------------------------------------------- #
#                          SIGNATURE VERIFICATION                              #
# ---------------------------------------------------------------------------- #

@patch("stripe.Webhook.construct_event",
       side_effect=stripe.error.SignatureVerificationError("Bad sig", "hdr"))
async def test_webhook_invalid_signature_returns_400(mock_construct):
    """A tampered or missing Stripe signature must return HTTP 400, not 200."""
    with pytest.raises(HTTPException) as exc_info:
        await stripe_webhook(_mock_request(), "bad-signature")

    assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------- #
#                       checkout.session.completed                             #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.payment_controller.add_user_payment", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_checkout_completed_calls_add_payment(mock_construct, mock_add_payment):
    """A completed checkout session must trigger add_user_payment with correct args."""
    mock_construct.return_value = _checkout_event(
        user_id="user_abc",
        amount=999,
        product_id=VALID_PRICE_ID,
        payment_intent="pi_xxx",
    )

    await stripe_webhook(_mock_request(), "valid-sig")

    mock_add_payment.assert_called_once()
    args = mock_add_payment.call_args.args
    assert args[0] == "user_abc"          # user_id
    assert args[1] == 999                 # transaction_amount
    assert args[2] == VALID_PRICE_ID     # product_id
    assert args[3] == VALID_CREDITS      # credit_amount — server-derived, not from metadata
    assert args[4] == "pi_xxx"           # payment_intent
    assert isinstance(args[5], datetime) # timestamp converted from unix


@patch("api.controllers.payment_controller.add_user_payment", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_credits_come_from_server_map_not_metadata(mock_construct, mock_add_payment):
    """Credits must be derived from PRICE_CREDITS_MAP, not from Stripe metadata."""
    mock_construct.return_value = _checkout_event(product_id=VALID_PRICE_ID)

    await stripe_webhook(_mock_request(), "valid-sig")

    assert mock_add_payment.call_args.args[3] == VALID_CREDITS


@patch("api.controllers.payment_controller.add_user_payment", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_unknown_product_id_skips_credit_grant(mock_construct, mock_add_payment):
    """An unrecognised product_id must not grant any credits."""
    mock_construct.return_value = _checkout_event(product_id="price_unknown_bogus")

    await stripe_webhook(_mock_request(), "valid-sig")

    mock_add_payment.assert_not_called()


@patch("api.controllers.payment_controller.add_user_payment", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_db_error_propagates_as_500(mock_construct, mock_add_payment):
    """A DB failure inside add_user_payment must surface as HTTP 500 so Stripe retries."""
    mock_construct.return_value = _checkout_event()
    mock_add_payment.side_effect = HTTPException(status_code=500, detail="Payment processing failed")

    with pytest.raises(HTTPException) as exc_info:
        await stripe_webhook(_mock_request(), "valid-sig")

    assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------- #
#                          UNRECOGNIZED EVENT TYPE                             #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.payment_controller.add_user_payment", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_unknown_event_type_does_not_add_payment(mock_construct, mock_add_payment):
    """Events other than checkout.session.completed must be silently ignored."""
    mock_construct.return_value = {
        "type": "customer.subscription.created",
        "data": {"object": {}},
    }

    await stripe_webhook(_mock_request(), "valid-sig")

    mock_add_payment.assert_not_called()


# ---------------------------------------------------------------------------- #
#                          add_user_payment idempotency                        #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.users_controller.db")
async def test_add_payment_applies_credits_first_time(mock_db):
    """First call with a new payment_intent must update credits in Mongo."""
    mock_update = AsyncMock(return_value=MagicMock(modified_count=1))
    mock_db.__getitem__.return_value.update_one = mock_update

    await add_user_payment(FAKE_USER_ID, 999, VALID_PRICE_ID, VALID_CREDITS, FAKE_PI, datetime.utcnow())

    mock_update.assert_awaited_once()
    filter_arg = mock_update.call_args.args[0]
    assert filter_arg["_id"] == ObjectId(FAKE_USER_ID)
    # Guard: only apply if this payment_intent is not already in history.
    assert filter_arg["payment_history.payment_intent_id"] == {"$ne": FAKE_PI}


@patch("api.controllers.users_controller.db")
async def test_add_payment_skips_duplicate_without_error(mock_db):
    """A replayed event (modified_count==0) must not raise — idempotent no-op."""
    mock_update = AsyncMock(return_value=MagicMock(modified_count=0))
    mock_db.__getitem__.return_value.update_one = mock_update

    # Should complete without raising
    await add_user_payment(FAKE_USER_ID, 999, VALID_PRICE_ID, VALID_CREDITS, FAKE_PI, datetime.utcnow())

    mock_update.assert_awaited_once()


@patch("api.controllers.users_controller.db")
async def test_add_payment_db_error_raises_500(mock_db):
    """A Mongo failure must raise HTTPException(500) so the webhook returns 500 to Stripe."""
    mock_db.__getitem__.return_value.update_one = AsyncMock(side_effect=Exception("connection refused"))

    with pytest.raises(HTTPException) as exc_info:
        await add_user_payment(FAKE_USER_ID, 999, VALID_PRICE_ID, VALID_CREDITS, FAKE_PI, datetime.utcnow())

    assert exc_info.value.status_code == 500

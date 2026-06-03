import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

import stripe

from api.controllers.payment_controller import stripe_webhook


def _mock_request(body=b'{"type":"test"}'):
    req = AsyncMock()
    req.body = AsyncMock(return_value=body)
    return req


def _checkout_event(user_id="user_123", amount=999, product_id="price_xxx",
                    credit_amount="100", payment_intent="pi_xxx", created=1700000000):
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "amount_total": amount,
                "metadata": {"product_id": product_id, "credit_amount": credit_amount},
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
async def test_webhook_invalid_signature_returns_error(mock_construct):
    """A tampered or missing Stripe signature must return an error payload."""
    result = await stripe_webhook(_mock_request(), "bad-signature")

    assert "error" in result


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
        product_id="price_xxx",
        credit_amount="100",
        payment_intent="pi_xxx",
    )

    await stripe_webhook(_mock_request(), "valid-sig")

    mock_add_payment.assert_called_once()
    args = mock_add_payment.call_args.args
    assert args[0] == "user_abc"          # user_id
    assert args[1] == 999                 # transaction_amount
    assert args[2] == "price_xxx"        # product_id
    assert args[3] == "100"              # credit_amount
    assert args[4] == "pi_xxx"           # payment_intent
    assert isinstance(args[5], datetime) # timestamp converted from unix


@patch("api.controllers.payment_controller.add_user_payment", new_callable=AsyncMock)
@patch("stripe.Webhook.construct_event")
async def test_webhook_checkout_completed_passes_correct_credit_amount(mock_construct, mock_add_payment):
    """The credit_amount forwarded to add_user_payment must exactly match the Stripe metadata."""
    mock_construct.return_value = _checkout_event(credit_amount="500")

    await stripe_webhook(_mock_request(), "valid-sig")

    assert mock_add_payment.call_args.args[3] == "500"


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

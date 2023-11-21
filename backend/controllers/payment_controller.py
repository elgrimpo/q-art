import os
from fastapi.responses import RedirectResponse
from fastapi import HTTPException
from dotenv import load_dotenv
import stripe

load_dotenv()

stripe.api_key = os.environ["STRIPE_API_KEY"]
frontend_url = os.environ["FRONTEND_URL"]

# ---------------------------------------------------------------------------- #
#                                   CHECKOUT                                   #
# ---------------------------------------------------------------------------- #

def create_checkout_session():
    try:
        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    # Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    "price": "price_1OEfQEAaPyl1Ov3PGzbZPdgD",
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=frontend_url + "?success=true",
            cancel_url=frontend_url + "?canceled=true",
        )
        print(checkout_session.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Payment failed")

    return RedirectResponse(url=checkout_session.url, status_code=303)

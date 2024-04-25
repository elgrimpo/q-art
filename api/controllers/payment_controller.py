import os
from fastapi import HTTPException
from dotenv import load_dotenv
import stripe
from datetime import datetime

# App imports
from api.controllers.users_controller import add_user_payment

load_dotenv()

stripe.api_key = os.environ["STRIPE_API_KEY"]
frontend_url = os.environ["FRONTEND_URL"]

# ---------------------------------------------------------------------------- #
#                                   CHECKOUT                                   #
# ---------------------------------------------------------------------------- #

def create_checkout_session(stripeId, credit_amount, user_id):
    try:
        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    "price": stripeId,
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=frontend_url + "/profile" + "?success=true" + "&product_id=" + str(stripeId),
            cancel_url=frontend_url + "/profile" + "?canceled=true",
            client_reference_id=user_id,
            metadata={
                "product_id": stripeId,
                "credit_amount": credit_amount
            }
        )
        return {"session_url": checkout_session.url} 
    except Exception:
        raise HTTPException(status_code=500, detail="Payment failed")

# ---------------------------------------------------------------------------- #
#                                STRIPE WEBHOOK                                #
# ---------------------------------------------------------------------------- #

async def stripe_webhook(request, stripe_signature):
    print("paymend webhook hit")
   

    endpoint_secret = os.environ["STRIPE_ENDPOINT_SECRET"]

    data = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload=data,
            sig_header=stripe_signature,
            secret=endpoint_secret
        )
        
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session["client_reference_id"]
            transaction_amount = session["amount_total"] 
            product_id = session["metadata"]["product_id"]
            credit_amount = session["metadata"]["credit_amount"]
            payment_intent = session["payment_intent"]
            unix_timestamp = session["created"]
            timestamp = datetime.utcfromtimestamp(unix_timestamp)

            # Update user doc with payment and credits
            await add_user_payment(user_id, transaction_amount, product_id, credit_amount, payment_intent, timestamp)    

    except Exception as e:
        print("error at stripe_webhook")
        print(e)
        return {"error": str(e)}
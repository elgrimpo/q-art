# Libraries imports
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.security.oauth2 import OAuth2PasswordBearer
from oauthlib.oauth2 import WebApplicationClient
import requests
#import jwt
from dotenv import load_dotenv
import os

load_dotenv()

client_id = os.environ["GOOGLE_CLIENT_ID"]
client_secret = os.environ["GOOGLE_CLIENT_SECRET"]
client = WebApplicationClient(client_id)


def google_login():
    authorization_endpoint = 'https://accounts.google.com/o/oauth2/auth'
    redirect_uri = app.url_path_for('callback')
    scope = ['openid', 'profile', 'email']
    uri, headers, body = client.prepare_authorization_request(
        authorization_endpoint, redirect_uri=redirect_uri, scope=scope
    )
    return {"redirect_uri": uri}

def google_callback(request: Request):
    token_endpoint = 'https://accounts.google.com/o/oauth2/token'
    redirect_uri = app.url_path_for('callback')
    client.parse_request_uri_response(request.url)
    uri, headers, body = client.prepare_token_request(
        token_endpoint, redirect_url=redirect_uri, authorization_response=request.url
    )
    token_response = requests.post(uri, headers=headers, data=body, auth=(client_id, client_secret))
    client.parse_request_body_response(token_response.text)
    userinfo_endpoint = 'https://www.googleapis.com/oauth2/v2/userinfo'
    uri, headers, body = client.add_token(userinfo_endpoint)
    userinfo_response = requests.get(uri, headers=headers)
    userinfo = userinfo_response.json()
    # Here you can use userinfo to get user's details

    # Example: return user's email
    return {"email": userinfo['email']}

def google_logout():
    google_logout_url = 'https://accounts.google.com/logout'
    return {"message": "Logged out from Google"}


# def jwt_login():
#     user_info = {'user_id': 123, 'username': 'example_user'}
#     jwt_token = jwt.encode(user_info, app.secret_key, algorithm='HS256')
#     return {"token": jwt_token}

# def jwt_protected(token: str = Depends(oauth2_scheme)):
#     try:
#         payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
#         return {"message": f"Welcome, {payload['username']}!"}
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=401, detail="Token has expired")
#     except jwt.DecodeError:
#         raise HTTPException(status_code=401, detail="Token is invalid")

# def jwt_signup():
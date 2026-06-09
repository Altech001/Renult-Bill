import os
from urllib.parse import urlparse

from fastapi import HTTPException, status
from google.auth.transport import requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow

from app.core.config import settings


GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def allow_local_http_oauth(redirect_uri: str) -> None:
    parsed_uri = urlparse(redirect_uri)
    if settings.google_oauth_insecure_transport and parsed_uri.hostname in {"localhost", "127.0.0.1"}:
        os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")


def google_client_config() -> dict:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured",
        )

    return {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        }
    }


def google_flow(redirect_uri: str | None = None) -> Flow:
    callback_uri = redirect_uri or settings.google_redirect_uri
    allow_local_http_oauth(callback_uri)
    flow = Flow.from_client_config(
        google_client_config(),
        scopes=GOOGLE_SCOPES,
        redirect_uri=callback_uri,
        autogenerate_code_verifier=False,
    )
    return flow


def build_google_login_url(redirect_uri: str | None = None) -> str:
    authorization_url, _ = google_flow(redirect_uri).authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="select_account",
    )
    return authorization_url


def exchange_google_code_for_id_token(
    code: str | None = None,
    redirect_uri: str | None = None,
    authorization_response: str | None = None,
) -> str:
    flow = google_flow(redirect_uri)
    try:
        if authorization_response:
            flow.fetch_token(authorization_response=authorization_response)
        else:
            flow.fetch_token(code=code)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google authorization code: {exc}",
        ) from exc

    google_id_token = flow.credentials.id_token
    if not google_id_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google did not return an ID token")
    return google_id_token


def verify_google_id_token(google_id_token: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="GOOGLE_CLIENT_ID is not configured")

    try:
        profile = id_token.verify_oauth2_token(
            google_id_token,
            requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    if profile.get("email_verified") not in (True, "true", "True"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")
    return profile

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    if settings.credential_encryption_key:
        key = settings.credential_encryption_key.encode()
    else:
        digest = hashlib.sha256(settings.jwt_secret.encode()).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(value: str | None) -> str:
    if not value:
        return ""
    try:
        return _fernet().decrypt(value.encode()).decode()
    except (InvalidToken, ValueError):
        # Supports legacy rows created before encrypted storage was introduced.
        return value

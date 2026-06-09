from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status

from app.db.session import SessionDep
from app.models.user import User
from app.services.security import decode_access_token


def current_user(
    session: SessionDep,
    authorization: Annotated[Optional[str], Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    payload = decode_access_token(authorization.split(" ", 1)[1])
    try:
        user_id = UUID(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return user


CurrentUser = Annotated[User, Depends(current_user)]

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.jwt import decode_token
from src.config.settings import settings
from src.database.session import get_db
from src.models import User, UserRole


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    session_token: Annotated[str | None, Cookie(alias=settings.COOKIE_NAME)] = None,
) -> User:
    if session_token is None:
        raise _unauthorized()
    payload = decode_token(session_token)
    if payload is None or "sub" not in payload:
        raise _unauthorized()
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise _unauthorized()
    user = db.get(User, user_id)
    if user is None:
        raise _unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user


def require_author_or_admin(user: CurrentUser) -> User:
    if user.role not in (UserRole.admin, UserRole.author):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Author or admin required")
    return user

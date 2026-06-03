from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.deps import CurrentUser
from src.auth.hashing import verify_password
from src.auth.jwt import encode_token
from src.config.settings import settings
from src.database.session import get_db
from src.models import User
from src.schemas.auth import LoginRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.JWT_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = encode_token(user.id, user.role)
    _set_session_cookie(response, token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> User:
    return user

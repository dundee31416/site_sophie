import time
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from src.auth.deps import CurrentUser
from src.auth.hashing import hash_password, verify_password
from src.config.settings import settings
from src.database.session import get_db
from src.models import User
from src.schemas.auth import UserResponse
from src.schemas.me import ChangePasswordRequest, UpdateProfileRequest
from src.storage import avatar_path
from src.util import IMAGE_EXTS, file_ext, save_upload, storage_url

router = APIRouter(prefix="/api/me", tags=["me"])


@router.patch("", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.post("/avatar", response_model=UserResponse)
def upload_avatar(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File()],
) -> User:
    ext = file_ext(file.filename, IMAGE_EXTS)
    dest = avatar_path(user.username, ext)
    # Remove any previous avatar with a different extension before writing.
    for prev_ext in IMAGE_EXTS:
        old = avatar_path(user.username, prev_ext)
        if old != dest and old.exists():
            old.unlink()
    save_upload(file, dest)
    # The avatar lives at a fixed path (avatar.<ext>), so bake a version
    # into the stored URL — /uploads/* is cached as immutable downstream.
    user.avatar_path = f"{storage_url(dest, settings.STORAGE_ROOT)}?v={int(time.time())}"
    db.commit()
    db.refresh(user)
    return user

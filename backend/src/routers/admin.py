from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.deps import require_admin
from src.auth.hashing import hash_password
from src.database.session import get_db
from src.models import User, UserRole
from src.schemas.admin import CreateAuthorRequest, ResetPasswordRequest
from src.schemas.auth import UserResponse

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/authors", response_model=list[UserResponse])
def list_authors(db: Annotated[Session, Depends(get_db)]) -> list[User]:
    rows = db.scalars(select(User).where(User.role == UserRole.author).order_by(User.username)).all()
    return list(rows)


@router.post("/authors", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_author(
    payload: CreateAuthorRequest,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    author = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=UserRole.author,
        display_name=payload.display_name or payload.username,
    )
    db.add(author)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' already exists",
        )
    db.refresh(author)
    return author


@router.delete("/authors/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_author(author_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    author = db.get(User, author_id)
    if author is None or author.role != UserRole.author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    db.delete(author)
    db.commit()


@router.patch("/authors/{author_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_author_password(
    author_id: int,
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    author = db.get(User, author_id)
    if author is None or author.role != UserRole.author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    author.password_hash = hash_password(payload.new_password)
    db.commit()

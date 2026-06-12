import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from src.ai.client import get_client
from src.auth.deps import CurrentUser
from src.config.settings import settings
from src.database.session import get_db
from src.models import Work, WorkSection
from src.schemas.works import (
    CreateWorkRequest,
    RestyleRequest,
    UpdateWorkRequest,
    WorkDetailResponse,
    WorkResponse,
)
from src.services import auto_ai
from src.storage import (
    author_dir,
    cover_path,
    url_to_disk,
    work_dir,
)
from src.util import IMAGE_EXTS, file_ext, save_upload, slugify, storage_url

router = APIRouter(prefix="/api/me/works", tags=["works"])


def _get_owned_work(
    work_id: int, user_id: int, db: Session, *, with_pages: bool = False
) -> Work:
    stmt = select(Work).where(Work.id == work_id, Work.author_id == user_id)
    if with_pages:
        stmt = stmt.options(selectinload(Work.pages))
    work = db.scalar(stmt)
    if work is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")
    return work


def _make_unique_slug(base: str, author_id: int, db: Session) -> str:
    slug = base
    suffix = 1
    while db.scalar(select(Work.id).where(Work.author_id == author_id, Work.slug == slug)) is not None:
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


@router.get("", response_model=list[WorkResponse])
def list_my_works(user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> list[Work]:
    rows = db.scalars(
        select(Work).where(Work.author_id == user.id).order_by(Work.updated_at.desc())
    ).all()
    return list(rows)


@router.post("", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
def create_work(
    payload: CreateWorkRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Work:
    slug = _make_unique_slug(slugify(payload.title), user.id, db)
    work = Work(
        author_id=user.id,
        section=payload.section,
        slug=slug,
        title=payload.title,
        blurb=payload.blurb,
        year=payload.year,
        shape=payload.shape,
        color=payload.color,
    )
    db.add(work)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug collision")
    db.refresh(work)
    # Ensure the on-disk directory exists for subsequent uploads.
    work_dir(user.username, slug).mkdir(parents=True, exist_ok=True)
    return work


@router.get("/{work_id}", response_model=WorkDetailResponse)
def get_work(work_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> Work:
    return _get_owned_work(work_id, user.id, db, with_pages=True)


@router.patch("/{work_id}", response_model=WorkResponse)
def update_work(
    work_id: int,
    payload: UpdateWorkRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Work:
    work = _get_owned_work(work_id, user.id, db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(work, key, value)
    db.commit()
    db.refresh(work)
    return work


@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work(
    work_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]
) -> None:
    work = _get_owned_work(work_id, user.id, db)
    target_dir = work_dir(user.username, work.slug)
    db.delete(work)
    db.commit()
    if target_dir.exists():
        shutil.rmtree(target_dir, ignore_errors=True)
    # If the author has no other works, leave their root dir in place for the avatar.
    _ = author_dir  # keep import used


@router.post("/{work_id}/cover", response_model=WorkResponse)
def upload_cover(
    work_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File()],
) -> Work:
    work = _get_owned_work(work_id, user.id, db)
    ext = file_ext(file.filename, IMAGE_EXTS)
    dest = cover_path(user.username, work.slug, ext)
    for prev_ext in IMAGE_EXTS:
        old = cover_path(user.username, work.slug, prev_ext)
        if old != dest and old.exists():
            old.unlink()
    save_upload(file, dest)
    work.cover_path = storage_url(dest, settings.STORAGE_ROOT)

    # Auto-AI on books + comics covers (drawings don't have separate covers).
    if work.section in (WorkSection.book, WorkSection.comic):
        work.cover_enhance_pending = True
        work.cover_restyle_pending = True

    db.commit()
    db.refresh(work)

    if work.section in (WorkSection.book, WorkSection.comic):
        background_tasks.add_task(auto_ai.run_cover_enhance, work.id)
        background_tasks.add_task(auto_ai.run_cover_restyle, work.id)

    return work


def _original_cover_disk(work: Work) -> Path:
    if work.cover_path is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Work has no cover to process",
        )
    return url_to_disk(work.cover_path, settings.STORAGE_ROOT)


# Manual cover AI runs as a background task (same pattern as auto-AI on
# upload): set the pending flag, return immediately, let the UI poll.


@router.post("/{work_id}/cover/enhance", response_model=WorkResponse)
def enhance_cover(
    work_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
    payload: RestyleRequest | None = None,
) -> Work:
    work = _get_owned_work(work_id, user.id, db)
    _original_cover_disk(work)
    get_client()
    work.cover_enhance_pending = True
    db.commit()
    db.refresh(work)
    background_tasks.add_task(
        auto_ai.run_cover_enhance, work.id, payload.extra_instructions if payload else None
    )
    return work


@router.post("/{work_id}/cover/restyle", response_model=WorkResponse)
def restyle_cover(
    work_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
    payload: RestyleRequest | None = None,
) -> Work:
    work = _get_owned_work(work_id, user.id, db)
    _original_cover_disk(work)
    get_client()
    work.cover_restyle_pending = True
    db.commit()
    db.refresh(work)
    background_tasks.add_task(
        auto_ai.run_cover_restyle, work.id, payload.extra_instructions if payload else None
    )
    return work

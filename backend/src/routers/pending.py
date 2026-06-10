"""Per-author pending tray — books and comics scanned via the file watcher
but not yet assembled into a Work. Authors assemble them in the UI."""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.deps import CurrentUser
from src.config.settings import settings
from src.database.session import get_db
from src.models import Page, PendingFile, PendingSection, Work, WorkSection
from src.schemas.pending import AssemblePendingRequest, PendingFileResponse
from src.schemas.works import WorkResponse
from src.services import auto_ai
from src.storage import page_path
from src.util import slugify, storage_url

router = APIRouter(prefix="/api/me/pending", tags=["pending"])


@router.get("", response_model=list[PendingFileResponse])
def list_pending(
    user: CurrentUser, db: Annotated[Session, Depends(get_db)]
) -> list[PendingFile]:
    rows = db.scalars(
        select(PendingFile)
        .where(PendingFile.author_id == user.id)
        .order_by(PendingFile.scanned_at.asc())
    ).all()
    return list(rows)


@router.delete("/{pending_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def discard_pending(
    pending_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    row = db.get(PendingFile, pending_id)
    if row is None or row.author_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending file not found")
    disk = Path(row.disk_path)
    if disk.exists():
        disk.unlink(missing_ok=True)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _date_fr() -> str:
    from datetime import datetime
    months = {
        1: "janvier", 2: "février", 3: "mars", 4: "avril", 5: "mai", 6: "juin",
        7: "juillet", 8: "août", 9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
    }
    now = datetime.now()
    return f"{now.day} {months[now.month]} {now.year}"


def _make_unique_slug(base: str, author_id: int, db: Session) -> str:
    slug = base
    suffix = 1
    while db.scalar(select(Work.id).where(Work.author_id == author_id, Work.slug == slug)) is not None:
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


@router.post("/assemble", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
def assemble_pending(
    payload: AssemblePendingRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
) -> Work:
    rows = db.scalars(
        select(PendingFile).where(
            PendingFile.author_id == user.id,
            PendingFile.id.in_(payload.file_ids),
        )
    ).all()
    by_id = {r.id: r for r in rows}
    if len(by_id) != len(set(payload.file_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more file_ids don't belong to the current author",
        )
    if any(r.section != payload.section for r in rows):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All selected files must be of the requested section",
        )

    section_label = "Livre" if payload.section == PendingSection.book else "BD"
    title = (payload.title or "").strip() or f"{section_label} du {_date_fr()}"
    slug = _make_unique_slug(slugify(title), user.id, db)
    work = Work(
        author_id=user.id,
        section=(
            WorkSection.book if payload.section == PendingSection.book else WorkSection.comic
        ),
        slug=slug,
        title=title,
    )
    db.add(work)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug collision")

    created_pages: list[Page] = []
    for idx, file_id in enumerate(payload.file_ids, start=1):
        pending = by_id[file_id]
        src = Path(pending.disk_path)
        ext = src.suffix.lstrip(".").lower() or "jpg"
        dst = page_path(user.username, slug, idx, ext)
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.exists():
            shutil.move(str(src), str(dst))
        page = Page(
            work_id=work.id,
            idx=idx,
            scan_path=storage_url(dst, settings.STORAGE_ROOT),
        )
        # Auto-AI on books only (per plan).
        if work.section == WorkSection.book:
            page.enhance_pending = True
            page.transcribe_pending = True
        db.add(page)
        created_pages.append(page)
        db.delete(pending)

    db.commit()
    db.refresh(work)
    for page in created_pages:
        db.refresh(page)

    # Schedule background AI for new book pages.
    if work.section == WorkSection.book:
        for page in created_pages:
            background_tasks.add_task(auto_ai.run_page_enhance, page.id)
            background_tasks.add_task(auto_ai.run_page_transcribe, page.id)

    return work

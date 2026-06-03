from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.auth.deps import CurrentUser
from src.config.settings import settings
from src.database.session import get_db
from src.models import Page, Work, WorkSection
from src.schemas.works import PageResponse, ReorderPagesRequest
from src.storage import page_path
from src.util import IMAGE_EXTS, file_ext, save_upload, storage_url

router = APIRouter(prefix="/api/me/works/{work_id}/pages", tags=["pages"])


def _get_owned_work(work_id: int, user_id: int, db: Session) -> Work:
    work = db.scalar(
        select(Work)
        .where(Work.id == work_id, Work.author_id == user_id)
        .options(selectinload(Work.pages))
    )
    if work is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")
    return work


@router.post("", response_model=list[PageResponse], status_code=status.HTTP_201_CREATED)
def upload_pages(
    work_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    files: Annotated[list[UploadFile], File()],
) -> list[Page]:
    work = _get_owned_work(work_id, user.id, db)
    if len(files) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")

    if work.section == WorkSection.drawing:
        if len(files) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A drawing can contain only one image",
            )
        # Replace any existing page.
        for existing in work.pages:
            db.delete(existing)
        db.flush()

    next_idx = (max((p.idx for p in work.pages if p.idx is not None), default=0)) + 1 if work.section != WorkSection.drawing else 1
    created: list[Page] = []
    for upload in files:
        ext = file_ext(upload.filename, IMAGE_EXTS)
        dest = page_path(user.username, work.slug, next_idx, ext)
        save_upload(upload, dest)
        page = Page(
            work_id=work.id,
            idx=next_idx,
            scan_path=storage_url(dest, settings.STORAGE_ROOT),
        )
        db.add(page)
        created.append(page)
        next_idx += 1

    db.commit()
    for page in created:
        db.refresh(page)
    return created


@router.patch("/order", response_model=list[PageResponse])
def reorder_pages(
    work_id: int,
    payload: ReorderPagesRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[Page]:
    work = _get_owned_work(work_id, user.id, db)
    by_id = {p.id: p for p in work.pages}
    if set(payload.page_ids) != set(by_id.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="page_ids must be a permutation of the work's current page ids",
        )

    # Two-phase update so we don't violate the (work_id, idx) unique constraint
    # while values are in flight.
    offset = 10_000
    for page in work.pages:
        page.idx += offset
    db.flush()
    for new_idx, page_id in enumerate(payload.page_ids, start=1):
        by_id[page_id].idx = new_idx
    db.commit()

    return sorted(work.pages, key=lambda p: p.idx)


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    work_id: int,
    page_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    work = _get_owned_work(work_id, user.id, db)
    page = next((p for p in work.pages if p.id == page_id), None)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    # Best-effort file removal: scan_path is a /uploads/... URL; map back to disk.
    if page.scan_path and page.scan_path.startswith("/uploads/"):
        rel = page.scan_path[len("/uploads/") :]
        disk = settings.STORAGE_ROOT / rel
        if disk.exists():
            disk.unlink(missing_ok=True)

    db.delete(page)
    db.commit()

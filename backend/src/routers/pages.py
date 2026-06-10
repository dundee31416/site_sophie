import shutil
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.ai.enhance import enhance_image
from src.ai.restyle import restyle_image
from src.ai.transcribe import transcribe_image
from src.auth.deps import CurrentUser
from src.config.settings import settings
from src.database.session import get_db
from src.models import Page, Work, WorkSection
from src.schemas.pending import SplitWorkRequest
from src.schemas.works import (
    PageResponse,
    ReorderPagesRequest,
    RestyleRequest,
    UpdatePageTextRequest,
    WorkResponse,
)
from src.services import auto_ai
from src.storage import (
    enhanced_page_path,
    page_path,
    restyled_page_path,
    url_to_disk,
)
from src.util import IMAGE_EXTS, file_ext, save_upload, slugify, storage_url

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


def _get_owned_page(work: Work, page_id: int) -> Page:
    page = next((p for p in work.pages if p.id == page_id), None)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


def _scan_disk_path(page: Page):
    if page.scan_path is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page has no scan to process",
        )
    return url_to_disk(page.scan_path, settings.STORAGE_ROOT)


@router.post("", response_model=list[PageResponse], status_code=status.HTTP_201_CREATED)
def upload_pages(
    work_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
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
        for existing in work.pages:
            db.delete(existing)
        db.flush()

    next_idx = (max((p.idx for p in work.pages if p.idx is not None), default=0)) + 1 if work.section != WorkSection.drawing else 1
    auto_ai_pages = work.section == WorkSection.book
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
        if auto_ai_pages:
            page.enhance_pending = True
            page.transcribe_pending = True
        db.add(page)
        created.append(page)
        next_idx += 1

    db.commit()
    for page in created:
        db.refresh(page)

    if auto_ai_pages:
        for page in created:
            background_tasks.add_task(auto_ai.run_page_enhance, page.id)
            background_tasks.add_task(auto_ai.run_page_transcribe, page.id)

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

    offset = 10_000
    for page in work.pages:
        page.idx += offset
    db.flush()
    for new_idx, page_id in enumerate(payload.page_ids, start=1):
        by_id[page_id].idx = new_idx
    db.commit()

    return sorted(work.pages, key=lambda p: p.idx)


@router.patch("/{page_id}", response_model=PageResponse)
def update_page_text(
    work_id: int,
    page_id: int,
    payload: UpdatePageTextRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Page:
    work = _get_owned_work(work_id, user.id, db)
    page = _get_owned_page(work, page_id)
    page.text = payload.text
    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    work_id: int,
    page_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    work = _get_owned_work(work_id, user.id, db)
    page = _get_owned_page(work, page_id)

    for url in (page.scan_path, page.enhanced_path, page.restyled_path):
        if url and url.startswith("/uploads/"):
            disk = settings.STORAGE_ROOT / url[len("/uploads/") :]
            if disk.exists():
                disk.unlink(missing_ok=True)

    db.delete(page)
    db.commit()


def _move_page_files_for_idx(page: Page, old_username: str, old_slug: str,
                              new_username: str, new_slug: str, new_idx: int) -> None:
    """Move all on-disk artifacts for a Page from one work folder to another,
    updating the URL columns in the process. Does NOT commit."""
    def _move_one(rel_attr: str, new_path):
        url = getattr(page, rel_attr)
        if url is None or not url.startswith("/uploads/"):
            return
        old_disk = settings.STORAGE_ROOT / url[len("/uploads/") :]
        if not old_disk.exists():
            setattr(page, rel_attr, None)
            return
        new_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(old_disk), str(new_path))
        setattr(page, rel_attr, storage_url(new_path, settings.STORAGE_ROOT))

    _, _, _ = old_username, old_slug, new_username  # readability
    # Infer file ext from the current scan_path if any.
    scan_ext = (
        page.scan_path.rsplit(".", 1)[-1].lower() if page.scan_path and "." in page.scan_path else "jpg"
    )
    _move_one("scan_path", page_path(new_username, new_slug, new_idx, scan_ext))
    _move_one("enhanced_path", enhanced_page_path(new_username, new_slug, new_idx))
    _move_one("restyled_path", restyled_page_path(new_username, new_slug, new_idx))


def _make_unique_slug(base: str, author_id: int, db: Session) -> str:
    slug = base
    suffix = 1
    while db.scalar(select(Work.id).where(Work.author_id == author_id, Work.slug == slug)) is not None:
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


@router.post("/{page_id}/move-to/{dst_work_id}", response_model=PageResponse)
def move_page_to_work(
    work_id: int,
    page_id: int,
    dst_work_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Page:
    if dst_work_id == work_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Same work")
    src_work = _get_owned_work(work_id, user.id, db)
    dst_work = _get_owned_work(dst_work_id, user.id, db)
    if src_work.section != dst_work.section:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination work must be in the same section as the source",
        )
    page = _get_owned_page(src_work, page_id)

    # Bump idx out of the way (two-phase) to avoid (work_id, idx) collisions
    # while we rewire.
    new_idx = (max((p.idx for p in dst_work.pages), default=0)) + 1
    old_idx = page.idx
    page.idx = 10_000 + new_idx
    db.flush()
    _move_page_files_for_idx(
        page,
        user.username, src_work.slug,
        user.username, dst_work.slug, new_idx,
    )
    page.work_id = dst_work.id
    page.idx = new_idx

    # Renumber src work to fill the hole.
    remaining = sorted([p for p in src_work.pages if p.id != page.id], key=lambda p: p.idx)
    offset = 20_000
    for p in remaining:
        p.idx += offset
    db.flush()
    for i, p in enumerate(remaining, start=1):
        p.idx = i

    db.commit()
    db.refresh(page)
    return page


@router.post("/{page_id}/split", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
def split_work_at_page(
    work_id: int,
    page_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    payload: SplitWorkRequest | None = None,
) -> Work:
    """Create a new Work containing this page and all subsequent pages."""
    src_work = _get_owned_work(work_id, user.id, db)
    page = _get_owned_page(src_work, page_id)
    if src_work.section == WorkSection.drawing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Drawings can't be split",
        )

    title = ((payload.title if payload else None) or "").strip()
    if title == "":
        title = src_work.title + " (suite)"
    new_slug = _make_unique_slug(slugify(title), user.id, db)
    new_work = Work(
        author_id=user.id,
        section=src_work.section,
        slug=new_slug,
        title=title,
    )
    db.add(new_work)
    db.flush()

    moving = sorted([p for p in src_work.pages if p.idx >= page.idx], key=lambda p: p.idx)
    # Phase 1: shift everyone out of the way.
    for p in moving:
        p.idx += 30_000
    db.flush()
    # Phase 2: move files + reassign work_id + final idx.
    for new_idx, p in enumerate(moving, start=1):
        _move_page_files_for_idx(
            p,
            user.username, src_work.slug,
            user.username, new_slug, new_idx,
        )
        p.work_id = new_work.id
        p.idx = new_idx

    # Renumber src work.
    remaining = sorted([p for p in src_work.pages if p.id not in {m.id for m in moving}], key=lambda p: p.idx)
    for p in remaining:
        p.idx += 40_000
    db.flush()
    for i, p in enumerate(remaining, start=1):
        p.idx = i

    db.commit()
    db.refresh(new_work)
    return new_work


@router.post("/{page_id}/transcribe", response_model=PageResponse)
def transcribe_page(
    work_id: int,
    page_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Page:
    work = _get_owned_work(work_id, user.id, db)
    page = _get_owned_page(work, page_id)
    text = transcribe_image(_scan_disk_path(page))
    page.text = text if text != "" else None
    db.commit()
    db.refresh(page)
    return page


@router.post("/{page_id}/enhance", response_model=PageResponse)
def enhance_page(
    work_id: int,
    page_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Page:
    work = _get_owned_work(work_id, user.id, db)
    page = _get_owned_page(work, page_id)
    src = _scan_disk_path(page)
    dst = enhanced_page_path(user.username, work.slug, page.idx)
    enhance_image(src, dst)
    page.enhanced_path = storage_url(dst, settings.STORAGE_ROOT)
    db.commit()
    db.refresh(page)
    return page


@router.post("/{page_id}/restyle", response_model=PageResponse)
def restyle_page(
    work_id: int,
    page_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    payload: RestyleRequest | None = None,
) -> Page:
    work = _get_owned_work(work_id, user.id, db)
    page = _get_owned_page(work, page_id)
    src = _scan_disk_path(page)
    dst = restyled_page_path(user.username, work.slug, page.idx)
    restyle_image(src, dst, payload.extra_instructions if payload else None)
    page.restyled_path = storage_url(dst, settings.STORAGE_ROOT)
    db.commit()
    db.refresh(page)
    return page

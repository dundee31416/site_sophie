from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.database.session import get_db
from src.models import Page, User, UserRole, Work, WorkSection
from src.schemas.public import PublicAuthor, PublicWorkDetail, PublicWorkSummary

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/authors", response_model=list[PublicAuthor])
def list_authors(db: Annotated[Session, Depends(get_db)]) -> list[PublicAuthor]:
    rows = db.execute(
        select(User, func.count(Work.id).label("work_count"))
        .outerjoin(Work, Work.author_id == User.id)
        .where(User.role == UserRole.author)
        .group_by(User.id)
        .order_by(User.username)
    ).all()
    return [
        PublicAuthor(
            username=user.username,
            display_name=user.display_name,
            age=user.age,
            color=user.color,
            bio=user.bio,
            favo=user.favo,
            avatar_path=user.avatar_path,
            work_count=int(work_count),
        )
        for user, work_count in rows
    ]


def _first_page_path(work: Work) -> str | None:
    if not work.pages:
        return None
    first = min(work.pages, key=lambda p: p.idx)
    return first.scan_path


def _to_summary(work: Work) -> PublicWorkSummary:
    return PublicWorkSummary(
        id=work.id,
        section=work.section,
        slug=work.slug,
        title=work.title,
        blurb=work.blurb,
        year=work.year,
        is_new=work.is_new,
        shape=work.shape,
        color=work.color,
        cover_path=work.cover_path,
        enhanced_cover_path=work.enhanced_cover_path,
        restyled_cover_path=work.restyled_cover_path,
        digital_variant=work.digital_variant,
        cover_variant=work.cover_variant,
        first_page_path=_first_page_path(work),
        updated_at=work.updated_at,
        author_username=work.author.username,
        author_display_name=work.author.display_name,
        author_color=work.author.color,
    )


@router.get("/works", response_model=list[PublicWorkSummary])
def list_works(
    db: Annotated[Session, Depends(get_db)],
    section: Annotated[WorkSection | None, Query()] = None,
    author: Annotated[str | None, Query(description="author username")] = None,
) -> list[PublicWorkSummary]:
    stmt = (
        select(Work)
        .options(selectinload(Work.author), selectinload(Work.pages))
        .order_by(Work.is_new.desc(), Work.updated_at.desc())
    )
    if section is not None:
        stmt = stmt.where(Work.section == section)
    if author is not None:
        stmt = stmt.join(User, Work.author_id == User.id).where(User.username == author)

    rows = db.scalars(stmt).all()
    return [_to_summary(w) for w in rows]


@router.get("/works/{author_username}/{slug}", response_model=PublicWorkDetail)
def get_work(
    author_username: str,
    slug: str,
    db: Annotated[Session, Depends(get_db)],
) -> PublicWorkDetail:
    work = db.scalar(
        select(Work)
        .join(User, Work.author_id == User.id)
        .where(User.username == author_username, Work.slug == slug)
        .options(selectinload(Work.author), selectinload(Work.pages))
    )
    if work is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    summary = _to_summary(work)
    return PublicWorkDetail(
        **summary.model_dump(),
        author_age=work.author.age,
        pages=sorted(work.pages, key=lambda p: p.idx),  # type: ignore[arg-type]
    )

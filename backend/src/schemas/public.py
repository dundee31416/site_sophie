from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.models import WorkSection
from src.schemas.works import PageResponse


class PublicAuthor(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    display_name: str | None
    age: int | None
    color: str | None
    bio: str | None
    favo: str | None
    avatar_path: str | None
    work_count: int


class PublicWorkSummary(BaseModel):
    id: int
    section: WorkSection
    slug: str
    title: str
    blurb: str | None
    year: int | None
    is_new: bool
    shape: str | None
    color: str | None
    cover_path: str | None
    first_page_path: str | None
    updated_at: datetime

    author_username: str
    author_display_name: str | None
    author_color: str | None


class PublicWorkDetail(PublicWorkSummary):
    author_age: int | None
    pages: list[PageResponse]

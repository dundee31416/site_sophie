from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from src.models import DigitalVariant, WorkSection
from src.schemas.works import PageResponse
from src.util import with_version


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
    enhanced_cover_path: str | None
    restyled_cover_path: str | None
    digital_variant: DigitalVariant | None
    cover_variant: DigitalVariant | None
    first_page_path: str | None
    updated_at: datetime

    author_username: str
    author_display_name: str | None
    author_color: str | None

    @model_validator(mode="after")
    def _version_cover_urls(self) -> "PublicWorkSummary":
        # first_page_path is versioned by the router with the page's own
        # timestamp; covers belong to the work itself.
        self.cover_path = with_version(self.cover_path, self.updated_at)
        self.enhanced_cover_path = with_version(self.enhanced_cover_path, self.updated_at)
        self.restyled_cover_path = with_version(self.restyled_cover_path, self.updated_at)
        return self


class PublicWorkDetail(PublicWorkSummary):
    author_age: int | None
    pages: list[PageResponse]

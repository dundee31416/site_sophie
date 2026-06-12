from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.models import DigitalVariant, WorkSection


class CreateWorkRequest(BaseModel):
    section: WorkSection
    title: str = Field(min_length=1, max_length=256)
    blurb: str | None = Field(default=None, max_length=2000)
    year: int | None = Field(default=None, ge=1900, le=2200)
    shape: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=16)


class UpdateWorkRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=256)
    blurb: str | None = Field(default=None, max_length=2000)
    year: int | None = Field(default=None, ge=1900, le=2200)
    is_new: bool | None = None
    shape: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=16)
    digital_variant: DigitalVariant | None = None
    cover_variant: DigitalVariant | None = None


class PageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    idx: int
    scan_path: str | None
    html_path: str | None
    illo_label: str | None
    enhanced_path: str | None
    restyled_path: str | None
    text: str | None
    enhance_pending: bool
    transcribe_pending: bool
    restyle_pending: bool
    updated_at: datetime


class WorkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
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
    cover_enhance_pending: bool
    cover_restyle_pending: bool
    created_at: datetime
    updated_at: datetime


class WorkDetailResponse(WorkResponse):
    pages: list[PageResponse]


class ReorderPagesRequest(BaseModel):
    page_ids: list[int] = Field(min_length=1)


class UpdatePageTextRequest(BaseModel):
    text: str | None = Field(default=None, max_length=10000)


class RestyleRequest(BaseModel):
    extra_instructions: str | None = Field(default=None, max_length=4000)

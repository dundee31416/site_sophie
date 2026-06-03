from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.models import WorkSection


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


class PageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    idx: int
    scan_path: str | None
    html_path: str | None
    illo_label: str | None


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
    created_at: datetime
    updated_at: datetime


class WorkDetailResponse(WorkResponse):
    pages: list[PageResponse]


class ReorderPagesRequest(BaseModel):
    page_ids: list[int] = Field(min_length=1)

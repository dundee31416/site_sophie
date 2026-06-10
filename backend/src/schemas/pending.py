from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.models import PendingSection


class PendingFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    section: PendingSection
    original_filename: str
    thumbnail_url: str
    scanned_at: datetime


class AssemblePendingRequest(BaseModel):
    section: PendingSection
    title: str | None = Field(default=None, max_length=256)
    file_ids: list[int] = Field(min_length=1)


class SplitWorkRequest(BaseModel):
    title: str | None = Field(default=None, max_length=256)

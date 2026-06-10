import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class PendingSection(str, enum.Enum):
    book = "book"
    comic = "comic"


class PendingFile(Base):
    """A scanned file dropped by the file watcher that hasn't been
    assembled into a Work yet (books / comics only). Drawings skip this
    intermediate step — the watcher creates a Drawing Work + Page directly.
    """

    __tablename__ = "pending_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section: Mapped[PendingSection] = mapped_column(
        Enum(PendingSection, name="pending_section"), nullable=False
    )
    disk_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(512), nullable=False)
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

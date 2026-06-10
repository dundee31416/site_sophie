import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class WorkSection(str, enum.Enum):
    book = "book"
    comic = "comic"
    drawing = "drawing"


class DigitalVariant(str, enum.Enum):
    enhanced = "enhanced"
    restyled = "restyled"


class Work(Base):
    __tablename__ = "works"
    __table_args__ = (UniqueConstraint("author_id", "slug", name="uq_works_author_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section: Mapped[WorkSection] = mapped_column(
        Enum(WorkSection, name="work_section"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    blurb: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shape: Mapped[str | None] = mapped_column(String(32), nullable=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    cover_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    enhanced_cover_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    restyled_cover_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    digital_variant: Mapped[DigitalVariant | None] = mapped_column(
        Enum(DigitalVariant, name="digital_variant"), nullable=True
    )
    cover_variant: Mapped[DigitalVariant | None] = mapped_column(
        Enum(DigitalVariant, name="digital_variant", create_type=False), nullable=True
    )
    cover_enhance_pending: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cover_restyle_pending: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    author: Mapped["User"] = relationship("User", back_populates="works")  # noqa: F821
    pages: Mapped[list["Page"]] = relationship(  # noqa: F821
        "Page",
        back_populates="work",
        cascade="all, delete-orphan",
        order_by="Page.idx",
    )

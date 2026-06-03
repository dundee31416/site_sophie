from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class Page(Base):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("work_id", "idx", name="uq_pages_work_idx"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_id: Mapped[int] = mapped_column(
        ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    idx: Mapped[int] = mapped_column(Integer, nullable=False)

    scan_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    html_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    illo_label: Mapped[str | None] = mapped_column(String(256), nullable=True)

    work: Mapped["Work"] = relationship("Work", back_populates="pages")  # noqa: F821

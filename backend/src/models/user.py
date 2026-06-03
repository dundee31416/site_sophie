import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    author = "author"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)

    display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    favo: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    avatar_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    works: Mapped[list["Work"]] = relationship(  # noqa: F821
        "Work",
        back_populates="author",
        cascade="all, delete-orphan",
    )

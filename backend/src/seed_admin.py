"""Seed the single admin user on first boot.

Idempotent: skips creation if a user with ADMIN_USERNAME already exists. Safe to
run on every container start.
"""
from sqlalchemy import select

from src.auth.hashing import hash_password
from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import User, UserRole


def seed_admin() -> None:
    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.username == settings.ADMIN_USERNAME))
        if existing is not None:
            print(f"Admin user '{settings.ADMIN_USERNAME}' already exists, skipping seed.")
            return

        admin = User(
            username=settings.ADMIN_USERNAME,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.admin,
            display_name="Admin",
        )
        db.add(admin)
        db.commit()
        print(f"Seeded admin user '{settings.ADMIN_USERNAME}'.")


if __name__ == "__main__":
    seed_admin()

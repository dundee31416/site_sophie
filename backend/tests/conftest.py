"""Shared fixtures: in-memory SQLite DB, temp storage dirs, API client.

Environment is pinned BEFORE any src import — src.config.settings builds
its singleton at import time and src.main creates the storage dir and
mounts /uploads from it.
"""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="lisons-tests-")
os.environ["STORAGE_ROOT"] = os.path.join(_TMP, "storage")
os.environ["INBOX_ROOT"] = os.path.join(_TMP, "inbox")
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["GEMINI_API_KEY"] = ""
os.environ["COOKIE_SECURE"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from src.auth.hashing import hash_password  # noqa: E402
from src.config.settings import settings  # noqa: E402
from src.database.session import Base, get_db  # noqa: E402
from src.main import app  # noqa: E402
from src.models import User, UserRole  # noqa: E402

# One hash for every test user — bcrypt is deliberately slow.
PASSWORD = "test-password"
PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture()
def db_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    yield factory
    engine.dispose()


@pytest.fixture()
def storage(tmp_path, monkeypatch):
    storage_root = tmp_path / "storage"
    inbox_root = tmp_path / "inbox"
    storage_root.mkdir()
    inbox_root.mkdir()
    monkeypatch.setattr(settings, "STORAGE_ROOT", storage_root)
    monkeypatch.setattr(settings, "INBOX_ROOT", inbox_root)
    return storage_root


@pytest.fixture()
def client(db_factory, storage, monkeypatch):
    # Background AI jobs and the watcher open their own sessions.
    import src.services.auto_ai as auto_ai
    import src.watcher.inbox as inbox

    monkeypatch.setattr(auto_ai, "SessionLocal", db_factory)
    monkeypatch.setattr(inbox, "SessionLocal", db_factory)

    def override_get_db():
        db = db_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # No context manager: lifespan (watcher, flag cleanup) must not run.
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def author(db_factory):
    with db_factory() as db:
        user = User(
            username="sophie",
            password_hash=PASSWORD_HASH,
            role=UserRole.author,
            display_name="Sophie",
            age=7,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


@pytest.fixture()
def logged_in(client, author):
    res = client.post(
        "/api/auth/login", json={"username": author.username, "password": PASSWORD}
    )
    assert res.status_code == 200, res.text
    return client

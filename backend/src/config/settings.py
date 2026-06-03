from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://lisons:lisons@postgres:5432/lisons"

    JWT_SECRET: str = "change-me-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    COOKIE_NAME: str = "lisons_session"
    COOKIE_SECURE: bool = False  # set True in prod (.env.production)
    COOKIE_SAMESITE: str = "lax"

    STORAGE_ROOT: Path = Path("/data/storage")

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "change-me-in-prod"

    PUBLIC_BASE_URL: str = "http://localhost:8000"

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:8000",
    ]


settings = Settings()

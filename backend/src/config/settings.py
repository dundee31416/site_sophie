from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRETS = {"", "change-me-in-prod", "dev-only-not-secret", "admin", "secret", "password"}


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
    INBOX_ROOT: Path = Path("/data/inbox")

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "change-me-in-prod"

    PUBLIC_BASE_URL: str = "http://localhost:8000"

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    # Optional. When set, /api/me/works/.../pages/.../{transcribe,enhance,restyle}
    # endpoints become available. Empty = endpoints return 503.
    GEMINI_API_KEY: str = ""

    @model_validator(mode="after")
    def _refuse_weak_prod_secrets(self) -> "Settings":
        # Compose interpolation turns a missing .env entry into an empty
        # string, which would otherwise silently sign sessions with "".
        if self.JWT_SECRET == "":
            raise ValueError("JWT_SECRET is empty — is it missing from .env?")
        # COOKIE_SECURE=true is our "running in prod" marker.
        if self.COOKIE_SECURE:
            if self.JWT_SECRET in _WEAK_SECRETS or len(self.JWT_SECRET) < 16:
                raise ValueError("JWT_SECRET is a weak/default value; refusing to start in prod")
            if self.ADMIN_PASSWORD in _WEAK_SECRETS:
                raise ValueError("ADMIN_PASSWORD is a weak/default value; refusing to start in prod")
        return self


settings = Settings()

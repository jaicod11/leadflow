from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
JWT_SECRET_MIN_LENGTH = 32


class Settings(BaseSettings):
    """Application settings, read from environment variables and backend/.env."""

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    CORS_ORIGINS: Annotated[list[str], NoDecode]
    SEED_TIMEZONE: str = "Asia/Kolkata"
    # Enables POST /api/demo/reset when non-empty (the caller must send it as X-Demo-Token).
    DEMO_RESET_TOKEN: str = ""

    # Auth: HS256 signing key for access tokens, and their lifetime (default 7 days).
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    # The one-click demo account; ensure_demo_user keeps it present with this password.
    DEMO_USER_EMAIL: str = "demo@leadflow.app"
    DEMO_USER_PASSWORD: str = "demo1234"
    DEMO_USER_NAME: str = "Demo User"

    @field_validator("JWT_SECRET")
    @classmethod
    def require_long_jwt_secret(cls, value: str) -> str:
        if len(value) < JWT_SECRET_MIN_LENGTH:
            raise ValueError(
                f"JWT_SECRET must be at least {JWT_SECRET_MIN_LENGTH} characters long "
                "(generate one with: openssl rand -hex 32)"
            )
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        # Render and Neon hand out driverless URLs, which SQLAlchemy maps to psycopg2.
        for scheme in ("postgres://", "postgresql://"):
            if value.startswith(scheme):
                return "postgresql+psycopg://" + value.removeprefix(scheme)
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()  # type: ignore[call-arg]  # required fields are read from the environment

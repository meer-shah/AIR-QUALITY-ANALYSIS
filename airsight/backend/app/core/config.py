"""
Application settings.

A single :class:`Settings` instance (built by :func:`get_settings`) holds every
runtime knob the backend needs. Paths are resolved relative to this file so the
app runs identically no matter what the current working directory is.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[1] == backend/app
_APP_DIR = Path(__file__).resolve().parents[1]
# backend/app -> parents[2] == backend  (parents[0]=core, [1]=app, [2]=backend)
_BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration, overridable through environment variables.

    Environment variables are read case-insensitively, e.g. ``CORS_ORIGINS``
    or ``cors_origins``. List values accept a JSON array (``["a","b"]``).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "AirSight API"

    # Absolute path to the generated data artifacts (read-only at runtime).
    data_dir: Path = _APP_DIR / "data_processed"

    # Built single-page-app bundle served in production: backend/../frontend/dist.
    frontend_dist: Path = (_BACKEND_DIR.parent / "frontend" / "dist").resolve()

    # CORS origins for the dev server. "*" is fine for local development.
    cors_origins: list[str] = ["*"]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton :class:`Settings` instance."""
    return Settings()

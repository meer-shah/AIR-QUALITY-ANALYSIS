"""``/api/overview`` — the dashboard summary."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import RepoDep
from app.models.schemas import Overview
from app.services import overview_service

router = APIRouter(tags=["overview"])


@router.get("/overview", response_model=Overview)
def get_overview(repo: RepoDep) -> dict:
    """Return the city-wide air-quality overview for the dashboard."""
    return overview_service.build_overview(repo)

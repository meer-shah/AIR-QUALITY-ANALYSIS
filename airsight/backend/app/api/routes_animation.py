"""``/api/animation`` — time-lapse frames of the interpolated surface."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.api.deps import RepoDep
from app.services.animation_service import build_animation

router = APIRouter(tags=["animation"])


@router.get("/animation")
def animation(
    repo: RepoDep,
    pollutant: str = Query("PM2.5"),
    start: Optional[str] = Query(None, description="YYYY-MM-DD (defaults to dataset start)"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD (defaults to start + 2 days)"),
    resolution: int = Query(14, ge=2, le=20),
    k: int = Query(7, ge=1, le=19),
    method: str = Query("knn", pattern="^(idw|knn)$"),
) -> dict:
    """Hourly time-lapse of the KNN-interpolated surface over a date window.

    Frame count is capped (≤48) and the grid is coarse so the payload stays small.
    """
    return build_animation(repo, pollutant, start, end, resolution, method, k)

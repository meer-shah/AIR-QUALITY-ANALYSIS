"""``/api/ranking`` — stations ordered by a pollutant's period mean."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import RepoDep
from app.models.schemas import RankingResponse
from app.services import ranking_service

router = APIRouter(tags=["ranking"])


@router.get("/ranking", response_model=RankingResponse)
def get_ranking(
    repo: RepoDep,
    pollutant: str = Query("PM2.5", description="Pollutant key, e.g. PM2.5"),
    period: str = Query("annual", description="'annual' or 'YYYY-MM'"),
) -> dict:
    """Return stations ranked by the pollutant value, highest first."""
    return ranking_service.build_ranking(repo, pollutant=pollutant, period=period)

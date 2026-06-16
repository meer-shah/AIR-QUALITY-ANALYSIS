"""``/api/timeseries`` — daily/monthly series for a station or the whole city."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import RepoDep
from app.models.schemas import TimeseriesResponse
from app.services import timeseries_service

router = APIRouter(tags=["timeseries"])


@router.get("/timeseries", response_model=TimeseriesResponse)
def get_timeseries(
    repo: RepoDep,
    station: str = Query("all", description="Station code or 'all'"),
    pollutant: str = Query("PM2.5", description="Pollutant key, e.g. PM2.5"),
    freq: str = Query("daily", description="'daily' or 'monthly'"),
) -> dict:
    """Return the requested pollutant time series."""
    return timeseries_service.build_timeseries(
        repo, station=station, pollutant=pollutant, freq=freq
    )

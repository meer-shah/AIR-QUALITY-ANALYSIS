"""``/api/stations`` and ``/api/stations/{code}``."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import RepoDep
from app.models.schemas import StationDetail, StationsResponse
from app.services import stations_service

router = APIRouter(tags=["stations"])


@router.get("/stations", response_model=StationsResponse)
def get_stations(
    repo: RepoDep,
    pollutant: str = Query("PM2.5", description="Pollutant key, e.g. PM2.5"),
    period: str = Query("annual", description="'annual' or 'YYYY-MM'"),
) -> dict:
    """List every station with its period mean and AQI for the chosen pollutant."""
    return stations_service.list_stations(repo, pollutant=pollutant, period=period)


@router.get("/stations/{code}", response_model=StationDetail)
def get_station(
    repo: RepoDep,
    code: str,
    pollutant: str = Query("PM2.5", description="Pollutant key, e.g. PM2.5"),
    period: str = Query("annual", description="'annual' or 'YYYY-MM'"),
) -> dict:
    """Return one station's full detail, or 404 if the code is unknown."""
    detail = stations_service.station_detail(
        repo, code, pollutant=pollutant, period=period
    )
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Unknown station '{code}'")
    return detail

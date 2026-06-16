"""``/api/interpolate`` (point) and ``/api/interpolate/grid`` (heatmap)."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import RepoDep
from app.models.schemas import EstimateRequest, EstimateResult, GridResponse
from app.services import interpolation_service

router = APIRouter(prefix="/interpolate", tags=["interpolate"])


@router.post("", response_model=EstimateResult)
def post_interpolate(repo: RepoDep, body: EstimateRequest) -> dict:
    """Estimate a pollutant value at an arbitrary lat/lon point."""
    return interpolation_service.estimate(
        repo,
        lat=body.lat,
        lon=body.lon,
        pollutant=body.pollutant,
        period=body.period,
        method=body.method,
        k=body.k,
    )


@router.get("/grid", response_model=GridResponse)
def get_interpolate_grid(
    repo: RepoDep,
    pollutant: str = Query("PM2.5", description="Pollutant key, e.g. PM2.5"),
    period: str = Query("annual", description="'annual' or 'YYYY-MM'"),
    method: str = Query("idw", description="'idw' or 'knn'"),
    k: int = Query(5, ge=1, le=50, description="Neighbours for KNN"),
    resolution: int = Query(24, ge=2, le=60, description="Cells per side"),
) -> dict:
    """Estimate a regular grid of points for a map heatmap overlay."""
    return interpolation_service.grid(
        repo,
        pollutant=pollutant,
        period=period,
        method=method,
        k=k,
        resolution=resolution,
    )

"""``/api/live`` — current air quality + a go-out verdict for any location."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import RepoDep
from app.services.live_service import (
    MAP_SUPPORTED,
    LiveDataError,
    get_live,
    get_live_map,
)

router = APIRouter(tags=["live"])


@router.get("/live")
def live(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
) -> dict:
    """Live air quality for ``(lat, lon)`` from Open-Meteo, with health advice.

    Returns ``503`` if the upstream live service is unreachable so the UI can show
    a clear "live data unavailable" state rather than a generic error.
    """
    try:
        return get_live(lat, lon)
    except LiveDataError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/live/map")
def live_map(
    repo: RepoDep,
    pollutant: str = Query("PM2.5"),
    method: str = Query("knn", pattern="^(idw|knn)$"),
    k: int = Query(7, ge=1, le=19),
) -> dict:
    """Current air quality at every station + an interpolated live surface.

    Uses the notebook's distance-weighted KNN (``method='knn'``, ``k=7`` by
    default — the MAE-tuned value) to interpolate between live station readings.
    ``400`` for an unsupported pollutant, ``503`` if the upstream is unreachable.
    """
    try:
        return get_live_map(repo, pollutant, method, k)
    except LiveDataError as exc:
        if pollutant not in MAP_SUPPORTED:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        raise HTTPException(status_code=503, detail=str(exc)) from exc

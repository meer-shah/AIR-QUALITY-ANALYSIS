"""``/api/geo/bogota`` — the city boundary GeoJSON for the map overlay."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import RepoDep

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/bogota")
def get_bogota(repo: RepoDep) -> dict:
    """Return the Bogotá boundary as a GeoJSON FeatureCollection."""
    return repo.bogota_geojson()

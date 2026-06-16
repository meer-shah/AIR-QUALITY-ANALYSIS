"""Geographic helpers: great-circle distance and bounding boxes (pure functions)."""
from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Iterable

# Mean Earth radius in kilometres.
_EARTH_RADIUS_KM = 6371.0088


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in kilometres."""
    rlat1, rlon1, rlat2, rlon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * asin(sqrt(a))


def bbox(
    points: Iterable[tuple[float, float]], pad: float = 0.0
) -> tuple[float, float, float, float]:
    """Axis-aligned bounding box for ``(lat, lon)`` points.

    Returns ``(min_lat, min_lon, max_lat, max_lon)`` expanded by ``pad`` degrees
    on every side. Raises :class:`ValueError` if no points are supplied.
    """
    lats: list[float] = []
    lons: list[float] = []
    for lat, lon in points:
        lats.append(lat)
        lons.append(lon)
    if not lats:
        raise ValueError("bbox() requires at least one point")
    return (
        min(lats) - pad,
        min(lons) - pad,
        max(lats) + pad,
        max(lons) + pad,
    )

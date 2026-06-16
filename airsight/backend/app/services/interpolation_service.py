"""
Spatial interpolation of pollutant values between monitoring stations.

Two classic deterministic methods, both weighting neighbours by inverse
squared distance (``1 / d²``):

* **IDW** uses *all* stations that have a value for the period.
* **KNN** uses only the ``k`` nearest stations.

A point that coincides with a station (within ~50 m) snaps to that station's
value. The estimate carries an AQI derived from the value when the pollutant is
PM2.5 or PM10; for other pollutants there is no PM-based sub-index, so the AQI is
the neutral "No data" object while ``value`` is still returned.
"""
from __future__ import annotations

from typing import Optional

from app.core import aqi as aqi_core
from app.core.geo import bbox, haversine
from app.data.repository import POLLUTANTS, DataRepository

# A point closer than this (km) to a station is treated as that station.
_SNAP_KM = 0.05
# Padding (degrees) around the station bbox for the grid.
_GRID_PAD = 0.02
# Default and maximum grid resolution (cells per side).
_DEFAULT_RESOLUTION = 24
_MAX_RESOLUTION = 60


def _unit_for(repo: DataRepository, pollutant: str) -> str:
    """Unit string for a pollutant key (falls back to µg/m³)."""
    for p in repo.meta().get("pollutants", []):
        if p["key"] == pollutant:
            return p["unit"]
    return "µg/m³"


def _city_bbox(repo: DataRepository, pad: float = 0.005) -> Optional[tuple]:
    """Bounding box of the Bogotá boundary, like the notebook's predict_on_bogota.

    Returns ``(min_lat, min_lon, max_lat, max_lon)`` padded slightly, or ``None``
    if the boundary GeoJSON is absent/unusable (the grid then falls back to the
    station bbox). The map clips the resulting grid to the polygon, so spanning
    the full city extent reproduces the notebook's city-wide heat-map.
    """
    geo = repo.bogota_geojson()
    feats = geo.get("features") or []
    if not feats:
        return None
    coords = (feats[0].get("geometry") or {}).get("coordinates") or []
    pts = [(c[1], c[0]) for c in coords if isinstance(c, (list, tuple)) and len(c) >= 2]
    if not pts:
        return None
    return bbox(pts, pad=pad)


def _aqi_for(pollutant: str, value: Optional[float]) -> aqi_core.Aqi:
    """AQI for an interpolated value, only meaningful for PM2.5/PM10."""
    if value is None:
        return aqi_core.no_data_aqi()
    if pollutant == "PM2.5":
        return aqi_core.aqi_from_concentrations(value, None)
    if pollutant == "PM10":
        return aqi_core.aqi_from_concentrations(None, value)
    return aqi_core.no_data_aqi()


def _weighted_estimate(
    lat: float,
    lon: float,
    stations_with_value: list[dict],
    method: str,
    k: int,
) -> tuple[Optional[float], list[dict]]:
    """Return ``(value, neighbors)`` for one point.

    ``stations_with_value`` items are ``{code, name, lat, lon, value}`` and must
    already be filtered to those with a non-None value and valid coordinates.
    """
    if not stations_with_value:
        return None, []

    # Distance to every candidate station.
    scored: list[dict] = []
    for st in stations_with_value:
        d = haversine(lat, lon, st["lat"], st["lon"])
        scored.append({**st, "distance_km": d})
    scored.sort(key=lambda s: s["distance_km"])

    # Exact-hit snap: coincides with a station -> that value, weight 1.
    nearest = scored[0]
    if nearest["distance_km"] <= _SNAP_KM:
        neighbors = [
            {
                "code": nearest["code"],
                "name": nearest["name"],
                "distance_km": round(nearest["distance_km"], 2),
                "value": round(float(nearest["value"]), 2),
                "weight": 1.0,
            }
        ]
        return round(float(nearest["value"]), 2), neighbors

    # Choose the contributing set: all (IDW) or the k nearest (KNN).
    contributors = scored if method == "idw" else scored[: max(1, k)]

    # Inverse-squared-distance weights, normalised to sum to 1.
    raw_weights = [1.0 / (s["distance_km"] ** 2) for s in contributors]
    total = sum(raw_weights)
    if total <= 0:
        return None, []

    value = sum(w * float(s["value"]) for w, s in zip(raw_weights, contributors)) / total

    neighbors = [
        {
            "code": s["code"],
            "name": s["name"],
            "distance_km": round(s["distance_km"], 2),
            "value": round(float(s["value"]), 2),
            "weight": round(w / total, 4),
        }
        for w, s in zip(raw_weights, contributors)
    ]
    return round(value, 2), neighbors


def estimate(
    repo: DataRepository,
    lat: float,
    lon: float,
    pollutant: str = "PM2.5",
    period: str = "annual",
    method: str = "idw",
    k: int = 5,
) -> dict:
    """Estimate a pollutant value at an arbitrary point. Returns ``EstimateResult``."""
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"
    if method not in ("idw", "knn"):
        method = "idw"
    k = max(1, k)

    candidates = [
        s
        for s in repo.station_values(pollutant, period)
        if s["value"] is not None and s["lat"] is not None and s["lon"] is not None
    ]
    value, neighbors = _weighted_estimate(lat, lon, candidates, method, k)

    return {
        "lat": lat,
        "lon": lon,
        "pollutant": pollutant,
        "unit": _unit_for(repo, pollutant),
        "period": period,
        "value": value,
        "aqi": _aqi_for(pollutant, value),
        "method": method,
        "k": k,
        "neighbors": neighbors,
    }


def grid(
    repo: DataRepository,
    pollutant: str = "PM2.5",
    period: str = "annual",
    method: str = "idw",
    k: int = 5,
    resolution: int = _DEFAULT_RESOLUTION,
) -> dict:
    """Estimate a regular grid of points across the station bounding box.

    Returns ``{pollutant, unit, bbox, method, cells:[{lat,lon,value,aqi}]}`` where
    each cell's AQI is the compact ``{value,category,color}`` form.
    """
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"
    if method not in ("idw", "knn"):
        method = "idw"
    k = max(1, k)
    resolution = max(2, min(resolution, _MAX_RESOLUTION))

    candidates = [
        s
        for s in repo.station_values(pollutant, period)
        if s["value"] is not None and s["lat"] is not None and s["lon"] is not None
    ]
    unit = _unit_for(repo, pollutant)

    if not candidates:
        # No data to interpolate -> valid-but-empty grid.
        return {
            "pollutant": pollutant,
            "unit": unit,
            "bbox": {"min_lat": 0.0, "min_lon": 0.0, "max_lat": 0.0, "max_lon": 0.0},
            "method": method,
            "cells": [],
        }

    # Prefer the city-boundary extent (notebook-style, city-wide) and fall back
    # to the station bbox if the boundary GeoJSON is unavailable.
    min_lat, min_lon, max_lat, max_lon = _city_bbox(repo) or bbox(
        [(s["lat"], s["lon"]) for s in candidates], pad=_GRID_PAD
    )

    # Cell centres on an evenly-spaced lattice within the padded bbox.
    lat_step = (max_lat - min_lat) / resolution
    lon_step = (max_lon - min_lon) / resolution

    cells: list[dict] = []
    for i in range(resolution):
        cell_lat = min_lat + (i + 0.5) * lat_step
        for j in range(resolution):
            cell_lon = min_lon + (j + 0.5) * lon_step
            value, _ = _weighted_estimate(cell_lat, cell_lon, candidates, method, k)
            a = _aqi_for(pollutant, value)
            cells.append(
                {
                    "lat": round(cell_lat, 6),
                    "lon": round(cell_lon, 6),
                    "value": value,
                    "aqi": {"value": a["value"], "category": a["category"], "color": a["color"]},
                }
            )

    return {
        "pollutant": pollutant,
        "unit": unit,
        "bbox": {
            "min_lat": round(min_lat, 6),
            "min_lon": round(min_lon, 6),
            "max_lat": round(max_lat, 6),
            "max_lon": round(max_lon, 6),
        },
        "method": method,
        "cells": cells,
    }


def grid_from_values(
    repo: DataRepository,
    station_values: list[dict],
    pollutant: str,
    unit: str,
    method: str = "idw",
    k: int = 5,
    resolution: int = _DEFAULT_RESOLUTION,
) -> dict:
    """Interpolate a city grid from an EXTERNALLY supplied set of station values.

    Same cell shape as :func:`grid`, but the anchor values come from the caller
    (e.g. live readings) instead of the historical artifacts. Used by the live map.
    """
    if method not in ("idw", "knn"):
        method = "idw"
    k = max(1, k)
    resolution = max(2, min(resolution, _MAX_RESOLUTION))

    candidates = [
        s
        for s in station_values
        if s.get("value") is not None and s.get("lat") is not None and s.get("lon") is not None
    ]
    if not candidates:
        return {
            "pollutant": pollutant,
            "unit": unit,
            "bbox": {"min_lat": 0.0, "min_lon": 0.0, "max_lat": 0.0, "max_lon": 0.0},
            "method": method,
            "cells": [],
        }

    min_lat, min_lon, max_lat, max_lon = _city_bbox(repo) or bbox(
        [(s["lat"], s["lon"]) for s in candidates], pad=_GRID_PAD
    )
    lat_step = (max_lat - min_lat) / resolution
    lon_step = (max_lon - min_lon) / resolution

    cells: list[dict] = []
    for i in range(resolution):
        cell_lat = min_lat + (i + 0.5) * lat_step
        for j in range(resolution):
            cell_lon = min_lon + (j + 0.5) * lon_step
            value, _ = _weighted_estimate(cell_lat, cell_lon, candidates, method, k)
            a = _aqi_for(pollutant, value)
            cells.append(
                {
                    "lat": round(cell_lat, 6),
                    "lon": round(cell_lon, 6),
                    "value": value,
                    "aqi": {"value": a["value"], "category": a["category"], "color": a["color"]},
                }
            )

    return {
        "pollutant": pollutant,
        "unit": unit,
        "bbox": {
            "min_lat": round(min_lat, 6),
            "min_lon": round(min_lon, 6),
            "max_lat": round(max_lat, 6),
            "max_lon": round(max_lon, 6),
        },
        "method": method,
        "cells": cells,
    }

"""
Time-lapse animation of the interpolated pollution surface — the spatial
notebook's headline deliverable (create_animation_features / TimestampedGeoJson).

For a date window we step through hourly timestamps and, at each one, interpolate
the city surface from that hour's station readings using the SAME distance-weighted
KNN as the rest of the app. Frame count and grid resolution are capped so the
payload stays small (gzip-friendly) and a low-powered device can play it smoothly.
"""
from __future__ import annotations

import datetime as _dt
from typing import Optional

import pandas as pd

from app.core import aqi as aqi_core
from app.services import interpolation_service
from app.data.repository import POLLUTANTS, DataRepository

_MAX_FRAMES = 48
_DEFAULT_RES = 14
_MAX_RES = 20


def _parse(d: Optional[str], fallback: pd.Timestamp) -> pd.Timestamp:
    if not d:
        return fallback
    try:
        return pd.Timestamp(d)
    except (ValueError, TypeError):
        return fallback


def build_animation(
    repo: DataRepository,
    pollutant: str = "PM2.5",
    start: Optional[str] = None,
    end: Optional[str] = None,
    resolution: int = _DEFAULT_RES,
    method: str = "knn",
    k: int = 7,
) -> dict:
    """Return ``{pollutant, unit, method, k, frames:[{time, stations, grid}]}``."""
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"
    method = method if method in ("idw", "knn") else "knn"
    k = max(1, k)
    resolution = max(2, min(resolution, _MAX_RES))

    df = repo.hourly_df()
    meta = repo.meta()
    unit = next((p["unit"] for p in meta.get("pollutants", []) if p["key"] == pollutant), "µg/m³")

    dmin = pd.Timestamp(df["DateTime"].min())
    start_ts = _parse(start, dmin)
    end_ts = _parse(end, start_ts + pd.Timedelta(days=2))
    window = df[(df["DateTime"] >= start_ts) & (df["DateTime"] <= end_ts)]
    if window.empty:
        return {"pollutant": pollutant, "unit": unit, "method": method, "k": k, "frames": []}

    # Evenly sample timestamps down to the frame cap.
    stamps = sorted(window["DateTime"].unique())
    if len(stamps) > _MAX_FRAMES:
        step = len(stamps) / _MAX_FRAMES
        stamps = [stamps[int(i * step)] for i in range(_MAX_FRAMES)]

    coords = {s["code"]: s for s in repo.stations()}
    flag = f"{pollutant}_imputed_flag"
    frames: list[dict] = []
    for ts in stamps:
        rows = window[window["DateTime"] == ts]
        station_values: list[dict] = []
        stations_out: list[dict] = []
        for _, r in rows.iterrows():
            code = r["Station"]
            info = coords.get(code, {})
            lat, lon = info.get("lat"), info.get("lon")
            val = r[pollutant]
            val = None if pd.isna(val) else round(float(val), 2)
            if lat is None or lon is None:
                continue
            station_values.append({"code": code, "name": info.get("name", code), "lat": lat, "lon": lon, "value": val})
            stations_out.append(
                {
                    "code": code, "name": info.get("name", code), "lat": lat, "lon": lon, "value": val,
                    "imputed": bool(r[flag]) if flag in rows.columns else False,
                }
            )
        grid = interpolation_service.grid_from_values(
            repo, station_values, pollutant, unit, method, k, resolution
        )
        frames.append(
            {
                "time": pd.Timestamp(ts).strftime("%Y-%m-%d %H:%M"),
                "stations": stations_out,
                "grid": grid,
            }
        )

    return {
        "pollutant": pollutant,
        "unit": unit,
        "method": method,
        "k": k,
        "start": start_ts.strftime("%Y-%m-%d %H:%M"),
        "end": end_ts.strftime("%Y-%m-%d %H:%M"),
        "frames": frames,
    }

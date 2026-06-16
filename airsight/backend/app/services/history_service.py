"""
Continuous historical air quality for a location, from 2022 to *now*.

The bundled RMCAB dataset only covers 2021. To extend the time series up to the
present, we pull the free, key-less **Open-Meteo Air Quality archive** (CAMS
reanalysis), which provides hourly data from ~2022-09 onward including the latest
hours. We aggregate to daily/monthly means here and cache hard (the past doesn't
change; the tail refreshes a few times a day).

Together with the 2021 RMCAB series, the frontend draws one continuous line:
  2021 (RMCAB ground sensors) → [gap: Jan–Aug 2022] → 2022-09 … now (Open-Meteo).

Only pollutants Open-Meteo provides are supported here (PM2.5, PM10, NO2, O3, CO,
SO2). NO and NOX exist only in the 2021 RMCAB data.
"""
from __future__ import annotations

import datetime
import json
import time
import urllib.error
import urllib.parse
import urllib.request

_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality"
_TIMEOUT = 30
_CACHE_TTL = 6 * 3600  # seconds; the tail of the archive updates a few times/day
_ARCHIVE_START = "2022-09-01"  # earliest Open-Meteo air-quality coverage (probed)
_cache: dict[tuple, tuple[float, dict]] = {}

# Our pollutant key -> (Open-Meteo hourly field, output unit, scale factor).
# CO is returned in µg/m³ by Open-Meteo; we divide by 1000 to match the RMCAB
# mg/m³ convention so the continuous series shares one unit.
_FIELDS = {
    "PM2.5": ("pm2_5", "µg/m³", 1.0),
    "PM10": ("pm10", "µg/m³", 1.0),
    "NO2": ("nitrogen_dioxide", "µg/m³", 1.0),
    "OZONE": ("ozone", "µg/m³", 1.0),
    "CO": ("carbon_monoxide", "mg/m³", 0.001),
    "SO2": ("sulphur_dioxide", "µg/m³", 1.0),
}

SUPPORTED = list(_FIELDS.keys())


class HistoryDataError(RuntimeError):
    """Raised when the upstream archive can't be reached or parsed."""


def _fetch(lat: float, lon: float, field: str, end: str) -> dict:
    params = {
        "latitude": f"{lat:.4f}",
        "longitude": f"{lon:.4f}",
        "hourly": field,
        "start_date": _ARCHIVE_START,
        "end_date": end,
        "timezone": "auto",
    }
    url = f"{_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "AirSight/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        raise HistoryDataError(f"Could not reach the air-quality archive: {exc}") from exc


def _aggregate(times: list[str], values: list, freq: str, scale: float) -> list[dict]:
    """Mean by day (``YYYY-MM-DD``) or month (``YYYY-MM-01``), skipping nulls."""
    sums: dict[str, float] = {}
    counts: dict[str, int] = {}
    for t, v in zip(times, values):
        if v is None or not isinstance(v, (int, float)):
            continue
        key = t[:7] + "-01" if freq == "monthly" else t[:10]
        sums[key] = sums.get(key, 0.0) + float(v)
        counts[key] = counts.get(key, 0) + 1
    points = [
        {"date": k, "value": round(sums[k] / counts[k] * scale, 3)}
        for k in sorted(sums)
        if counts[k] > 0
    ]
    return points


def get_history(lat: float, lon: float, pollutant: str, freq: str = "monthly") -> dict:
    """Continuous Open-Meteo series for ``(lat, lon)`` from 2022-09 to today."""
    if pollutant not in _FIELDS:
        raise HistoryDataError(
            f"Pollutant {pollutant!r} is not available from the live archive "
            f"(supported: {', '.join(SUPPORTED)})."
        )
    freq = "daily" if freq == "daily" else "monthly"
    field, unit, scale = _FIELDS[pollutant]
    end = datetime.date.today().isoformat()

    key = (round(lat, 2), round(lon, 2), pollutant, freq)
    now = time.monotonic()
    cached = _cache.get(key)
    if cached and now - cached[0] < _CACHE_TTL:
        return cached[1]

    raw = _fetch(lat, lon, field, end)
    hourly = raw.get("hourly", {}) or {}
    points = _aggregate(hourly.get("time", []) or [], hourly.get(field, []) or [], freq, scale)

    payload = {
        "lat": lat,
        "lon": lon,
        "pollutant": pollutant,
        "unit": unit,
        "freq": freq,
        "source": "Open-Meteo (CAMS)",
        "start": points[0]["date"] if points else _ARCHIVE_START,
        "end": end,
        "points": points,
    }
    _cache[key] = (now, payload)
    return payload

"""
The single data-access point for the whole backend.

:class:`DataRepository` lazily loads and caches the artifacts produced by
``scripts/build_dataset.py`` (``meta.json``, ``stations.json``, ``daily.csv.gz``,
``monthly.csv.gz``, ``bogota.geojson``) and exposes small, intention-revealing
query methods. Services depend only on this class — they never touch the disk.

Pandas NaN is converted to JSON ``null`` (Python ``None``) at the boundary so
callers never have to think about NaN.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

from app.core.config import Settings, get_settings

# Canonical pollutant order (matches meta.json / the API contract).
POLLUTANTS: list[str] = ["PM2.5", "PM10", "NO", "NO2", "NOX", "CO", "OZONE"]


def _clean(value: object) -> Optional[float]:
    """Convert a possibly-NaN numeric into a JSON-safe ``float`` or ``None``."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _round(value: Optional[float], ndigits: int = 2) -> Optional[float]:
    """Round a cleaned value, preserving ``None``."""
    return None if value is None else round(value, ndigits)


class DataRepository:
    """Lazily-loaded, cached access to the processed data artifacts."""

    def __init__(self, settings: Settings) -> None:
        self._dir: Path = settings.data_dir
        self._meta: Optional[dict] = None
        self._stations: Optional[list[dict]] = None
        self._stations_by_code: Optional[dict[str, dict]] = None
        self._daily: Optional[pd.DataFrame] = None
        self._monthly: Optional[pd.DataFrame] = None
        self._geojson: Optional[dict] = None
        self._insights: Optional[dict] = None
        self._explore: Optional[dict] = None
        self._hourly: Optional[pd.DataFrame] = None

    # -- raw artifact loaders (cached on first use) -------------------------

    def meta(self) -> dict:
        """Return the parsed ``meta.json`` dict."""
        if self._meta is None:
            path = self._dir / "meta.json"
            self._meta = json.loads(path.read_text(encoding="utf-8"))
        return self._meta

    def stations(self) -> list[dict]:
        """Return the list of station records from ``stations.json``."""
        if self._stations is None:
            path = self._dir / "stations.json"
            self._stations = json.loads(path.read_text(encoding="utf-8"))
            self._stations_by_code = {s["code"]: s for s in self._stations}
        return self._stations

    def station(self, code: str) -> Optional[dict]:
        """Return a single station record by code, or ``None`` if unknown."""
        self.stations()  # ensure the index is built
        assert self._stations_by_code is not None
        return self._stations_by_code.get(code)

    def daily_df(self) -> pd.DataFrame:
        """Return the daily means dataframe (``date`` parsed to datetime)."""
        if self._daily is None:
            self._daily = self._read_csv("daily.csv.gz")
        return self._daily

    def monthly_df(self) -> pd.DataFrame:
        """Return the monthly means dataframe (``date`` parsed to datetime)."""
        if self._monthly is None:
            self._monthly = self._read_csv("monthly.csv.gz")
        return self._monthly

    def bogota_geojson(self) -> dict:
        """Return the Bogotá boundary GeoJSON.

        If ``bogota.geojson`` is absent we return an empty FeatureCollection so
        the map endpoint stays valid rather than 500-ing.
        """
        if self._geojson is None:
            path = self._dir / "bogota.geojson"
            if path.exists():
                self._geojson = json.loads(path.read_text(encoding="utf-8"))
            else:
                self._geojson = {"type": "FeatureCollection", "features": []}
        return self._geojson

    def insights(self) -> dict:
        """Return the model-validation results from ``insights.json``.

        Produced by ``scripts/build_insights.py``. If absent (e.g. only the base
        ETL was run) we return an empty dict so the endpoint stays valid.
        """
        if self._insights is None:
            path = self._dir / "insights.json"
            if path.exists():
                self._insights = json.loads(path.read_text(encoding="utf-8"))
            else:
                self._insights = {}
        return self._insights

    def explore(self) -> dict:
        """Return the precomputed EXPLORE analytics from ``explore.json``."""
        if self._explore is None:
            path = self._dir / "explore.json"
            self._explore = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        return self._explore

    def hourly_df(self) -> pd.DataFrame:
        """Return the full hourly frame (DateTime parsed). Loaded lazily on first use."""
        if self._hourly is None:
            path = self._dir / "hourly.csv.gz"
            df = pd.read_csv(path, compression="gzip")
            df["DateTime"] = pd.to_datetime(df["DateTime"], errors="coerce")
            self._hourly = df
        return self._hourly

    def flagged_timeseries(
        self, station: str, pollutant: str, freq: str = "daily"
    ) -> list[dict]:
        """Time series of ``pollutant`` with the share of imputed hours per point.

        Powers the real-vs-imputed overlay. ``imputed_share`` is the fraction of
        that period's hours that were model-filled (0 = fully measured, 1 = fully
        imputed). ``station`` may be a code or ``"all"``.
        """
        if pollutant not in POLLUTANTS:
            return []
        df = self.hourly_df()
        flag = f"{pollutant}_imputed_flag"
        sub = df if station == "all" else df.loc[df["Station"] == station]
        if sub.empty or pollutant not in sub.columns:
            return []
        rule = "MS" if freq == "monthly" else "D"
        g = sub.set_index("DateTime")
        agg = g.resample(rule).agg(value=(pollutant, "mean"), share=(flag, "mean"))
        points: list[dict] = []
        for date, row in agg.iterrows():
            points.append(
                {
                    "date": pd.Timestamp(date).strftime("%Y-%m-%d"),
                    "value": _round(_clean(row["value"])),
                    "imputed_share": _round(_clean(row["share"]), 3),
                }
            )
        return points

    def _read_csv(self, name: str) -> pd.DataFrame:
        """Read a gzipped CSV artifact and parse its ``date`` column."""
        path = self._dir / name
        df = pd.read_csv(path, compression="gzip")
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        return df

    # -- query helpers ------------------------------------------------------

    def _period_df(self, period: str) -> tuple[pd.DataFrame, bool]:
        """Pick the source frame for a period and whether it is a single month.

        ``annual`` -> the full daily frame (averaged across the year).
        ``YYYY-MM`` -> the daily frame filtered to that month.
        """
        if period == "annual":
            return self.daily_df(), False
        # YYYY-MM month filter against the daily frame.
        try:
            year_str, month_str = period.split("-")
            year, month = int(year_str), int(month_str)
        except (ValueError, AttributeError):
            return self.daily_df().iloc[0:0], True  # unknown period -> empty
        df = self.daily_df()
        mask = (df["date"].dt.year == year) & (df["date"].dt.month == month)
        return df.loc[mask], True

    def station_period_value(
        self, code: str, pollutant: str, period: str = "annual"
    ) -> Optional[float]:
        """Mean of ``pollutant`` for one station over ``period``.

        ``period`` is ``annual`` (mean of all daily rows) or ``YYYY-MM`` (mean of
        that month's daily rows). Returns ``None`` when there is no data.
        """
        if pollutant not in POLLUTANTS:
            return None
        df, _ = self._period_df(period)
        rows = df.loc[df["Station"] == code, pollutant]
        if rows.empty:
            return None
        return _round(_clean(rows.mean()))

    def station_values(
        self, pollutant: str, period: str = "annual"
    ) -> list[dict]:
        """Per-station mean of ``pollutant`` over ``period``, with coordinates.

        Returns ``[{code, name, lat, lon, value}]`` for every station, in the
        canonical station order. ``value`` is ``None`` where data is missing.
        """
        df, _ = self._period_df(period)
        if pollutant in df.columns:
            means = df.groupby("Station")[pollutant].mean().to_dict()
        else:
            means = {}

        out: list[dict] = []
        for st in self.stations():
            out.append(
                {
                    "code": st["code"],
                    "name": st["name"],
                    "lat": _clean(st.get("lat")),
                    "lon": _clean(st.get("lon")),
                    "value": _round(_clean(means.get(st["code"]))),
                }
            )
        return out

    def timeseries(
        self, station: str, pollutant: str, freq: str = "daily"
    ) -> list[dict]:
        """Time series of ``pollutant`` for ``station`` at ``freq``.

        ``station`` may be a station code or ``"all"`` (mean across stations per
        date). ``freq`` is ``daily`` or ``monthly``. Returns ``[{date, value}]``
        sorted by date, with NaN means rendered as ``None``.
        """
        df = self.monthly_df() if freq == "monthly" else self.daily_df()
        if pollutant not in df.columns:
            return []

        if station == "all":
            grouped = df.groupby("date")[pollutant].mean()
        else:
            sub = df.loc[df["Station"] == station]
            if sub.empty:
                return []
            grouped = sub.groupby("date")[pollutant].mean()

        points: list[dict] = []
        for date, value in grouped.sort_index().items():
            points.append(
                {
                    "date": pd.Timestamp(date).strftime("%Y-%m-%d"),
                    "value": _round(_clean(value)),
                }
            )
        return points


@lru_cache(maxsize=1)
def get_repository() -> DataRepository:
    """Return the process-wide :class:`DataRepository` singleton."""
    return DataRepository(get_settings())

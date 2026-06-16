"""
Pydantic v2 models for every API response/request shape.

These mirror the TypeScript types in ``docs/API_CONTRACT.md`` field-for-field.
Routers declare these as ``response_model`` where practical; services return
plain dicts that validate against them.
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

# --- shared --------------------------------------------------------------

Method = Literal["idw", "knn"]


class Aqi(BaseModel):
    """An AQI reading: value, category label, hex colour and dominant pollutant."""

    value: Optional[int] = None
    category: str
    color: str
    dominant: Optional[str] = None


class PollutantMeta(BaseModel):
    """One pollutant entry as stored in ``meta.json``."""

    key: str
    label: str
    unit: str
    name: str


class AqiBand(BaseModel):
    """One row of the AQI legend returned by ``/api/meta``."""

    lo: int
    hi: int
    category: str
    color: str


# --- /api/health ---------------------------------------------------------


class Health(BaseModel):
    status: str
    rows: int
    stations: int


# --- /api/meta -----------------------------------------------------------


class Meta(BaseModel):
    city: str
    source: str
    year: int
    rows: int
    stations: int
    date_min: str
    date_max: str
    pollutants: list[PollutantMeta]
    aqi_scale: list[AqiBand]
    # How the dataset was completed (counts by imputation method). Free-form so
    # the ETL can evolve the breakdown without breaking the schema.
    imputation: Optional[dict] = None


# --- /api/stations -------------------------------------------------------


class StationSummary(BaseModel):
    code: str
    name: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    locality: str
    zone: str
    type: str
    value: Optional[float] = None
    unit: str
    aqi: Aqi


class StationsResponse(BaseModel):
    pollutant: str
    unit: str
    stations: list[StationSummary]


class PollutantValue(BaseModel):
    """A pollutant's period mean with its WHO guideline (used in detail/overview)."""

    key: str
    label: str
    unit: str
    mean: Optional[float] = None
    whoGuideline: Optional[float] = None


class StationDetail(StationSummary):
    altitude_m: Optional[float] = None
    address: str
    records: int
    pollutants: list[PollutantValue]
    imputed_share: dict[str, float]


# --- /api/overview -------------------------------------------------------


class OverviewMeta(BaseModel):
    city: str
    year: int
    date_min: str
    date_max: str
    stations: int
    rows: int


class StationRef(BaseModel):
    code: str
    name: str
    value: Optional[float] = None


class AqiDistributionItem(BaseModel):
    category: str
    color: str
    count: int


class ByPollutantPct(BaseModel):
    key: str
    pct: float


class DataQuality(BaseModel):
    overall_imputed_pct: float
    by_pollutant: list[ByPollutantPct]


class Overview(BaseModel):
    meta: OverviewMeta
    headline_aqi: Aqi
    avg_pm25: Optional[float] = None
    avg_pm10: Optional[float] = None
    worst_station: StationRef
    best_station: StationRef
    aqi_distribution: list[AqiDistributionItem]
    pollutant_averages: list[PollutantValue]
    data_quality: DataQuality


# --- /api/timeseries -----------------------------------------------------


class TimePoint(BaseModel):
    date: str
    value: Optional[float] = None


class TimeseriesResponse(BaseModel):
    station: str
    pollutant: str
    unit: str
    points: list[TimePoint]


# --- /api/ranking --------------------------------------------------------


class RankingItem(BaseModel):
    code: str
    name: str
    value: Optional[float] = None
    aqi: Optional[int] = None
    category: str
    color: str


class RankingResponse(BaseModel):
    pollutant: str
    unit: str
    items: list[RankingItem]


# --- /api/interpolate ----------------------------------------------------


class EstimateRequest(BaseModel):
    lat: float
    lon: float
    pollutant: str = "PM2.5"
    period: str = "annual"
    method: Method = "idw"
    k: int = Field(default=5, ge=1, le=50)


class Neighbor(BaseModel):
    code: str
    name: str
    distance_km: float
    value: Optional[float] = None
    weight: float


class EstimateResult(BaseModel):
    lat: float
    lon: float
    pollutant: str
    unit: str
    period: str
    value: Optional[float] = None
    aqi: Aqi
    method: Method
    k: int
    neighbors: list[Neighbor]


class GridBBox(BaseModel):
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float


class GridCellAqi(BaseModel):
    value: Optional[int] = None
    category: str
    color: str


class GridCell(BaseModel):
    lat: float
    lon: float
    value: Optional[float] = None
    aqi: GridCellAqi


class GridResponse(BaseModel):
    pollutant: str
    unit: str
    bbox: GridBBox
    method: Method
    cells: list[GridCell]

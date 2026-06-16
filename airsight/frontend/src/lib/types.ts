/**
 * TypeScript shapes mirroring docs/API_CONTRACT.md byte-for-byte.
 * Field names, pollutant keys and units MUST match the contract.
 */

/** Canonical pollutant keys, in contract order. */
export type PollutantKey = 'PM2.5' | 'PM10' | 'NO' | 'NO2' | 'NOX' | 'CO' | 'OZONE';

export const POLLUTANT_KEYS: PollutantKey[] = [
  'PM2.5',
  'PM10',
  'NO',
  'NO2',
  'NOX',
  'CO',
  'OZONE',
];

/** A pollutant descriptor as returned in meta.pollutants. */
export interface PollutantMeta {
  key: PollutantKey;
  label: string;
  unit: string;
  name: string;
}

/** One AQI band from the data legend. */
export interface AqiScaleBand {
  range: string;
  category: string;
  color: string;
}

/** Computed AQI for a value (PM2.5 + PM10 driven). */
export interface Aqi {
  value: number | null;
  category: string;
  color: string;
  dominant: string | null;
}

export interface Meta {
  city: string;
  source: string;
  year: number;
  rows: number;
  stations: number;
  date_min: string;
  date_max: string;
  pollutants: PollutantMeta[];
}

/** /api/meta returns meta.json plus the AQI legend. */
export interface MetaResponse extends Meta {
  aqi_scale: AqiScaleBand[];
}

export interface HealthResponse {
  status: string;
  rows: number;
  stations: number;
}

export interface StationSummary {
  code: string;
  name: string;
  lat: number;
  lon: number;
  locality: string;
  zone: string;
  type: string;
  value: number | null;
  unit: string;
  aqi: Aqi;
}

export interface PollutantReading {
  key: PollutantKey;
  label: string;
  unit: string;
  mean: number | null;
  whoGuideline?: number | null;
}

export interface StationDetail extends StationSummary {
  altitude_m: number | null;
  address: string;
  records: number;
  pollutants: PollutantReading[];
  imputed_share: Record<string, number>;
}

export interface StationsResponse {
  pollutant: PollutantKey;
  unit: string;
  stations: StationSummary[];
}

export interface TimeseriesPoint {
  date: string;
  value: number | null;
}

export interface TimeseriesResponse {
  station: string;
  pollutant: PollutantKey;
  unit: string;
  points: TimeseriesPoint[];
}

/** One point in the continuous live archive (Open-Meteo / CAMS). */
export interface HistoryPoint {
  date: string;
  value: number;
}

/**
 * /api/history — the continuous archive that extends the 2021 RMCAB series
 * forward. Coverage starts ~2022-09-01 and runs to today for a coordinate.
 * Supported pollutants: see CONTINUOUS_POLLUTANTS. NO/NOX → HTTP 400,
 * upstream outage → HTTP 503.
 */
export interface HistoryResponse {
  lat: number;
  lon: number;
  pollutant: HistoryPollutant;
  unit: string;
  freq: 'daily' | 'monthly';
  source: string;
  start: string;
  end: string;
  points: HistoryPoint[];
}

/**
 * Pollutants the live archive carries. Note SO2 is live-only (no 2021 RMCAB
 * column); NO/NOX are 2021-only and rejected by /api/history with a 400.
 */
export const CONTINUOUS_POLLUTANTS = [
  'PM2.5',
  'PM10',
  'NO2',
  'OZONE',
  'CO',
  'SO2',
] as const;

export type HistoryPollutant = (typeof CONTINUOUS_POLLUTANTS)[number];

/** Pollutants RMCAB 2021 also covers, so they can carry a 2021 prefix. */
export const RMCAB_2021_POLLUTANTS = [
  'PM2.5',
  'PM10',
  'NO2',
  'OZONE',
  'CO',
] as const;

export interface RankingItem {
  code: string;
  name: string;
  value: number | null;
  aqi: number | null;
  category: string;
  color: string;
}

export interface RankingResponse {
  pollutant: PollutantKey;
  unit: string;
  items: RankingItem[];
}

export interface AqiDistributionItem {
  category: string;
  color: string;
  count: number;
}

export interface Overview {
  meta: {
    city: string;
    year: number;
    date_min: string;
    date_max: string;
    stations: number;
    rows: number;
  };
  headline_aqi: Aqi;
  avg_pm25: number;
  avg_pm10: number;
  worst_station: { code: string; name: string; value: number };
  best_station: { code: string; name: string; value: number };
  aqi_distribution: AqiDistributionItem[];
  pollutant_averages: PollutantReading[];
  data_quality: {
    overall_imputed_pct: number;
    by_pollutant: { key: PollutantKey; pct: number }[];
  };
}

export type InterpolationMethod = 'idw' | 'knn';

export interface EstimateNeighbor {
  code: string;
  name: string;
  distance_km: number;
  value: number | null;
  weight: number;
}

export interface EstimateRequest {
  lat: number;
  lon: number;
  pollutant: PollutantKey;
  period?: string;
  method?: InterpolationMethod;
  k?: number;
}

export interface EstimateResult {
  lat: number;
  lon: number;
  pollutant: PollutantKey;
  unit: string;
  period: string;
  value: number | null;
  aqi: Aqi;
  method: InterpolationMethod;
  k: number;
  neighbors: EstimateNeighbor[];
}

export interface GridCell {
  lat: number;
  lon: number;
  value: number | null;
  /** Compact AQI for the cell (matches the backend's nested object). */
  aqi: { value: number | null; category: string; color: string };
}

/** Grid bounding box, matching the backend's object shape. */
export interface GridBBox {
  min_lat: number;
  min_lon: number;
  max_lat: number;
  max_lon: number;
}

export interface GridResponse {
  pollutant: PollutantKey;
  unit: string;
  bbox: GridBBox;
  method: InterpolationMethod;
  cells: GridCell[];
}

/** GeoJSON FeatureCollection (loosely typed; we only render geometry). */
export interface GeoJsonResponse {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/** A single GeoJSON feature — we only read the geometry's coordinates. */
export interface GeoJsonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    /** Bogotá boundary ships as a LineString ring of [lon, lat] pairs. */
    type: string;
    coordinates: number[][] | number[][][];
  };
}

/**
 * /api/insights — the backend "story": pipeline, the two modelling challenges
 * (missing-data prediction + spatial KNN), and the imputation breakdown.
 * Shapes mirror the live endpoint byte-for-byte.
 */
export interface InsightsPipelineStep {
  step: number;
  name: string;
  summary: string;
}

export interface InsightsImputationMethod {
  key: string;
  label: string;
  /** Mean absolute error (lower is better), in `unit`. */
  mae: number;
  n: number;
}

export interface InsightsImputation {
  challenge: string;
  target: string;
  unit: string;
  holdout_pct: number;
  /** Baseline strategies, sorted best (lowest MAE) first. */
  methods: InsightsImputationMethod[];
  best_baseline: string | null;
  production_model: { label: string; note: string; reported_mae?: number | null };
}

/** One bucket of the gap-size distribution (consecutive imputed-hour runs). */
export interface GapBucket {
  bucket: string;
  gaps: number;
}

export interface InsightsSpatialKnnPoint {
  k: number;
  mae: number;
  n: number;
}

export interface InsightsSpatialKnn {
  challenge: string;
  target: string;
  unit: string;
  method: string;
  excluded_stations: string[];
  timestep_hours: number;
  by_k: InsightsSpatialKnnPoint[];
  best_k: number | null;
  best_mae: number | null;
}

export interface InsightsPerPollutant {
  key: string;
  observed: number;
  imputed: number;
  imputed_pct: number;
  by_method: Record<string, number>;
}

export interface InsightsImputationBreakdown {
  total_rows: number;
  total_cells: number;
  overall_imputed_cells: number;
  overall_imputed_pct: number;
  by_method_totals: Record<string, number>;
  per_pollutant: InsightsPerPollutant[];
}

export interface Insights {
  city: string;
  pipeline: InsightsPipelineStep[];
  imputation: InsightsImputation;
  spatial_knn: InsightsSpatialKnn;
  imputation_breakdown: InsightsImputationBreakdown;
  /** Per-pollutant gap-size distribution (consecutive imputed-hour runs). */
  gap_distribution?: Record<string, GapBucket[]>;
}

/**
 * /api/live/map — current conditions + a live interpolated surface for the same
 * city the 2021 analysis covers (Open-Meteo / CAMS proxy).
 *
 * A live station mirrors the historical `StationSummary` but is leaner: the live
 * source has no station metadata, so `locality`, `zone` and `type` are absent.
 * Supported pollutants are the six in `CONTINUOUS_POLLUTANTS` (PM2.5, PM10, NO2,
 * OZONE, CO, SO2). NO/NOX → HTTP 400; upstream outage → HTTP 503.
 */
export interface LiveMapStation {
  code: string;
  name: string;
  lat: number;
  lon: number;
  value: number | null;
  unit: string;
  aqi: Aqi;
}

export interface LiveMapResponse {
  /** Reading time, e.g. "2026-06-15T20:00"; null when unknown. */
  time: string | null;
  source: string;
  pollutant: string;
  /** CO is mg/m³, the rest µg/m³. */
  unit: string;
  stations: LiveMapStation[];
  /** Interpolated surface — same shape as the historical /interpolate/grid. */
  grid: GridResponse;
}

/**
 * /api/live — current conditions via the Open-Meteo proxy (global).
 * `ok_to_go_out` drives the go-out status chip on the Now page.
 * Note: `pollutants` may include extras (e.g. SO₂) beyond the canonical
 * dataset keys, so labels/keys are plain strings here.
 */
export type GoOutStatus = 'yes' | 'caution' | 'limit' | 'no' | 'unknown';

export interface LiveAdvice {
  level: string;
  ok_to_go_out: GoOutStatus;
  headline: string;
  detail: string;
}

export interface LivePollutant {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  sub_aqi: number | null;
}

export interface LiveForecastPoint {
  time: string;
  aqi: number | null;
}

export interface Live {
  lat: number;
  lon: number;
  time: string | null;
  timezone: string | null;
  source: string;
  aqi: Aqi;
  advice: LiveAdvice;
  pollutants: LivePollutant[];
  forecast: LiveForecastPoint[];
}

/* --- /api/explore (EDA analytics) --------------------------------------- */

export interface CorrelationMatrix {
  labels: string[];
  /** Row-major Pearson matrix aligned to `labels`; null where undefined. */
  matrix: (number | null)[][];
}

export interface DistributionData {
  /** HIST_BINS+1 bin edges. */
  bin_edges: number[];
  /** Counts keyed by station code, plus 'all' for the city. */
  series: Record<string, number[]>;
}

export interface BoxplotItem {
  station: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface ProfileSeries {
  /** x labels: 0..23 for hourly, weekday names for weekly. */
  labels: (number | string)[];
  mean: (number | null)[];
  std: (number | null)[];
}

export interface StationProfile {
  hourly: ProfileSeries;
  weekly: ProfileSeries;
  annual_mean: number | null;
}

export interface ScatterSample {
  pollutants: string[];
  /** Each row is values aligned to `pollutants`. */
  rows: (number | null)[][];
}

export interface ExploreResponse {
  pollutants: string[];
  stations: string[];
  correlation: CorrelationMatrix;
  distributions: Record<string, DistributionData>;
  boxplots: Record<string, BoxplotItem[]>;
  /** profiles[pollutant][stationOrAll] */
  profiles: Record<string, Record<string, StationProfile>>;
  scatter: ScatterSample;
}

/* --- /api/timeseries/flagged (real-vs-imputed overlay) ------------------ */

export interface FlaggedPoint {
  date: string;
  value: number | null;
  /** Fraction of the period's hours that were imputed (0..1). */
  imputed_share: number | null;
}

export interface FlaggedTimeseriesResponse {
  station: string;
  pollutant: string;
  unit: string;
  freq: 'daily' | 'monthly';
  points: FlaggedPoint[];
}

/* --- /api/animation (time-lapse surface) -------------------------------- */

export interface AnimationStation {
  code: string;
  name: string;
  lat: number;
  lon: number;
  value: number | null;
  imputed: boolean;
}

export interface AnimationFrame {
  time: string;
  stations: AnimationStation[];
  grid: GridResponse;
}

export interface AnimationResponse {
  pollutant: string;
  unit: string;
  method: string;
  k: number;
  start: string;
  end: string;
  frames: AnimationFrame[];
}

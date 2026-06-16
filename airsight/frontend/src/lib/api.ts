/**
 * Typed API client for every endpoint in docs/API_CONTRACT.md.
 *
 * Base URL is '' so requests are relative ('/api/...'). In dev, Vite proxies
 * '/api' to the FastAPI backend; in prod, FastAPI serves this app same-origin.
 */
import type {
  AnimationResponse,
  EstimateRequest,
  EstimateResult,
  ExploreResponse,
  FlaggedTimeseriesResponse,
  GeoJsonResponse,
  GridResponse,
  HealthResponse,
  HistoryResponse,
  Insights,
  InterpolationMethod,
  Live,
  LiveMapResponse,
  MetaResponse,
  Overview,
  PollutantKey,
  RankingResponse,
  StationDetail,
  StationsResponse,
  TimeseriesResponse,
} from './types';

const API_BASE = '';

/** Error carrying the HTTP status so callers can branch on it if needed. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Build a query string from defined params (skips undefined/null). */
function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** Fetch JSON with consistent error handling. */
async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError('Network error — is the backend running?', 0);
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(detail, res.status);
  }

  return (await res.json()) as T;
}

export const api = {
  health(): Promise<HealthResponse> {
    return fetchJson<HealthResponse>('/api/health');
  },

  meta(): Promise<MetaResponse> {
    return fetchJson<MetaResponse>('/api/meta');
  },

  overview(): Promise<Overview> {
    return fetchJson<Overview>('/api/overview');
  },

  insights(): Promise<Insights> {
    return fetchJson<Insights>('/api/insights');
  },

  stations(
    pollutant: PollutantKey = 'PM2.5',
    period?: string,
  ): Promise<StationsResponse> {
    return fetchJson<StationsResponse>(`/api/stations${qs({ pollutant, period })}`);
  },

  stationDetail(code: string, pollutant?: PollutantKey): Promise<StationDetail> {
    return fetchJson<StationDetail>(
      `/api/stations/${encodeURIComponent(code)}${qs({ pollutant })}`,
    );
  },

  timeseries(
    station: string,
    pollutant: PollutantKey,
    freq: 'daily' | 'monthly',
  ): Promise<TimeseriesResponse> {
    return fetchJson<TimeseriesResponse>(
      `/api/timeseries${qs({ station, pollutant, freq })}`,
    );
  },

  ranking(pollutant: PollutantKey, period?: string): Promise<RankingResponse> {
    return fetchJson<RankingResponse>(`/api/ranking${qs({ pollutant, period })}`);
  },

  /**
   * Continuous archive (Open-Meteo / CAMS) for a coordinate, ~2022-09 → now.
   * Pair with `timeseries('all', …)` (2021 RMCAB) for a full 2021 → now line.
   * Throws `ApiError.status === 400` for unsupported pollutants (NO/NOX) and
   * `503` when the upstream archive is unreachable.
   */
  history(opts: {
    lat: number;
    lon: number;
    pollutant: string;
    freq?: 'daily' | 'monthly';
  }): Promise<HistoryResponse> {
    const { lat, lon, pollutant, freq = 'monthly' } = opts;
    return fetchJson<HistoryResponse>(
      `/api/history${qs({ lat, lon, pollutant, freq })}`,
    );
  },

  interpolate(body: EstimateRequest): Promise<EstimateResult> {
    return fetchJson<EstimateResult>('/api/interpolate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  grid(params: {
    pollutant: PollutantKey;
    period?: string;
    method?: InterpolationMethod;
    k?: number;
    resolution?: number;
  }): Promise<GridResponse> {
    return fetchJson<GridResponse>(`/api/interpolate/grid${qs(params)}`);
  },

  bogota(): Promise<GeoJsonResponse> {
    return fetchJson<GeoJsonResponse>('/api/geo/bogota');
  },

  /**
   * Current conditions + go-out advice for a coordinate (Open-Meteo proxy).
   * The endpoint returns 503 when the upstream live source is unreachable;
   * callers can branch on `ApiError.status === 503` for a friendly message.
   */
  live(lat: number, lon: number): Promise<Live> {
    return fetchJson<Live>(`/api/live${qs({ lat, lon })}`);
  },

  /**
   * Current conditions + a live interpolated surface for the analysis city
   * (Open-Meteo / CAMS proxy). Supported pollutants: PM2.5, PM10, NO2, OZONE,
   * CO, SO2. Throws `ApiError.status === 400` for unsupported pollutants
   * (NO/NOX) and `503` when the upstream live source is unreachable.
   */
  liveMap(pollutant: string): Promise<LiveMapResponse> {
    return fetchJson<LiveMapResponse>(`/api/live/map${qs({ pollutant })}`);
  },

  /** Precomputed exploratory analytics: correlation, distributions, box-plots,
   *  diurnal/weekly profiles and a scatter sample. */
  explore(): Promise<ExploreResponse> {
    return fetchJson<ExploreResponse>('/api/explore');
  },

  /** Time series with the share of imputed hours per point (real-vs-imputed). */
  timeseriesFlagged(
    station: string,
    pollutant: PollutantKey,
    freq: 'daily' | 'monthly' = 'daily',
  ): Promise<FlaggedTimeseriesResponse> {
    return fetchJson<FlaggedTimeseriesResponse>(
      `/api/timeseries/flagged${qs({ station, pollutant, freq })}`,
    );
  },

  /** Hourly time-lapse frames of the KNN-interpolated surface over a window. */
  animation(params: {
    pollutant: PollutantKey;
    start?: string;
    end?: string;
    resolution?: number;
    k?: number;
  }): Promise<AnimationResponse> {
    return fetchJson<AnimationResponse>(`/api/animation${qs(params)}`);
  },
};

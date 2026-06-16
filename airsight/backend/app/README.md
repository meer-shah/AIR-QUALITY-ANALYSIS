# AirSight backend

FastAPI service for Bogotá air-quality analysis (RMCAB 2021). It reads the
pre-generated data artifacts in `data_processed/` and exposes the REST API
defined in `docs/API_CONTRACT.md` under the `/api` prefix.

## Layers (each depends only on the one below)

```
api/        Thin FastAPI routers. Parse query/body, call a service, return its dict.
  ↓
services/   Business logic. Compose repository data into the exact contract shapes.
  ↓
data/       repository.py — the ONE class that reads & caches the artifacts.
  ↓
core/       Pure helpers: config (settings/paths), aqi (EPA math), geo (haversine/bbox).
```

`models/schemas.py` holds the Pydantic v2 response/request models; routers use
them as `response_model`.

### Folder map

| Path | What lives here |
|---|---|
| `core/config.py` | `Settings` (data dir, CORS, frontend dist path). |
| `core/aqi.py` | EPA AQI from PM2.5/PM10, category legend, WHO guidelines. |
| `core/geo.py` | `haversine()`, `bbox()`. |
| `data/repository.py` | `DataRepository` + `get_repository()` singleton. |
| `services/` | One module per feature (stations, overview, timeseries, ranking, interpolation). |
| `api/` | One router module per endpoint group + `deps.py`. |
| `main.py` | App factory: CORS, routers, `/api/health`, SPA serving. |

## Data artifacts (read-only, generated separately)

`data_processed/`: `meta.json`, `stations.json`, `daily.csv.gz`, `monthly.csv.gz`,
`hourly.csv.gz`, `bogota.geojson`. Produced by `scripts/build_dataset.py`. The
backend never writes these. `bogota.geojson` is optional — its endpoint returns an
empty FeatureCollection if absent.

## Run

```bash
# from backend/
pip install -r requirements.txt
python -m app.main                 # http://localhost:8000  (docs at /docs)
# or, from the repo root:
python -m backend.app.main
# or with uvicorn directly:
uvicorn app.main:app --reload
```

In development the Vite dev server hosts the UI and proxies `/api` here. In
production, build `frontend/dist` and this app serves it at `/` with a
single-page-app fallback (so `/map`, `/trends`, … return `index.html`), while the
API stays under `/api`.

## Endpoints

`GET /api/health` · `GET /api/meta` · `GET /api/stations` ·
`GET /api/stations/{code}` · `GET /api/overview` · `GET /api/timeseries` ·
`GET /api/ranking` · `POST /api/interpolate` · `GET /api/interpolate/grid` ·
`GET /api/geo/bogota`. See `docs/API_CONTRACT.md` for exact shapes.

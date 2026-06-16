# AirSight — frozen API & data contract

> This is the single source of truth shared by the backend and frontend.
> **Product name:** AirSight · **Tagline:** "Bogotá's air, made legible."
> Visual system = MarcVista (violet `#7C3AED`, Inter, sharp 0px corners, white canvas).

## Data artifacts (`backend/app/data_processed/`, produced by `scripts/build_dataset.py`)

- **`meta.json`**
  ```json
  { "city":"Bogotá, Colombia", "source":"RMCAB", "year":2021,
    "rows":166441, "stations":19, "date_min":"2021-01-01", "date_max":"2021-12-31",
    "pollutants":[{"key":"PM2.5","label":"PM2.5","unit":"µg/m³","name":"Fine particulate matter"}, ...] }
  ```
- **`stations.json`** — array of:
  ```json
  { "code":"USM","name":"Usme","lat":4.532097,"lon":-74.116947,
    "locality":"Usme","zone":"Urbana","type":"Residencial","address":"...",
    "altitude_m":2593.0,"records":8760,
    "imputed_share":{"PM2.5":0.07,"PM10":0.05,"NO":0.1,"NO2":0.1,"NOX":0.1,"CO":0.2,"OZONE":0.1} }
  ```
- **`daily.csv.gz`** / **`monthly.csv.gz`** — columns: `date,Station,PM2.5,PM10,NO,NO2,NOX,CO,OZONE`
- **`hourly.csv.gz`** — `DateTime,Station,Latitude,Longitude,PM2.5,PM10,NO,NO2,NOX,CO,OZONE,<*_imputed_flag>`
- **`bogota.geojson`** — city boundary (copied from research data) for the map overlay.

Pollutant keys (canonical order): `PM2.5, PM10, NO, NO2, NOX, CO, OZONE`. CO unit is `mg/m³`; the rest `µg/m³`.

## REST API (prefix `/api`)

| Method | Path | Query / Body | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{status:"ok", rows, stations}` |
| GET | `/api/meta` | — | `meta.json` + `aqi_scale` (see below) |
| GET | `/api/stations` | `pollutant?` (default PM2.5), `period?`=annual\|YYYY-MM | `{pollutant,unit,stations:[StationSummary]}` |
| GET | `/api/stations/{code}` | `pollutant?` | `StationDetail` |
| GET | `/api/overview` | — | `Overview` |
| GET | `/api/timeseries` | `station` (code or `all`), `pollutant`, `freq`=daily\|monthly | `{station,pollutant,unit,points:[{date,value}]}` |
| GET | `/api/ranking` | `pollutant`, `period?`=annual\|YYYY-MM | `{pollutant,unit,items:[{code,name,value,aqi,category,color}]}` (desc) |
| POST | `/api/interpolate` | `{lat,lon,pollutant,period?,method?:"idw"\|"knn",k?:5}` | `EstimateResult` |
| GET | `/api/interpolate/grid` | `pollutant,period?,method?,k?,resolution?:24` | `{pollutant,unit,bbox,method,cells:[{lat,lon,value,aqi,color}]}` |
| GET | `/api/geo/bogota` | — | GeoJSON FeatureCollection |
| GET | `/api/insights` | — | model-validation results (see below) |
| GET | `/api/live` | `lat`, `lon` | live air quality + go-out advice (see below) |

### `/api/insights` (methodology results)
```ts
{ city, pipeline:{step,name,summary}[],
  imputation:{ challenge,target,unit,holdout_pct, methods:{key,label,mae,n}[], best_baseline, production_model:{label,note} },
  spatial_knn:{ challenge,target,unit,method,excluded_stations,timestep_hours, by_k:{k,mae,n}[], best_k, best_mae },
  imputation_breakdown:{ total_rows,total_cells,overall_imputed_cells,overall_imputed_pct,
                         by_method_totals:Record<string,number>,
                         per_pollutant:{key,observed,imputed,imputed_pct,by_method}[] } }
```

### `/api/live` (current conditions — Open-Meteo proxy, global)
```ts
{ lat, lon, time:string, timezone:string, source:"Open-Meteo",
  aqi:{ value:number|null, category, color, dominant:string|null },   // US AQI
  advice:{ level, ok_to_go_out:"yes"|"caution"|"limit"|"no"|"unknown", headline, detail },
  pollutants:{ key,label,value:number|null,unit,sub_aqi:number|null }[],
  forecast:{ time:string, aqi:number|null }[] }   // same-day hourly US AQI
```
Returns `503` if the upstream live source is unreachable.

### `/api/live/map` (real-time map — current readings + KNN surface)
```ts
GET /api/live/map?pollutant&method=idw|knn&k   // default method=knn, k=7 (notebook's MAE-tuned k)
{ time, source:"Open-Meteo (CAMS)", pollutant, unit, method, k,
  stations:{code,name,lat,lon,value,unit,aqi}[],
  grid: GridResponse }   // grid built with the notebook's distance-weighted KNN
```
Current readings at the 19 station coords, interpolated across the city with the
SAME distance-weighted KNN as the analysis notebook. Pollutants: PM2.5, PM10,
NO2, OZONE, CO, SO2. `400` unsupported · `503` upstream down.

### `/api/history` (continuous archive 2022→now — Open-Meteo)
```ts
GET /api/history?lat&lon&pollutant&freq=daily|monthly
{ lat, lon, pollutant, unit, freq, source:"Open-Meteo (CAMS)",
  start:string, end:string, points:{date,value:number}[] }
```
Coverage starts ~2022-09-01 (older dates have no free source). Supported pollutants:
PM2.5, PM10, NO2, OZONE, CO, SO2 (CO converted to mg/m³ to match RMCAB). NO/NOX → `400`.
Pair with the 2021 RMCAB series (`/api/timeseries?station=all`) to draw one continuous
2021 → now timeline (with a Jan–Aug 2022 gap, no free source). `503` on upstream failure.

### Shared shapes

```ts
type Aqi = { value: number|null; category: string; color: string; dominant: string|null };

type StationSummary = {
  code; name; lat; lon; locality; zone; type;
  value: number|null;          // mean of requested pollutant over period
  unit: string;
  aqi: Aqi;                     // AQI from PM2.5 (+PM10) annual/period mean
};

type StationDetail = StationSummary & {
  altitude_m; address; records;
  pollutants: { key,label,unit,mean,whoGuideline?:number|null }[];
  imputed_share: Record<string,number>;
};

type Overview = {
  meta: { city, year, date_min, date_max, stations, rows };
  headline_aqi: Aqi;                       // city annual PM2.5 AQI
  avg_pm25: number; avg_pm10: number;
  worst_station: {code,name,value}; best_station: {code,name,value};   // by PM2.5 annual
  aqi_distribution: { category, color, count }[];                       // stations per AQI band
  pollutant_averages: { key,label,unit,mean,whoGuideline?:number|null }[];
  data_quality: { overall_imputed_pct:number, by_pollutant:{key,pct}[] };
};

type EstimateResult = {
  lat; lon; pollutant; unit; period;
  value: number|null; aqi: Aqi;
  method: "idw"|"knn"; k: number;
  neighbors: { code,name,distance_km,value,weight }[];
};
```

### `aqi_scale` (returned in `/api/meta`, mirrored in frontend `lib/aqi.ts`)

US EPA categories (used ONLY as a data legend; all UI chrome stays MarcVista violet/ink):

| Range | Category | Color |
|---|---|---|
| 0–50 | Good | `#16A34A` |
| 51–100 | Moderate | `#D97706` |
| 101–150 | Unhealthy for sensitive groups | `#EA580C` |
| 151–200 | Unhealthy | `#DC2626` |
| 201–300 | Very unhealthy | `#7C3AED` |
| 301–500 | Hazardous | `#7F1D1D` |

AQI is computed from PM2.5 (24-h breakpoints) and PM10; the higher sub-index wins and sets `dominant`. WHO 2021 annual guidelines for comparison: PM2.5 5, PM10 15, NO2 10, O3 (peak season) 60 µg/m³.

## Frontend routes
`/` Dashboard · `/map` Map · `/trends` Trends · `/stations` Stations · `/estimate` Estimate · `/methodology` Methodology.

Dev: Vite proxies `/api` → `http://localhost:8000`. Prod: FastAPI serves `frontend/dist` at `/` and the API at `/api`.

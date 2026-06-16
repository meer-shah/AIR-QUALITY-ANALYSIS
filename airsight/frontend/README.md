# AirSight — frontend

React + Vite + TypeScript client for AirSight ("Bogotá's air, made legible"). Built on the
MarcVista visual system: one violet accent (`#7C3AED`), Inter, sharp 0px corners, white canvas.

## Stack

- React 18 + React Router 6
- Vite 5 + TypeScript 5
- Tailwind CSS 3 (MarcVista preset in `tailwind.preset.cjs`)
- Recharts for charts, Leaflet + react-leaflet for the map

## Develop

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api -> http://localhost:8000
```

Run the FastAPI backend on port 8000 first so `/api/*` calls resolve.

## Build

```bash
npm run build      # type-checks then emits static assets into dist/
npm run preview    # serves the production build locally
```

In production FastAPI serves `frontend/dist` at `/` and the API at `/api`, so the API base is
the empty string (`''`) and all requests are relative (`/api/...`).

## Layout

```
src/
  lib/          api client, types, AQI scale, formatters, cn helper
  components/
    ui/         MarcVista primitives (button, card, badge, stat, select, …)
    layout/     nav, footer, page container
    charts/     recharts wrappers (time series, ranking bar, pollutant bars)
    map/        Leaflet station map
  pages/        dashboard, map-view, trends, stations, estimate, methodology
```

Routes: `/` Dashboard · `/map` Map · `/trends` Trends · `/stations` Stations ·
`/estimate` Estimate · `/methodology` Methodology.

Visual system: MarcVista.

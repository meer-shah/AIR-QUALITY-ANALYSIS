# Deploying AirSight (free tiers)

AirSight ships as a **single Docker image** that builds the React UI and serves
it together with the FastAPI API from one container. That makes the recommended
deploy a single free web service. A split frontend/backend option is also
documented at the end.

> The container listens on the port given by the `PORT` environment variable
> (default `8000`) and exposes a health check at **`/api/health`**.

Environment variables the image understands:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Port uvicorn binds to. Most hosts inject this automatically. |
| `CORS_ORIGINS` | `["*"]` | JSON array of allowed origins. Only needed for the split deploy (Option D). |

---

## Before you start

1. Push this repo to GitHub (the artifacts in `backend/app/data_processed/` are
   committed, so the image builds without re-running the ETL).
2. (Optional) Verify the production container locally:
   ```bash
   docker compose up --build
   # open http://localhost:8000  — UI + API from one container
   ```

---

## Option A — Render (Blueprint, recommended)

Render reads the included `render.yaml` and provisions everything for you.

1. Sign in at <https://render.com>.
2. **New + → Blueprint**.
3. Connect your GitHub account and pick this repository.
4. Render detects `render.yaml`:
   - service name: **airsight**
   - runtime: **Docker** (uses the root `Dockerfile`)
   - plan: **Free**
   - health check path: **`/api/health`**
5. Click **Apply**. Render builds the image and deploys it.
6. Open the generated `*.onrender.com` URL.

Notes:
- Render injects `PORT`; the container honours it — no extra config needed.
- The free plan sleeps after inactivity; the first request after idle is slow
  while it wakes (cold start). The committed artifacts keep that cold start fast
  because no ETL runs at boot.

Manual setup (without the Blueprint): **New + → Web Service → Docker**, point at
the repo, set the health check path to `/api/health`, choose the Free plan.

---

## Option B — Railway

1. Sign in at <https://railway.app>.
2. **New Project → Deploy from GitHub repo**, select this repo.
3. Railway auto-detects the `Dockerfile` and builds it.
4. In the service **Settings → Networking**, click **Generate Domain**.
5. Railway provides `PORT` automatically; the container uses it. No build or
   start command overrides are required.

Optional: set `CORS_ORIGINS` under **Variables** only if you later serve the UI
from a different domain.

---

## Option C — Hugging Face Spaces (Docker)

1. Sign in at <https://huggingface.co> → **New → Space**.
2. Choose **Docker → Blank**, set visibility, create the Space.
3. Push this repo's contents to the Space's Git remote (it needs the root
   `Dockerfile`).
4. Spaces sets `PORT=7860` by default. The container reads `$PORT`, so it binds
   correctly with no change. To be explicit you can add this to the Space's
   `README.md` front-matter:
   ```yaml
   ---
   title: AirSight
   sdk: docker
   app_port: 7860
   ---
   ```
5. The Space builds and serves the UI + API at the Space URL.

The build copies the whole repo so the ETL can run if artifacts are ever
missing; with them committed, the build is fast.

---

## Option D — Split: frontend on Vercel/Netlify + backend on Render

Use this if you want a CDN-hosted UI separate from the API.

### 1. Backend (API only) on Render

Deploy the same Docker image as in Option A. The API will be at, e.g.,
`https://airsight-api.onrender.com/api`. Then set CORS so the browser UI may
call it:

- Render service → **Environment** → add:
  ```
  CORS_ORIGINS = ["https://your-frontend-domain.vercel.app"]
  ```
  (Use the exact origin of your deployed frontend; add several entries as a JSON
  array if needed.)

### 2. Frontend on Vercel

The frontend talks to the API through the relative path `/api`. For a split
deploy, route that path to the backend so the browser still calls a same-origin
`/api`. Add a `vercel.json` at the repo root (or in `frontend/` if you set the
Vercel root directory there):

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://airsight-api.onrender.com/api/:path*" }
  ]
}
```

Vercel project settings:

- **Framework preset:** Vite
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm ci` (or `npm install`)

Deploy; Vercel serves the static bundle and proxies `/api` to Render.

### 2 (alt). Frontend on Netlify

- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `frontend/dist`

Add a `netlify.toml` (repo root) for the proxy and SPA fallback:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "https://airsight-api.onrender.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Troubleshooting

- **Blank page / 404 on routes like `/map`:** the SPA fallback in
  `backend/app/main.py` already returns `index.html` for non-`/api` paths in the
  single-container deploy. For a split deploy make sure your host has an SPA
  rewrite to `/index.html` (shown above).
- **CORS errors in the split deploy:** the API origin must list the frontend
  origin in `CORS_ORIGINS` (JSON array, exact scheme + host).
- **Slow first request on free tiers:** expected cold start after the service
  sleeps. Committed data artifacts keep boot fast since no ETL runs.
- **Build can't find raw CSVs:** only relevant if `data_processed/` artifacts
  are absent. Keep them committed, or ensure the research CSV folders are present
  so `build_dataset.py` can regenerate them during the image build.

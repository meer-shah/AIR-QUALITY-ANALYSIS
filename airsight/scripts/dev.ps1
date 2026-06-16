# AirSight — start backend (FastAPI :8000) and frontend (Vite :5173) together.
# Usage (from the repo root, Windows PowerShell):
#   ./scripts/dev.ps1
#
# Opens two background jobs and streams their output. Press Ctrl+C to stop both.

$ErrorActionPreference = "Stop"

# Resolve the repo root (this script lives in <root>/scripts).
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "AirSight dev: backend on :8000, frontend on :5173" -ForegroundColor Magenta

# --- Backend: create venv if needed, install deps, run uvicorn ---------------
$Venv = Join-Path $Backend ".venv"
if (-not (Test-Path $Venv)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv $Venv
}
$PyExe = Join-Path $Venv "Scripts/python.exe"
& $PyExe -m pip install --upgrade pip | Out-Null
& $PyExe -m pip install -r (Join-Path $Backend "requirements.txt")

# --- Data: build artifacts on first run (if not committed/present) -----------
$DataDir = Join-Path $Backend "app/data_processed"
if (-not (Test-Path (Join-Path $DataDir "meta.json"))) {
    Write-Host "Building data artifacts (ETL)..." -ForegroundColor Cyan
    & $PyExe (Join-Path $Backend "scripts/build_dataset.py")
}
if (-not (Test-Path (Join-Path $DataDir "insights.json"))) {
    Write-Host "Computing model-validation results..." -ForegroundColor Cyan
    & $PyExe (Join-Path $Backend "scripts/build_insights.py")
}
if (-not (Test-Path (Join-Path $DataDir "explore.json"))) {
    Write-Host "Computing explore analytics..." -ForegroundColor Cyan
    & $PyExe (Join-Path $Backend "scripts/build_explore.py")
}

# --- Frontend: install node deps if needed ----------------------------------
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location $Frontend
    if (Test-Path (Join-Path $Frontend "package-lock.json")) { npm ci } else { npm install }
    Pop-Location
}

# --- Launch both processes --------------------------------------------------
$BackendJob = Start-Job -Name "airsight-backend" -ScriptBlock {
    param($BackendDir, $Py)
    Set-Location $BackendDir
    & $Py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} -ArgumentList $Backend, $PyExe

$FrontendJob = Start-Job -Name "airsight-frontend" -ScriptBlock {
    param($FrontendDir)
    Set-Location $FrontendDir
    npm run dev
} -ArgumentList $Frontend

Write-Host "`nBackend:  http://localhost:8000  (API + docs at /docs)" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173  (proxies /api to :8000)" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both.`n" -ForegroundColor Yellow

try {
    while ($true) {
        Receive-Job -Job $BackendJob, $FrontendJob
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`nStopping AirSight dev servers..." -ForegroundColor Yellow
    Stop-Job -Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
}

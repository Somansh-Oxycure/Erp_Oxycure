# ============================================================
#  Oxycure ERP — Start Script
#  Run from the project root: .\start.ps1
# ============================================================

$Root = $PSScriptRoot
$DB_URL = "postgresql://oxycure:oxycure_secret_2026@localhost:5433/oxycure_erp?schema=public"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Oxycure ERP — Starting up..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Start Docker (PostgreSQL) ────────────────────────────
Write-Host "[1/3] Starting Docker (PostgreSQL)..." -ForegroundColor Yellow
Set-Location $Root
docker-compose up -d

# Wait for Postgres to be healthy
Write-Host "      Waiting for database to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Write-Host "      Assuming database is ready." -ForegroundColor Green

# ── 2. Start API (NestJS) in a new window ───────────────────
Write-Host "[2/3] Starting API on http://localhost:3001 ..." -ForegroundColor Yellow

# Kill anything already on 3001
$existing = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($existing) {
    Stop-Process -Id $existing -Force
    Write-Host "      Freed port 3001 (killed PID $existing)" -ForegroundColor Gray
}

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$env:DATABASE_URL='$DB_URL'; Set-Location '$Root\apps\api'; npm run dev"
) -WindowStyle Normal

# ── 3. Start Web (Next.js) in a new window ──────────────────
Write-Host "[3/3] Starting Web on http://localhost:3000 ..." -ForegroundColor Yellow

# Kill anything already on 3000
$existing3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($existing3000) {
    Stop-Process -Id $existing3000 -Force
    Write-Host "      Freed port 3000 (killed PID $existing3000)" -ForegroundColor Gray
}

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Root\apps\web'; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "  Web   ->  http://localhost:3000" -ForegroundColor White
Write-Host "  API   ->  http://localhost:3001/api" -ForegroundColor White
Write-Host "  Docs  ->  http://localhost:3001/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Login: admin@oxycure.com / Admin@2026" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

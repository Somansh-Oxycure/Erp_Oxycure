# ============================================================
#  Oxycure ERP — Stop Script
#  Run from the project root: .\stop.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Oxycure ERP — Shutting down..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Kill API (port 3001) ────────────────────────────────────
$api = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($api) {
    Stop-Process -Id $api -Force
    Write-Host "[OK] API stopped (PID $api)" -ForegroundColor Green
} else {
    Write-Host "[--] API was not running" -ForegroundColor Gray
}

# ── Kill Web (port 3000) ────────────────────────────────────
$web = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($web) {
    Stop-Process -Id $web -Force
    Write-Host "[OK] Web stopped (PID $web)" -ForegroundColor Green
} else {
    Write-Host "[--] Web was not running" -ForegroundColor Gray
}

# ── Stop Docker (PostgreSQL) ────────────────────────────────
Write-Host "     Stopping Docker containers..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
docker-compose stop
Write-Host "[OK] Docker stopped (data is preserved)" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services stopped." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

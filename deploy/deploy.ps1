# ==============================================================================
# KSEC // Agent-eBPF 1-Click Production Deployment Script (PowerShell)
# Target Infrastructure: ksec.space (Docker Compose + Cloudflare Ingress)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🚀 [KSEC eBPF] Initializing Production Deployment Stack..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "❌ [ERROR] Docker is not installed or not in PATH."
    exit 1
}

# 2. Check .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ [WARN] .env not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 3. Build & Launch Containers
Write-Host "🔨 [BUILD] Building production container images..." -ForegroundColor Green
docker compose build

Write-Host "⚡ [UP] Starting KSEC Production Stack in background..." -ForegroundColor Green
docker compose up -d

Write-Host "🩺 [HEALTH] Checking container status..." -ForegroundColor Green
Start-Sleep -Seconds 3
docker compose ps

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "✅ [SUCCESS] KSEC Ecosystem is live!" -ForegroundColor Green
Write-Host "   • KSEC Web Engine & UI:  http://127.0.0.1:3000 (ksec.space)" -ForegroundColor White
Write-Host "   • FastAPI Control Plane: http://127.0.0.1:8000 (api.ksec.space)" -ForegroundColor White
Write-Host "   • gRPC Telemetry Mesh:   http2://127.0.0.1:50051 (grpc.ksec.space)" -ForegroundColor White
Write-Host "   • ClickHouse DB:         http://127.0.0.1:8123" -ForegroundColor White
Write-Host "   • Redis Store:           127.0.0.1:6379" -ForegroundColor White
Write-Host "   • Watchtower Auto-CD:    Active" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan

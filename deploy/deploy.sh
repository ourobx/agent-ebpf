#!/usr/bin/env bash
# ==============================================================================
# KSEC // Agent-eBPF 1-Click Production Deployment Script
# Target Infrastructure: ksec.space (Docker Compose + Cloudflare Ingress)
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo "🚀 [KSEC eBPF] Initializing Production Deployment Stack..."
echo "========================================================"

# 1. Check Docker & Docker Compose installation
if ! command -v docker &> /dev/null; then
    echo "❌ [ERROR] Docker is not installed. Please install Docker Engine."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ [ERROR] Docker Compose v2 is required."
    exit 1
fi

# 2. Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️ [WARN] .env file not found. Generating from .env.example..."
    cp .env.example .env
    echo "🔑 Please review .env configuration before production usage."
fi

# 3. Pull & build production containers
echo "🔨 [BUILD] Building backend, frontend, and database services..."
docker compose build --pull

# 4. Start all services in detached mode
echo "⚡ [UP] Starting KSEC Production Stack..."
docker compose up -d

# 5. Verify service health status
echo "🩺 [HEALTH] Verifying container health checks..."
sleep 5
docker compose ps

echo "========================================================"
echo "✅ [SUCCESS] KSEC Ecosystem is live!"
echo "   • KSEC Web Engine & UI:  http://127.0.0.1:3000 (ksec.space)"
echo "   • FastAPI Control Plane: http://127.0.0.1:8000 (api.ksec.space)"
echo "   • gRPC Telemetry Mesh:  http2://127.0.0.1:50051 (grpc.ksec.space)"
echo "   • ClickHouse Database:  http://127.0.0.1:8123"
echo "   • Redis Metering Store: 127.0.0.1:6379"
echo "   • Watchtower Auto-CD:   Active (Poll: 300s)"
echo "========================================================"

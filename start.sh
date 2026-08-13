#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "======================================================================="
echo "  Agent-eBPF: Autonomous Linux Kernel Shield for AI Swarms"
echo "  1-Click Launcher"
echo "======================================================================="
echo ""

echo "[1/3] Installing Python dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "[2/3] Opening browser (http://localhost:8000)..."
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:8000 &
elif command -v open > /dev/null; then
  open http://localhost:8000 &
fi

echo ""
echo "[3/3] Starting Agent-eBPF Web Server & MCP SSE Gateway..."
echo "Server address: http://localhost:8000"
echo "Press Ctrl+C to stop the server."
echo "======================================================================="
echo ""

python3 -m uvicorn mcp_server:app --host 0.0.0.0 --port 8000 --reload

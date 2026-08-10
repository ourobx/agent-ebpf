#!/bin/bash
set -e

echo "======================================================================="
echo "  🛡️⚡ Agent-eBPF: Autonomous Linux Kernel Shield for AI Swarms"
echo "  Tek Tıkla Başlatıcı (1-Click Launcher)"
echo "======================================================================="
echo ""

echo "[1/3] Python bağımlılıkları yükleniyor..."
pip install -r requirements.txt --quiet

echo ""
echo "[2/3] Tarayıcı açılıyor (http://localhost:8000)..."
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:8000 &
elif command -v open > /dev/null; then
  open http://localhost:8000 &
fi

echo ""
echo "[3/3] Agent-eBPF Web Sunucusu ve MCP SSE Gateway başlatılıyor..."
echo "Sunucu adresi: http://localhost:8000"
echo "Durdurmak için Ctrl+C basabilirsiniz."
echo "======================================================================="
echo ""

python3 -m uvicorn mcp_server:app --host 0.0.0.0 --port 8000 --reload

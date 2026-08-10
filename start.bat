@echo off
title Agent-eBPF 1-Click Launcher
chcp 65001 >nul
cls

echo =======================================================================
echo   🛡️⚡ Agent-eBPF: Autonomous Linux Kernel Shield for AI Swarms
echo   Tek Tıkla Başlatıcı (1-Click Launcher)
echo =======================================================================
echo.

echo [1/3] Python paket bağımlılıkları kontrol ediliyor...
python -m pip install -r requirements.txt --quiet

echo.
echo [2/3] Tarayıcı açılıyor (http://localhost:8000)...
start "" http://localhost:8000

echo.
echo [3/3] Agent-eBPF Web Sunucusu ve MCP SSE Gateway başlatılıyor...
echo Sunucu adresi: http://localhost:8000
echo Durdurmak için bu pencerede Ctrl+C basabilirsiniz.
echo =======================================================================
echo.

python -m uvicorn mcp_server:app --host 0.0.0.0 --port 8000 --reload

pause

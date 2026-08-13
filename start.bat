@echo off
cd /d "%~dp0"
title Agent-eBPF 1-Click Launcher
chcp 65001 >nul
cls

echo =======================================================================
echo   Agent-eBPF: Autonomous Linux Kernel Shield for AI Swarms
echo   1-Click Launcher
echo =======================================================================
echo.

echo [1/3] Checking Python package dependencies...
python -m pip install -r requirements.txt --quiet

echo.
echo [2/3] Opening browser (http://localhost:8000)...
start "" http://localhost:8000

echo.
echo [3/3] Starting Agent-eBPF Web Server and MCP SSE Gateway...
echo Server address: http://localhost:8000
echo Press Ctrl+C in this window to stop the server.
echo =======================================================================
echo.

python -m uvicorn mcp_server:app --host 0.0.0.0 --port 8000 --reload

pause

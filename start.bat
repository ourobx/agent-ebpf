@echo off
cd /d "%~dp0"
title Agent-eBPF 1-Click Launcher
chcp 65001 >nul
cls

echo =======================================================================
echo   🛡️ Agent-eBPF: Otonom Kernel Guvenlik ve Zihin Platformu
echo   1-Click Turnkey Launcher
echo =======================================================================
echo.

python run.py

pause

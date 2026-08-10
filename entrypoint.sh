#!/bin/bash
set -e

echo "=== Agent-eBPF Coolify Container Initializing ==="

# 1. /sys/fs/bpf filesystem kontrolü ve mount işlemi
if ! mountpoint -q /sys/fs/bpf; then
    echo "[!] Mounting /sys/fs/bpf filesystem..."
    mount -t bpf bpf /sys/fs/bpf || echo "[X] Warning: Could not mount /sys/fs/bpf directly. Check container capabilities."
fi

# 2. Kernel BTF / CO-RE doğrulama
if [ -f "/sys/kernel/btf/vmlinux" ]; then
    echo "[✓] Kernel BTF support detected at /sys/kernel/btf/vmlinux"
else
    echo "[!] Warning: /sys/kernel/btf/vmlinux not found. CO-RE compilation may fallback."
fi

# 3. eBPF C Bytecode derleme
echo "[*] Building eBPF shield bytecode..."
python3 cli.py build || echo "[!] Bytecode build warning - using pre-compiled objects if available."

# 4. MCP Gateway & REST Server Başlatma
echo "[*] Launching Agent-eBPF FastAPI MCP Server on port 8000..."
exec uvicorn mcp_server:app --host 0.0.0.0 --port 8000 --workers 2

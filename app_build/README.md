# 🛡️ KSEC v2.0 Production Distribution Package (app_build)

This directory contains the production-ready distribution artifacts, configuration manifests, and client packages for **KSEC v2.0 Enterprise SaaS (`https://ksec.space`)**.

## Package Manifest:
- **Core SaaS Gateway:** `mcp_server.py`, `run.py` (FastAPI / SSE / MCP Gateway)
- **Linux Ring-0 Kernel BPF Modules:** `ebpf/*.bpf.c` (XDP, sockops, kprobe, tracepoint)
- **Billing & Telemetry Engine:** `src/billing/`, `src/gateway/`, `src/forensics/`
- **Frontend & Web Interfaces:** `landing.html` (Landing & Simulator), `index.html` (Mission Control), `styles.css`, `app.js`
- **Agent SDKs:** `packages/ksec-shield-py/`, `packages/ksec-shield-ts/`
- **Orchestration & Deployment:** `docker-compose.coolify.yml`, `deploy/helm/ksec-shield/`

Built and verified by The Autonomous Development Team (@pm, @engineer, @qa, @devops).

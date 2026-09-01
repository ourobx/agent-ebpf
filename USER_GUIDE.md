# 🛡️ Agent-eBPF · User Operating Guide

**No-Code, Zero-Latency Linux Kernel Security & Cognitive Observability Platform for AI Agents**

---

## ⚡ 1. Quick Start (1-Click Launch)

### 🪟 For Windows Users

1. **Double-click** the **`start.bat`** file in the root folder.
2. The system automatically verifies runtime dependencies and opens the **control dashboard (`http://localhost:8000`)** in your default browser.

### 🐧 For Linux / macOS Users

Run the launcher script in your terminal:

```bash
chmod +x start.sh
./start.sh
# or: python3 run.py
```

### 📦 Official TypeScript / Node.js SDK (npm)

Install directly from npm ([@ourobx/shield](https://www.npmjs.com/package/@ourobx/shield)):

```bash
npm install @ourobx/shield
# or execute sandboxed agent:
npx @ourobx/shield python my_agent.py
```

### 🐳 Deployment with Docker / Docker Compose

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔑 2. Accessing the Control Panel

1. On the web dashboard, click **"1-Click Demo Login"** to instantly access the live telemetry streams and policy management workspace.
2. Or authenticate using your enterprise OAuth2 / JWT credentials to enter dedicated multi-tenant scope.

---

## 🎛️ 3. Dashboard Features

### 🛡️ A) Overview & 1-Click Kernel Armor

- **Shield Toggle:** Activate or pause AI agent kernel-level guardrails with a single toggle.
- **Live Metrics:** Real-time visibility into blocked threat counts, microsecond inspection latency (`<32µs`), and kernel ring buffer health.

### 🧠 B) Cognitive Mind & Telemetry Stream

- **Cognitive State Indicator:** Monitor agent sentiment, curiosity, calm, and resonance metrics via responsive charts.
- **Live Thought Stream:** Inspect agent reasoning steps, environmental observations, and declared intent leases.
---

## 🌐 4. Live Production Ingress & Cloudflare Argo Tunnel

The KSEC production cluster is routed via Cloudflare Argo Tunnel (`3fbd6b55-6caf-4891-a282-4864965216d5.cfargotunnel.com`):

| Subdomain | Target Service | Protocol / Port | Role |
| :--- | :--- | :--- | :--- |
| **`ksec.space`** | Next.js Dashboard UI | `HTTPS (Port 3000)` | Standalone UI & Public Landing Portal |
| **`api.ksec.space`** | FastAPI Control Plane | `HTTPS (Port 8000)` | REST API & Multi-Tenant SSE Stream |
| **`grpc.ksec.space`** | gRPC Telemetry Mesh | `HTTP/2 (Port 50051)`| Distributed eBPF Daemon RingBuffer Stream |
| **`metrics.ksec.space`** | Prometheus Metrics | `HTTPS (Port 8000/9090)` | Real-Time Telemetry & SLA Compliance |


### 🔒 C) Visual Security Rules

Manage kernel security policies declaratively without code:

- ✅ *Block Unbounded Batch Mutations without WHERE clauses (DELETE / UPDATE)*
- ✅ *Enforce Strict Multi-Tenant Isolation (Tenant ID scoping)*
- ✅ *Prevent Unauthorized Process Spawning (execve / ptrace containment)*
- ✅ *Require Confirmation on Rapid or Malformed Commands*

---

## 📡 4. Architecture & Ingress

- **Web Dashboard:** `https://ksec.space`
- **FastAPI Control Plane:** `https://api.ksec.space`
- **gRPC Telemetry Mesh (HTTP/2):** `grpc.ksec.space:443`
- **Prometheus Metrics:** `metrics.ksec.space:9090`

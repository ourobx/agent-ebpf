# 🛡️⚡ Agent-eBPF: AI Sentinel in Kernel Space

**Agent-eBPF** is a deterministic, kernel-space (Ring-0) security shield and telemetry gateway engineered for autonomous AI agents, LLM services, and containerized application swarms (~8µs average latency, <50µs P99 SLA).

Operating under **Zero-Trust** principles, this architecture intercepts destructive database queries, illegal network packets, and unauthorized system calls (such as unconstrained `DELETE`/`UPDATE` operations without `WHERE` clauses) directly inside the Linux kernel (eBPF LSM/XDP/Ring-Buffer) before network sockets transmit.

---

## 🚀 Quick Start (1-Click Launch)

Launch the **Agent-eBPF** system and **Visual Web Dashboard** instantly without manual setup:

### 💻 Windows
Double-click the launcher script in the project root:
```cmd
start.bat
```

### 🐧 Linux / 🍎 macOS
Run the shell script in terminal:
```bash
chmod +x start.sh
./start.sh
```

> **💡 Automatic Execution:** The launcher validates dependencies, initializes the eBPF & MCP Gateway server, and automatically opens **`http://localhost:8000`** in your default browser.

---

## 🖥️ Visual Web Control Panel (Web UI)

Manage kernel security operations visually without writing code via the Web UI (`http://localhost:8000`):

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🛡️⚡ Agent-eBPF | Autonomous Linux Kernel Shield                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [1. LIVE TELEMETRY]          [2. AST SANDBOX]                         │
│  • Real-time Kernel Logs      • Test sample SQL query:                 │
│  • Dropped Packet Stream      • UPDATE users SET role='admin'          │
│  • Latency (~8µs avg)         • [⚡ EVALUATE] -> Blocked (DROP)        │
│                                                                        │
│  [3. RULE POLICIES]           [4. MCP SSE CONNECTION]                  │
│  • policy.yaml Preview        • SSE Endpoint Address:                  │
│  • 1-Click Policy Injection   • http://localhost:8000/sse              │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Interactive AST Sandbox:** Test destructive `DELETE` or `UPDATE` queries live and observe kernel-level sub-microsecond interception in real time.
2. **Live Telemetry Stream:** Monitor database mutations and system calls issued by AI agents through a streaming event terminal.
3. **Policy & Rule Management:** View active security policies (`policy.yaml`) and dynamically inject enforcement rules.

---

## 🤖 AI Agent Integration (MCP SSE & FastMCP)

Agent-eBPF provides native support for **Model Context Protocol (MCP)** via Server-Sent Events (SSE).

### MCP Server Connection
- **SSE Endpoint:** `http://localhost:8000/sse`
- **Messages Endpoint:** `http://localhost:8000/messages`
- **OAuth 2.0 Discovery:** `http://localhost:8000/.well-known/oauth-authorization-server`

### Exposed MCP Tools
- `get_security_status`: Fetches active kernel hooks, inspection latency, and blocked threat metrics.
- `get_ebpf_status`: Retrieves real-time BPF map packet counters and kernel hook state.
- `get_active_policies`: Fetches declarative rules loaded from `policy.yaml`.
- `add_security_rule`: Injects new IP block entries or query enforcement rules into kernel memory.
- `simulate_query_check`: Validates proposed SQL payloads against active eBPF policies prior to execution.

---

## ☸️ Production Kubernetes Hardening (Non-Privileged)

Deploy Agent-eBPF securely without `privileged: true` by granting strictly bounded Linux capabilities:

```yaml
securityContext:
  privileged: false
  capabilities:
    add:
      - CAP_BPF
      - CAP_NET_ADMIN
      - CAP_PERFMON
      - CAP_SYS_RESOURCE
      - CAP_SYS_ADMIN
```

---

## 🏢 Enterprise SaaS (Private Beta)

For Multi-Tenant Governance, Stripe Metered Billing, ClickHouse Real-time Analytics, and S3 SOC-2 Archival, request access via `pilot@ksec.space` or visit [https://ksec.space](https://ksec.space).

- **1-Click Enterprise Helm:**
  ```bash
  helm install ksec-shield ./deploy/helm/ksec-shield --set existingSecret=ksec-vault-secret
  ```
- **Proof-of-Hack Demo:** LangChain Prompt Injection (`'; DROP TABLE users; --`) intercepted in **5.8µs** with autonomous PostgreSQL `ROLLBACK;` synthesis and Causal Forensics blast radius calculation (`python demo/proof_of_hack_langchain.py`).

---

## 🔬 Automated Testing & CI/CD

Run the verification suite:
```bash
python tests/test_ksec_v2.py
python tests/test_gateway_live_routes.py
```

---

## 📜 License

Distributed under the **MIT License**. Created by Agent-eBPF Core Engineering (`ourobx`).

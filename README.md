# 🛡️⚡ Agent-eBPF: AI Sentinel in Kernel Space

**Agent-eBPF** is a sub-microsecond (<35µs) Linux kernel space (Ring 0) security shield and telemetry gateway engineered for autonomous AI agents, LLM services, and containerized application swarms.

Operating under **Zero-Trust** principles, this architecture intercepts destructive database queries, illegal network packets, and unauthorized system calls (such as unconstrained `DELETE`/`UPDATE` operations without `WHERE` clauses) directly inside the Linux kernel (XDP/Ring-Buffer) with zero latency impact.

---

## 🚀 Quick Start (1-Click Launch)

Launch the **Agent-eBPF** system and **Visual Web Dashboard** instantly without manual setup or configuration:

### 💻 Windows

Double-click the launcher script in the project root:

```cmd
start.bat
```

### 🐧 Linux / 🍎 macOS

Run the shell script in terminal or file manager:

```bash
chmod +x start.sh
./start.sh
```

> **💡 Automatic Execution:** The launcher validates dependencies, installs necessary Python packages, initializes the eBPF & MCP Gateway server, and automatically opens **`http://localhost:8000`** in your default web browser.

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
│  • Latency (<35µs)            • [⚡ EVALUATE] -> Blocked (DROP)        │
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

## 🤖 AI Agent Integration (MCP SSE)

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

## 💻 CLI Command Line Interface

Manage Agent-eBPF via the rich command-line tool `cli.py`:

```bash
# Build eBPF C bytecode
python cli.py build

# Load eBPF program into kernel (eth0)
python cli.py load --iface eth0

# Inspect kernel status and packet counters
python cli.py status

# Stream live RingBuffer security violations
python cli.py events

# Add IP block rule to BPF map
python cli.py add-rule 192.168.1.105 --rule-id 201

# Unload eBPF program from kernel
python cli.py unload --iface eth0
```

---

## 🔬 Automated Testing

Run the full pytest suite to verify MCP endpoints, JWT authentication, and eBPF loader contracts:

```bash
python -m pytest -v
```

---

## 📜 License

Distributed under the **MIT License**. Created by Sysauto & Agent-eBPF Core Engineering.

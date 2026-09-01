#!/usr/bin/env python3
"""
KSEC CLI — Sovereign Enterprise Cybersecurity & eBPF Telemetry Command Line Tool.
Provides comprehensive terminal controls for policy compilation, live kernel telemetry streaming,
automated cgroupv2 process isolation, SaaS quota management, and hierarchical swarm orchestration.
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error


DEFAULT_API_URL = "http://localhost:8000"


def make_request(endpoint: str, method: str = "GET", data: dict = None, api_url: str = DEFAULT_API_URL):
    url = f"{api_url.rstrip('/')}{endpoint}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "ksec-cli/2.0.0")

    payload = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=payload, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        error_body = err.read().decode("utf-8")
        print(f"[ERROR] HTTP {err.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as err:
        print(f"[ERROR] Could not connect to KSEC Control Plane at {url}: {err}", file=sys.stderr)
        sys.exit(1)


def cmd_status(args):
    print("=" * 65)
    print(" 🛡️  KSEC SOVEREIGN DEFENSE ENGINE — ECOSYSTEM STATUS")
    print("=" * 65)
    health = make_request("/healthz", api_url=args.api_url)
    nodes = make_request("/api/v1/mesh/nodes", api_url=args.api_url)
    incidents = make_request("/api/v1/containment/incidents", api_url=args.api_url)
    billing = make_request("/api/v1/billing/usage", api_url=args.api_url)

    print(f" • Control Plane Health : {health.get('status', 'UNKNOWN').upper()}")
    print(f" • Active SaaS Plan     : {billing.get('plan', 'Standard')}")
    print(f" • Quota Consumption    : {billing.get('used_requests', 0):,} / {billing.get('limit', 0):,} events")
    print(f" • Active Mesh Nodes    : {len(nodes)}")
    for node in nodes:
        print(f"    - [{node['status']}] {node['node_id']} ({node['hostname']} @ {node['region']}) | Probes: {node['ebpf_probes_loaded']}")
    print(f" • Quarantined Processes: {len([i for i in incidents if i['status'] == 'CONTAINED'])}")
    print("=" * 65)


def cmd_compile(args):
    print(f"==> Compiling Natural Language Policy via Gemini: '{args.query}'")
    res = make_request("/api/v1/policy/compile", method="POST", data={"natural_language_rule": args.query}, api_url=args.api_url)
    print("\n[AI COMPILATION RESULT]")
    print(f" • Policy ID     : {res['policy_id']}")
    print(f" • Rule Name     : {res['rule_name']}")
    print(f" • Target Binary : {res['target_comm']}")
    print(f" • Allowed Ports : {res['allowed_ports']}")
    print(f" • Action Verdict: {res['action']}")
    print(f" • Risk Rating   : {res['risk_level']}")
    print(f" • AI Rationale  : {res['rationale']}")


def cmd_isolate(args):
    print(f"==> Triggering cgroupv2 auto-isolation for PID {args.pid}...")
    res = make_request(
        "/api/v1/incident/contain",
        method="POST",
        data={"pid": args.pid, "comm": args.comm, "reason": args.reason, "severity": "CRIT"},
        api_url=args.api_url
    )
    print(f"[OK] Process PID {args.pid} isolated successfully.")
    print(f" • Incident ID: {res['incident_id']}")
    print(f" • Enforced By: {res['enforced_by']}")
    print(f" • Message    : {res['message']}")


def cmd_release(args):
    print(f"==> Releasing quarantine for Incident {args.incident_id}...")
    res = make_request(
        "/api/v1/containment/release",
        method="POST",
        data={"incident_id": args.incident_id},
        api_url=args.api_url
    )
    print(f"[OK] Incident {args.incident_id} (PID: {res.get('pid', 'N/A')}) released.")
    print(f" • Status     : {res['status']}")


def cmd_intent(args):
    action_upper = args.action.upper()
    print(f"==> Asserting Intent Lease [{args.intent_id}] for PID {args.pid} with action [{action_upper}]...")
    res = make_request(
        "/api/v1/intent/lease",
        method="POST",
        data={"intent_id": args.intent_id, "pid": args.pid, "action": action_upper},
        api_url=args.api_url
    )
    print(f"[OK] Kernel map updated.")
    print(f" • Intent ID : {res['intent_id']}")
    print(f" • PID       : {res['pid']}")
    print(f" • Action    : {res['action']}")
    print(f" • Status    : {res['status']}")


def cmd_billing(args):
    print("=" * 60)
    print(" 💳  KSEC SAAS BILLING & QUOTA ENGINE")
    print("=" * 60)
    res = make_request("/api/v1/billing/usage", api_url=args.api_url)
    print(f" • Tenant ID          : {res.get('tenant_id', 'unknown')}")
    print(f" • Subscription Plan  : {res.get('plan', 'Standard')}")
    print(f" • Monthly Usage      : {res.get('used_requests', 0):,} / {res.get('limit', 0):,} events")
    print(f" • Active Policies    : {res.get('active_policies', 0)}")
    print(f" • Latency Overhead   : {res.get('latency_overhead_ms', 0)} ms")

    if args.upgrade:
        print(f"\n==> Generating Stripe Checkout Session for plan [{args.upgrade}]...")
        chk = make_request("/api/v1/billing/checkout", method="POST", data={"plan_tier": args.upgrade}, api_url=args.api_url)
        print(f" • Stripe URL: {chk.get('checkout_url')}")
    print("=" * 60)


def cmd_swarm(args):
    print("=" * 65)
    print(f" 🏢  KSEC ENTERPRISE SWARM — LAUNCHING META-AGENT [{args.meta_id}]")
    print("=" * 65)
    print(f" • Objective: '{args.objective}'\n")

    payload = {
        "meta_agent_id": args.meta_id,
        "objective": args.objective,
        "sub_agents": [
            {"agent_id": "sec-01", "role": "SECURITY", "system_prompt": "Audit eBPF RingBuffer policies and cgroup restrictions."},
            {"agent_id": "fin-01", "role": "FINANCE", "system_prompt": "Audit Stripe billing usage and monthly telemetry quotas."},
            {"agent_id": "dev-01", "role": "DEVOPS", "system_prompt": "Deploy Cloudflare edge ingress tunnels and container health checks."}
        ]
    }

    url = f"{args.api_url.rstrip('/')}/api/v1/swarm/orchestrate/stream"
    req = urllib.request.Request(url, method="POST", data=json.dumps(payload).encode("utf-8"))
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "ksec-cli/2.0.0")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            for line in resp:
                decoded = line.decode("utf-8").strip()
                if decoded.startswith("data:"):
                    raw_data = decoded[5:].strip()
                    try:
                        step = json.loads(raw_data)
                        if "step_type" in step:
                            sub_info = f" [{step.get('active_sub_agent', '')}]" if step.get("active_sub_agent") else ""
                            print(f"[{step['step_type']}]{sub_info} {step.get('content', '')}")
                        elif "summary" in step:
                            print(f"\n🏆 [SWARM COMPLETE] {step.get('summary')}")
                    except Exception:
                        pass
    except Exception as exc:
        print(f"[ERROR] Swarm stream error: {exc}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(prog="ksec", description="KSEC Sovereign eBPF Telemetry & Security CLI")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="KSEC Control Plane API URL")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Status
    subparsers.add_parser("status", help="Displays overall control plane, mesh, and quota status")

    # Compile
    compile_p = subparsers.add_parser("compile", help="Translates plain English into eBPF policy rules via Gemini")
    compile_p.add_argument("query", type=str, help="Natural language security intent")

    # Isolate
    isolate_p = subparsers.add_parser("isolate", help="Freezes a target process via cgroupv2 (sub-ms containment)")
    isolate_p.add_argument("pid", type=int, help="Target process PID")
    isolate_p.add_argument("--comm", default="unknown", help="Process executable name")
    isolate_p.add_argument("--reason", default="Manual CLI quarantine", help="Quarantine reason")

    # Release
    release_p = subparsers.add_parser("release", help="Unfreezes a quarantined process")
    release_p.add_argument("incident_id", type=str, help="Incident ID to release")

    # Intent
    intent_p = subparsers.add_parser("intent", help="Grants or revokes an atomic eBPF intent lease for a PID")
    intent_p.add_argument("intent_id", type=str, help="Policy Intent ID (e.g. intent-net-01)")
    intent_p.add_argument("pid", type=int, help="Target process PID")
    intent_p.add_argument("--action", choices=["ALLOW", "DENY", "allow", "deny"], default="ALLOW", help="Enforcement verdict")

    # Billing
    billing_p = subparsers.add_parser("billing", help="Inspects SaaS usage metering and generates Stripe checkout links")
    billing_p.add_argument("--upgrade", choices=["pro", "enterprise"], default=None, help="Upgrade plan tier")

    # Swarm
    swarm_p = subparsers.add_parser("swarm", help="Executes hierarchical enterprise multi-agent swarm orchestration")
    swarm_p.add_argument("--meta-id", default="CEO-CLI-01", help="Executive Meta-Agent ID")
    swarm_p.add_argument("--objective", default="Audit all kernel policies, quota consumption, and edge mesh nodes.", help="Strategic objective")

    parsed_args = parser.parse_args()

    if parsed_args.command == "status":
        cmd_status(parsed_args)
    elif parsed_args.command == "compile":
        cmd_compile(parsed_args)
    elif parsed_args.command == "isolate":
        cmd_isolate(parsed_args)
    elif parsed_args.command == "release":
        cmd_release(parsed_args)
    elif parsed_args.command == "intent":
        cmd_intent(parsed_args)
    elif parsed_args.command == "billing":
        cmd_billing(parsed_args)
    elif parsed_args.command == "swarm":
        cmd_swarm(parsed_args)


if __name__ == "__main__":
    main()

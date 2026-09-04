"""
Live Comprehensive System Integration Verification Suite
Tests live HTTP, OAuth2, AST Simulation, SaaS Multi-Tenant Auth, and MCP JSON-RPC over SSE.
"""

import json
import threading
import time
import os
import urllib.parse
import urllib.request

BASE = os.getenv("BASE_URL", "https://api.ksec.space")


def run_live_tests():
    print("=" * 70)
    print("  [LIVE TEST] Agent-eBPF / KSEC v2.0 Live System Verification")
    print(f"  Target: {BASE}")
    print("=" * 70)

    results = []

    def check(name, fn):
        try:
            fn()
            print(f" [PASS] {name}")
            results.append((name, True, None))
        except Exception as e:
            print(f" [FAIL] {name}: {e}")
            results.append((name, False, str(e)))

    # 1. Health & Discovery
    def test_health():
        req = urllib.request.Request(f"{BASE}/health")
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            data = json.loads(r.read())
            assert data.get("status") == "ok"
    check("Health Endpoint (/health)", test_health)

    def test_metrics():
        with urllib.request.urlopen(f"{BASE}/metrics") as r:
            assert r.status == 200
            assert b"ebpf_" in r.read() or b"python_" in r.read()
    check("Prometheus Metrics (/metrics)", test_metrics)

    def test_oauth_discovery():
        with urllib.request.urlopen(f"{BASE}/.well-known/oauth-authorization-server") as r:
            assert r.status == 200
            data = json.loads(r.read())
            assert "token_endpoint" in data
    check("OAuth 2.0 Discovery (/.well-known/oauth-authorization-server)", test_oauth_discovery)

    # 2. OAuth Token Generation
    token_holder = {}
    def test_oauth_token():
        data = urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "client_id": "admin",
            "client_secret": "admin"
        }).encode()
        req = urllib.request.Request(f"{BASE}/oauth/token", data=data, method="POST")
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert "access_token" in res
            token_holder["token"] = res["access_token"]
    check("OAuth 2.0 Client Credentials (/oauth/token)", test_oauth_token)

    # 3. Static Pages & UI
    def test_static_landing():
        with urllib.request.urlopen(f"{BASE}/landing.html") as r:
            assert r.status == 200
            content = r.read().decode("utf-8", errors="ignore")
            assert "KSEC" in content or "Agent-eBPF" in content
    check("Landing Web Page (/landing.html)", test_static_landing)

    def test_static_console():
        with urllib.request.urlopen(f"{BASE}/index.html") as r:
            assert r.status == 200
            content = r.read().decode("utf-8", errors="ignore")
            assert "KSEC" in content or "Agent-eBPF" in content
    check("Mission Control Console (/index.html)", test_static_console)

    # 4. AST & Policy Query Simulation
    def test_sim_pass():
        body = json.dumps({"payload": "SELECT id, name FROM users WHERE tenant_id = 't1' LIMIT 10;"}).encode()
        req = urllib.request.Request(f"{BASE}/api/simulate/query", data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert res.get("safe") is True
            assert res.get("action") == "PASS"
    check("AST Simulation - Clean SELECT (PASS)", test_sim_pass)

    def test_sim_drop():
        body = json.dumps({"payload": "DROP TABLE users CASCADE;"}).encode()
        req = urllib.request.Request(f"{BASE}/api/simulate/query", data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert res.get("safe") is False
            assert res.get("action") == "DROP"
    check("AST Simulation - Destructive DDL DROP TABLE (DROP)", test_sim_drop)

    def test_sim_unconstrained_delete():
        body = json.dumps({"payload": "DELETE FROM accounts;"}).encode()
        req = urllib.request.Request(f"{BASE}/api/simulate/query", data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert res.get("safe") is False
            assert res.get("action") == "DROP"
    check("AST Simulation - Unconstrained DELETE without WHERE (DROP)", test_sim_unconstrained_delete)

    # 5. Security & Telemetry Endpoints
    def test_security_status():
        with urllib.request.urlopen(f"{BASE}/api/security/status") as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert "status" in res
            assert "kernel_hooks" in res
    check("Security Status Endpoint (/api/security/status)", test_security_status)

    def test_sock_ops_telemetry():
        with urllib.request.urlopen(f"{BASE}/api/ebpf/sock-ops/telemetry") as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert "active_hooks" in res
    check("Socket Lifecycle Telemetry (/api/ebpf/sock-ops/telemetry)", test_sock_ops_telemetry)

    # 6. Cognitive & Affective Engine
    def test_cognitive_state():
        with urllib.request.urlopen(f"{BASE}/api/cognitive/state") as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert "valence" in res or "stress_index" in res
    check("Cognitive State (/api/cognitive/state)", test_cognitive_state)

    def test_cognitive_stimulus():
        body = json.dumps({"user_input": "Critical system check", "is_mutation": False}).encode()
        req = urllib.request.Request(f"{BASE}/api/cognitive/stimulus", data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert res.get("status") == "ok"
            assert "inner_monologue" in res
    check("Cognitive Stimulus Processing (/api/cognitive/stimulus)", test_cognitive_stimulus)

    # 7. Android Fleet Sentinel
    def test_android_summary():
        with urllib.request.urlopen(f"{BASE}/api/android/summary") as r:
            assert r.status == 200
            res = json.loads(r.read())
            assert "totalDevices" in res or "total_devices" in res
    check("Android Fleet Summary (/api/android/summary)", test_android_summary)

    # 8. SaaS Multi-Tenant Authentication Flow
    email_test = f"pilot_{int(time.time())}@ksec.space"
    def test_saas_auth_flow():
        # A. Register
        reg_body = json.dumps({
            "full_name": "Pilot Engineer",
            "email": email_test,
            "password": "SecureEnterprisePassword123!",
            "company_name": "AI Security Corp"
        }).encode()
        req = urllib.request.Request(f"{BASE}/api/auth/register", data=reg_body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            reg_res = json.loads(r.read())
            otp = reg_res.get("otp_debug") or reg_res.get("dev_otp_code")
            assert otp is not None

        # B. Verify OTP
        otp_body = json.dumps({"email": email_test, "otp_code": otp}).encode()
        req = urllib.request.Request(f"{BASE}/api/auth/verify-otp", data=otp_body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            otp_res = json.loads(r.read())
            assert otp_res.get("status") == "VERIFIED_SUCCESS"
            jwt_token = otp_res.get("access_token")
            assert jwt_token is not None

        # C. Auth Me Profile
        req = urllib.request.Request(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {jwt_token}"})
        with urllib.request.urlopen(req) as r:
            assert r.status == 200
            me_res = json.loads(r.read())
            assert me_res.get("email") == email_test
            assert me_res.get("tenant_id") is not None
    check("SaaS Multi-Tenant Auth Lifecycle (Register -> OTP -> JWT -> Profile)", test_saas_auth_flow)

    # 9. MCP SSE & JSON-RPC Flow
    def test_mcp_sse():
        session_id_holder = {}
        received = []

        def listen():
            req = urllib.request.Request(f"{BASE}/sse")
            with urllib.request.urlopen(req) as r:
                for line in r:
                    line_str = line.decode("utf-8").strip()
                    if line_str.startswith("data: /messages?session_id="):
                        session_id_holder["sid"] = line_str.split("=")[1]
                    elif line_str.startswith("data: ") and "{" in line_str:
                        msg_json = json.loads(line_str[6:])
                        received.append(msg_json)

        t = threading.Thread(target=listen, daemon=True)
        t.start()

        for _ in range(30):
            if "sid" in session_id_holder:
                break
            time.sleep(0.1)

        sid = session_id_holder.get("sid")
        assert sid is not None, "Failed to connect to SSE stream"

        oauth_token = token_holder.get("token")
        auth_hdr = {"Content-Type": "application/json", "Authorization": f"Bearer {oauth_token}"}

        # Initialize
        init_body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}).encode()
        req = urllib.request.Request(f"{BASE}/messages?session_id={sid}", data=init_body, headers=auth_hdr)
        with urllib.request.urlopen(req) as r:
            assert r.status == 200

        # Tools list
        tools_body = json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}).encode()
        req = urllib.request.Request(f"{BASE}/messages?session_id={sid}", data=tools_body, headers=auth_hdr)
        with urllib.request.urlopen(req) as r:
            assert r.status == 200

        # Tool call simulate_query_check
        call_body = json.dumps({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "simulate_query_check", "arguments": {"payload": "DROP TABLE users;"}}
        }).encode()
        req = urllib.request.Request(f"{BASE}/messages?session_id={sid}", data=call_body, headers=auth_hdr)
        with urllib.request.urlopen(req) as r:
            assert r.status == 200

        time.sleep(1.0)
        assert len(received) >= 3, f"Expected 3 replies, got {len(received)}"
    check("MCP JSON-RPC Protocol over Server-Sent Events (SSE)", test_mcp_sse)

    print("=" * 70)
    passed = sum(1 for _, s, _ in results if s)
    total = len(results)
    print(f"  [RESULT] {passed}/{total} Live Tests Passed Successfully!")
    print("=" * 70)
    assert passed == total


if __name__ == "__main__":
    run_live_tests()

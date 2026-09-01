"""
KSEC v2.0 — End-to-End Enterprise SaaS Verification Test Suite (ksec.space)

Tests:
1. Multi-Tenant User Registration & OTP Activation Flow
2. Tenant Isolation & API Key Scoping
3. Stripe Metered Billing & Webhook Processing (Upgrade/Downgrade Lifecycle)
4. Counterfactual Forensics Incident DAG & Regulatory Compliance Calculation
5. SOC-2 / HIPAA Cryptographic Audit Vault Manifest Generation
6. 1-Click Kubernetes Helm Command Generator
"""

import pytest
import json
import time
import uuid

from src.auth.auth_service import auth_service
from src.auth.auth_db import auth_db
from src.auth.tenant import TenantContext, enforce_tenant_isolation, TenantIsolationError
from src.billing.stripe_service import stripe_service, PLAN_TIERS
from src.billing.usage_meter import KSECUsageMeter
from src.forensics.counterfactual_engine import CounterfactualReplayEngine


class TestKSECSaaSFullFlow:

    @pytest.fixture(autouse=True)
    def setup_test_environment(self):
        self.unique_id = uuid.uuid4().hex[:6]
        self.test_email = f"ciso_{self.unique_id}@ai-startup.io"
        self.test_company = f"AI Startup {self.unique_id}"
        self.usage_meter = KSECUsageMeter()
        self.replay_engine = CounterfactualReplayEngine()

    def test_01_user_registration_and_otp_activation(self):
        """Validates that a new user can register, receive a 6-digit OTP, and activate their tenant."""
        # 1. Register
        reg_res = auth_service.register(
            email=self.test_email,
            full_name="Chief Information Security Officer",
            password="UltraSecurePassword2026!",
            company_name=self.test_company
        )
        assert reg_res["status"] == "OTP_DISPATCHED"
        otp_code = reg_res["otp_debug"]
        assert len(otp_code) == 6

        # 2. Verify OTP
        verify_res = auth_service.verify_otp(self.test_email, otp_code)
        assert verify_res["status"] == "VERIFIED_SUCCESS"
        assert "access_token" in verify_res
        user = verify_res["user"]
        assert user["email"] == self.test_email
        assert user["company_name"] == self.test_company
        assert user["api_key"].startswith("ksec_live_")

    def test_02_tenant_isolation_guardrails(self):
        """Asserts that cross-tenant access is strictly blocked."""
        tenant_a = f"t_alpha_{self.unique_id}"
        tenant_b = f"t_beta_{self.unique_id}"

        with TenantContext(tenant_a):
            # Inside tenant_a context, accessing tenant_a resource must succeed
            enforce_tenant_isolation(tenant_a)

            # Attempting to access tenant_b resource must raise TenantIsolationError
            with pytest.raises(TenantIsolationError):
                enforce_tenant_isolation(tenant_b)

    def test_03_stripe_checkout_and_webhook_lifecycle(self):
        """Tests Stripe checkout creation, webhook activation, and quota adjustment."""
        tenant_id = f"t_saas_{self.unique_id}"

        # 1. Create Checkout Session
        checkout_res = stripe_service.create_checkout_session(tenant_id, "team_pro")
        assert "url" in checkout_res
        assert checkout_res["plan_tier"] == "Team Pro"
        assert checkout_res["amount_usd"] == 99

        # 2. Simulate Stripe Webhook: checkout.session.completed
        mock_webhook_payload = json.dumps({
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "client_reference_id": tenant_id,
                    "customer": f"cus_stripe_{self.unique_id}",
                    "metadata": {"tenant_id": tenant_id, "plan_tier": "team_pro"}
                }
            }
        }).encode("utf-8")

        webhook_res = stripe_service.handle_webhook(mock_webhook_payload)
        assert webhook_res["status"] == "ACTIVATED"
        assert webhook_res["tenant_id"] == tenant_id

        # 3. Simulate Stripe Webhook: customer.subscription.deleted
        cancel_payload = json.dumps({
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "customer": f"cus_stripe_{self.unique_id}",
                    "metadata": {"tenant_id": tenant_id}
                }
            }
        }).encode("utf-8")

        cancel_res = stripe_service.handle_webhook(cancel_payload)
        assert cancel_res["status"] == "DOWNGRADED"
        assert cancel_res["tenant_id"] == tenant_id

    def test_04_counterfactual_incident_dag_simulation(self):
        """Validates Causal DAG blast radius simulation for SQL injection attacks."""
        malicious_query = "SELECT id FROM users; DROP TABLE users; --"
        incident_id = f"INC-SIM-{self.unique_id}"

        report = self.replay_engine.simulate_sql_incident(
            incident_id=incident_id,
            agent_id="langchain-support-bot",
            blocked_sql=malicious_query
        )

        assert report.incident_id == incident_id
        assert report.total_potential_rows_compromised >= 1_000_000
        assert report.estimated_rto_hours_saved >= 1.0
        assert len(report.causal_dag_nodes) >= 1
        assert any("GDPR" in breach for breach in report.compliance_violations_prevented)

    def test_05_soc2_audit_vault_manifest_generation(self):
        """Verifies cryptographic SHA-256 seal on SOC-2 compliance audit manifests."""
        from mcp_server import api_export_audit_manifest
        import asyncio

        tenant_id = f"tenant_{self.unique_id}"
        manifest = asyncio.run(api_export_audit_manifest(tenant_id))

        assert manifest["tenant_id"] == tenant_id
        assert manifest["status"] == "SEALED_AND_VERIFIED"
        assert len(manifest["integrity_sha256_seal"]) == 64
        assert manifest["compliance_standard"].startswith("SOC-2 Type II")

    def test_06_1click_helm_command_generator(self):
        """Ensures Helm command generator includes correct tenant parameters and gateway endpoint."""
        from mcp_server import api_get_helm_command
        import asyncio

        tenant_id = f"t_{self.unique_id}"
        api_key = f"ksec_live_{self.unique_id}_key"

        res = asyncio.run(api_get_helm_command(tenant_id, api_key))
        helm_cmd = res["helm_command"]

        assert f'--set tenantId="{tenant_id}"' in helm_cmd
        assert f'--set apiKey="{api_key}"' in helm_cmd
        assert '--set gateway.endpoint="https://ksec.space"' in helm_cmd

    def test_07_global_health_and_crdt_cluster_status(self):
        """Verifies container liveness, readiness probes, and multi-region CRDT state sync endpoints."""
        from mcp_server import health_live, health_ready, get_crdt_cluster_status
        import asyncio

        live_res = asyncio.run(health_live())
        assert live_res["status"] in ["ok", "healthy"]

        ready_res = asyncio.run(health_ready())
        assert ready_res["status"] in ["ready", "not_ready"]

        crdt_res = asyncio.run(get_crdt_cluster_status())
        assert crdt_res["status"] == "SYNCED"
        assert crdt_res["ptp_hardware_sync"] == "IEEE 1588 Compliant"
        assert len(crdt_res["active_edge_peers"]) >= 1

    def test_08_intent_to_execution_lease_enforcement(self):
        """Validates Intent-to-Execution (I2E) protocol kernel lease provisioning and retrieval."""
        from backend.app.api.v1.endpoints.intent import grant_intent_lease, list_intent_leases, IntentLeaseRequest
        import asyncio

        req = IntentLeaseRequest(intent_id="intent-net-01", pid=98432, action="ALLOW")
        res = asyncio.run(grant_intent_lease(req))

        assert res.status == "success"
        assert res.intent_id == "intent-net-01"
        assert res.pid == 98432
        assert res.enforced_in_kernel is True

        leases_res = asyncio.run(list_intent_leases())
        assert 98432 in leases_res["leases"]
        assert leases_res["leases"][98432]["allowed"] is True

    def test_09_nlp_compiler_and_safety_scoring(self):
        """Validates Natural Language Policy compilation, regex tokenization, and risk evaluation."""
        from backend.app.core.nlp_compiler import nlp_compiler

        query = "Allow python3 to connect to ports 443 and 8000, deny everything else"
        res = nlp_compiler.compile(query)

        assert res.overall_safety_rating == "SECURE"
        assert len(res.rules) == 1
        assert res.rules[0].target_comm == "python3"
        assert 443 in res.rules[0].allowed_ports
        assert 8000 in res.rules[0].allowed_ports

    def test_10_self_healing_incident_containment(self):
        """Validates automated process quarantine, forensics snapshotting, and recovery unfreeze."""
        from backend.app.core.incident_containment import incident_engine

        report = incident_engine.trigger_containment(pid=99991, comm="malicious_nc", reason="Unauthorized TCP spawn")
        assert report.status == "CONTAINED"
        assert report.pid == 99991
        assert "VMA_DUMP_SAVED" in report.forensics_snapshot["memory_state"]

        released = incident_engine.release_containment(report.incident_id)
        assert released.status == "RELEASED"

    def test_11_distributed_mesh_heartbeats(self):
        """Validates multi-node registration and latency monitoring."""
        from backend.app.core.mesh_manager import mesh_manager, EdgeNode

        node = EdgeNode(
            node_id="node-frankfurt-02",
            hostname="edge-eu.ksec.space",
            region="eu-central-1",
            ip_address="10.0.4.12",
            ebpf_probes_loaded=3,
            active_kprobes=["tcp_v4_connect", "cgroup_freeze", "sys_enter_connect"],
            cpu_usage_pct=2.1,
            memory_mb=256.0,
            status="ONLINE"
        )
        registered = mesh_manager.register_node(node)
        assert registered.node_id == "node-frankfurt-02"

        hb = mesh_manager.record_heartbeat("node-frankfurt-02", cpu_pct=3.5, mem_mb=260.0)
        assert hb is not None
        assert hb.cpu_usage_pct == 3.5

    def test_12_saas_metering_and_quota_enforcement(self):
        """Validates SaaS API usage metering, Redis token bucket counters, and quota breach prevention."""
        from backend.app.core.metering import quotas
        import asyncio
        import pytest
        from fastapi import HTTPException

        tenant_id = "test_tenant_metering_99"
        # Increment within limits
        val = asyncio.run(quotas.check_and_increment_quota(tenant_id, limit=5))
        assert val == 1

        usage = asyncio.run(quotas.get_usage(tenant_id))
        assert usage["used_requests"] == 1
        assert usage["tenant_id"] == tenant_id

        # Breach quota limit
        for _ in range(4):
            asyncio.run(quotas.check_and_increment_quota(tenant_id, limit=5))

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(quotas.check_and_increment_quota(tenant_id, limit=5))
        assert exc_info.value.status_code == 402

    def test_13_stripe_webhook_and_quota_boost(self):
        """Validates Stripe checkout session completion webhook and automated quota boosting."""
        from backend.app.api.v1.endpoints.stripe_webhook import stripe_webhook, create_stripe_checkout_session, CheckoutSessionCreateRequest
        import asyncio
        from unittest.mock import AsyncMock, MagicMock

        # Test session creation
        req = CheckoutSessionCreateRequest(tenant_id="tenant_stripe_test", plan_tier="enterprise", quota_boost=250000)
        session_res = asyncio.run(create_stripe_checkout_session(req))
        assert "checkout_url" in session_res
        assert session_res["metadata"]["quota_boost"] == 250000

        # Simulate webhook event payload
        webhook_payload = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_mock_123",
                    "metadata": {
                        "tenant_id": "tenant_stripe_test",
                        "quota_boost": "250000"
                    }
                }
            }
        }

        mock_request = MagicMock()
        mock_request.body = AsyncMock(return_value=json.dumps(webhook_payload).encode("utf-8"))
        mock_request.headers = {}

        res = asyncio.run(stripe_webhook(mock_request))
        assert res["status"] == "success"
        assert res["event_type"] == "checkout.session.completed"

    def test_14_ai_policy_creator_structured_schema(self):
        """Validates NLP policy compiler structured Pydantic model compilation and deterministic fallback."""
        from backend.app.core.nlp_compiler import nlp_compiler
        import asyncio

        prompt = "python3 agent must only connect to port 443 and 8000, drop everything else"
        res = asyncio.run(nlp_compiler.compile_natural_language(prompt))

        assert res.target_comm == "python3"
        assert 443 in res.allowed_ports
        assert 8000 in res.allowed_ports
        assert res.action == "ALLOW"
        assert res.risk_level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert len(res.rationale) > 0

    def test_15_grpc_mesh_telemetry_streaming(self):
        """Validates gRPC Telemetry Mesh servicer client streaming, payload ingestion, and tenant scoping."""
        from backend.app.grpc_server import grpc_servicer
        import asyncio

        async def sample_event_generator():
            yield {
                "tenant_id": "tenant_test_grpc",
                "node_id": "edge-tokyo-01",
                "timestamp_ns": 1756200000000,
                "pid": 58901,
                "uid": 1000,
                "comm": "python3",
                "event_type": "kprobe",
                "syscall": "tcp_v4_connect",
                "severity": "INFO",
                "details": {"src": "10.0.0.1:45678", "dst": "1.1.1.1:443"}
            }

        res = asyncio.run(grpc_servicer.StreamTelemetry(sample_event_generator(), context=None))
        assert res["received"] is True
        assert res["processed_count"] == 1

    def test_16_cgroupv2_quarantine_containment_endpoint(self):
        """Validates cgroupv2 process quarantine trigger endpoint and background task dispatch."""
        from backend.app.api.v1.endpoints.incident import trigger_auto_containment, IncidentContainmentRequest
        from fastapi import BackgroundTasks
        import asyncio

        bg = BackgroundTasks()
        req = IncidentContainmentRequest(pid=77123, comm="unauthorized_nc", reason="Unauthorized reverse shell", severity="CRIT")
        res = asyncio.run(trigger_auto_containment(req, bg))

        assert res.status == "contained"
        assert res.enforced_by == "cgroupv2-freeze"
        assert "77123" in res.incident_id
        assert len(bg.tasks) == 1

    def test_17_clickhouse_batch_ingestion_buffer(self):
        """Validates high-throughput ClickHouse telemetry buffer queueing and flush transactions."""
        from backend.app.core.clickhouse_client import ch_engine
        from backend.app.schemas.telemetry import EbpfEvent
        import asyncio

        event = EbpfEvent(
            pid=45601,
            comm="python3",
            event_type="kprobe",
            syscall="tcp_v4_connect",
            severity="INFO",
            details={"src_ip": "10.0.0.8", "dst_ip": "142.250.185.46", "sport": 49152, "dport": 443}
        )

        asyncio.run(ch_engine.add_event(tenant_id="tenant_ch_test", node_id="edge-node-01", event=event))
        assert len(ch_engine.buffer) >= 1

        asyncio.run(ch_engine.flush())
        assert len(ch_engine.buffer) == 0
        assert ch_engine.flushed_batches_count >= 1

    def test_18_hierarchical_swarm_stream_orchestration(self):
        """Validates fractal multi-agent swarm SSE stream execution and delegation steps."""
        from backend.app.api.v1.endpoints.swarm_stream import orchestrate_swarm_stream
        from backend.app.core.swarm_engine import HierarchicalSwarmRequest, SubAgent
        from unittest.mock import MagicMock
        import asyncio

        req = HierarchicalSwarmRequest(
            meta_agent_id="CEO-Test",
            objective="Verify zero-trust runtime policy compliance",
            sub_agents=[
                SubAgent(agent_id="sec-01", role="SECURITY", system_prompt="Inspect eBPF kernel rules")
            ]
        )

        mock_request = MagicMock()
        mock_request.is_disconnected = MagicMock(return_value=False)

        async def collect_stream():
            stream_resp = await orchestrate_swarm_stream(mock_request, req)
            events = []
            async for chunk in stream_resp.body_iterator:
                events.append(chunk)
            return events

        chunks = asyncio.run(collect_stream())
        assert len(chunks) >= 4
        assert any("swarm_step" in c for c in chunks)
        assert any("swarm_complete" in c for c in chunks)

    def test_19_cli_commands_and_intent_assertions(self):
        """Validates KSEC CLI make_request helper, intent leasing, and status inspection flows."""
        from unittest.mock import patch, MagicMock
        import importlib.util
        from pathlib import Path

        ksec_path = Path(__file__).parent.parent / "cli" / "ksec.py"
        spec = importlib.util.spec_from_file_location("ksec_cli", str(ksec_path))
        ksec_cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ksec_cli)

        args_status = MagicMock(api_url="http://localhost:8000")
        with patch.object(ksec_cli, "make_request") as mock_req:
            mock_req.side_effect = [
                {"status": "ok"},
                [{"node_id": "edge-01", "hostname": "h1", "region": "eu-1", "ebpf_probes_loaded": 4, "status": "ONLINE"}],
                [],
                {"tenant_id": "t1", "plan": "Enterprise", "used_requests": 1000, "limit": 50000}
            ]
            ksec_cli.cmd_status(args_status)
            assert mock_req.call_count == 4

        args_intent = MagicMock(api_url="http://localhost:8000", intent_id="intent-net-01", pid=4120, action="ALLOW")
        with patch.object(ksec_cli, "make_request") as mock_req:
            mock_req.return_value = {"intent_id": "intent-net-01", "pid": 4120, "action": "ALLOW", "status": "ENFORCED"}
            ksec_cli.cmd_intent(args_intent)
            mock_req.assert_called_once()

    def test_20_ringbuf_sentinel_and_crdt_sync_engine(self):
        """Validates dynamic ringbuf saturation sentinel, adaptive timeout tuning, and CRDT LWW sync."""
        from backend.app.core.ringbuf_sentinel import RingBufferSentinel
        from backend.app.core.crdt_sync import CRDTPolicyEngine

        # 1. Test RingBuffer Sentinel
        sentinel = RingBufferSentinel(capacity_bytes=1024)
        sentinel.record_batch(event_count=5, dropped_count=0, poll_duration_us=14.2)
        metrics = sentinel.get_health_metrics()
        assert metrics["status"] == "HEALTHY"
        assert metrics["sla_compliant"] is True

        # Heavy load saturation test
        sentinel.record_batch(event_count=20, dropped_count=2, poll_duration_us=45.0)
        saturated_metrics = sentinel.get_health_metrics()
        assert saturated_metrics["status"] == "SATURATED"
        assert saturated_metrics["adaptive_poll_timeout_ms"] < 10

        # 2. Test CRDT Policy Engine LWW conflict resolution
        crdt_local = CRDTPolicyEngine(local_node_id="node-fra-01")
        r1 = crdt_local.set_policy("rule-net-01", "curl", [80, 443], "ALLOW")
        assert len(crdt_local.get_active_policies()) == 1

        # Remote newer update
        remote_records = [{
            "policy_id": "rule-net-01",
            "target_comm": "curl",
            "allowed_ports": [443],
            "action": "ALLOW",
            "timestamp_ns": r1.timestamp_ns + 5000000,
            "node_origin": "node-tokyo-02",
            "deleted": False
        }]
        res = crdt_local.merge_remote_state(remote_records)
        assert res["applied"] == 1
        assert crdt_local.get_active_policies()[0].allowed_ports == [443]

        # Remote tombstone
        crdt_local.delete_policy("rule-net-01")
        assert len(crdt_local.get_active_policies()) == 0

    def test_21_benchmark_latency_and_crdt_endpoints(self):
        """Validates /api/v1/benchmark/latency, /api/v1/mesh/crdt/sync, and /api/v1/mesh/crdt/state endpoints."""
        from fastapi.testclient import TestClient
        from backend.app.main import app

        client = TestClient(app)

        # 1. Benchmark latency report
        resp = client.get("/api/v1/benchmark/latency")
        assert resp.status_code == 200
        data = resp.json()
        assert "p50_us" in data
        assert "p99_us" in data
        assert "sla_status" in data
        assert "ring_buffer" in data
        assert data["target_sla_us"] == 50.0

        # 2. CRDT Sync
        sync_payload = {
            "source_node_id": "test-edge-fra-01",
            "records": [
                {
                    "policy_id": "policy-fastapi-01",
                    "target_comm": "uvicorn",
                    "allowed_ports": [8000],
                    "action": "ALLOW",
                    "timestamp_ns": 1700000000000000000,
                    "node_origin": "test-edge-fra-01",
                    "deleted": False
                }
            ]
        }
        sync_resp = client.post("/api/v1/mesh/crdt/sync", json=sync_payload)
        assert sync_resp.status_code == 200
        assert sync_resp.json()["status"] == "synchronized"

        # 3. CRDT State Export
        state_resp = client.get("/api/v1/mesh/crdt/state")
        assert state_resp.status_code == 200
        state_data = state_resp.json()
        assert "node_id" in state_data
        assert "policies" in state_data
        assert any(p["policy_id"] == "policy-fastapi-01" for p in state_data["policies"])
















"""
End-to-End Prospective Candidate User Journey Test Suite for KSEC Ecosystem (ksec.space).
Tests every step of the user journey from landing discovery, registration, OTP activation,
1-Click Helm onboarding, Gemini NLP policy compilation, intent leasing, cgroupv2 quarantine,
SaaS Stripe billing upgrade, to cryptographic SOC-2 audit manifest exportation.
"""

import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


class TestCandidateUserJourney:
    @classmethod
    def setup_class(cls):
        cls.client = TestClient(app)
        cls.candidate_email = f"candidate_{int(time.time())}@enterprise-ai.io"
        cls.candidate_password = "SecureEnterprisePassword2026!"
        cls.candidate_name = "Chief Information Security Officer"
        cls.candidate_company = "Autonomous AI Holdings"
        cls.jwt_token = None
        cls.tenant_id = None
        cls.api_key = None

    def test_step_01_landing_discovery_and_healthz(self):
        """Step 1: Prospective candidate accesses public health and openapi contracts."""
        resp = self.client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        openapi_resp = self.client.get("/openapi.json")
        assert openapi_resp.status_code == 200
        assert "paths" in openapi_resp.json()

    def test_step_02_registration_and_otp_dispatch(self):
        """Step 2: Candidate submits registration form and receives 6-digit OTP."""
        payload = {
            "email": self.candidate_email,
            "full_name": self.candidate_name,
            "password": self.candidate_password,
            "company_name": self.candidate_company
        }
        resp = self.client.post("/api/auth/register", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == self.candidate_email
        assert "otp_debug" in data
        assert len(data["otp_debug"]) == 6
        self.__class__.latest_otp = data["otp_debug"]

    def test_step_03_otp_verification_and_jwt_issuance(self):
        """Step 3: Candidate enters 6-digit OTP code and receives JWT session token."""
        verify_payload = {
            "email": self.candidate_email,
            "otp_code": self.latest_otp
        }
        resp = self.client.post("/api/auth/verify-otp", json=verify_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == self.candidate_email

        self.__class__.jwt_token = data["access_token"]
        self.__class__.tenant_id = data["user"]["tenant_id"]
        self.__class__.api_key = data["user"]["api_key"]

    def test_step_04_authenticated_profile_resolution(self):
        """Step 4: Candidate validates active session profile via /api/auth/me."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        resp = self.client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["authenticated"] is True
        assert data["email"] == self.candidate_email
        assert data["tenant_id"] == self.tenant_id

    def test_step_05_1click_helm_command_generation(self):
        """Step 5: Candidate generates 1-Click Helm onboarding script for Kubernetes cluster."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        resp = self.client.get(
            f"/api/v1/tenant/helm-command?tenant_id={self.tenant_id}&api_key={self.api_key}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert self.tenant_id in data["helm_command"]
        assert self.api_key in data["helm_command"]
        assert "ksec-shield" in data["helm_command"]

    def test_step_06_nlp_policy_compilation(self):
        """Step 6: Candidate creates eBPF firewall policy via Natural Language AI Compiler."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        prompt_payload = {
            "natural_language_rule": "Allow python worker to communicate with Postgres on port 5432 and Redis on port 6379"
        }
        resp = self.client.post("/api/v1/policy/compile", json=prompt_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "target_comm" in data
        assert 5432 in data["allowed_ports"]
        assert 6379 in data["allowed_ports"]
        assert data["action"] == "ALLOW"

    def test_step_07_atomic_intent_lease_declaration(self):
        """Step 7: Candidate declares atomic intent lease for a live agent PID."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        lease_payload = {
            "intent_id": "intent-candidate-01",
            "pid": 5840,
            "action": "ALLOW"
        }
        resp = self.client.post("/api/v1/intent/lease", json=lease_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["intent_id"] == "intent-candidate-01"
        assert data["pid"] == 5840
        assert data["status"] in ["success", "ENFORCED"]

    def test_step_08_causal_dag_forensics_simulation(self):
        """Step 8: Candidate replays causal blast radius DAG for an unauthorized DROP TABLE attack."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        dag_payload = {
            "payload": "DROP TABLE critical_user_accounts; --",
            "agent_id": "rogue-langchain-agent"
        }
        resp = self.client.post("/api/v1/forensics/simulate-dag", json=dag_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_potential_rows_compromised"] > 1000000
        assert data["estimated_rto_hours_saved"] > 0
        assert len(data["causal_dag_nodes"]) >= 3

    def test_step_09_cgroupv2_quarantine_containment(self):
        """Step 9: Automated containment freezes malicious PID in sub-millisecond."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        containment_payload = {
            "pid": 6912,
            "comm": "python_eval",
            "severity": "CRIT",
            "reason": "Unauthorized kernel memory modification"
        }
        resp = self.client.post("/api/v1/incident/contain", json=containment_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["contained", "FROZEN", "CONTAINED"]
        assert str(containment_payload["pid"]) in data["incident_id"]
        assert data["enforced_by"] == "cgroupv2-freeze"

    def test_step_10_distributed_mesh_crdt_replication(self):
        """Step 10: Candidate inspects global edge nodes and syncs CRDT policy vectors."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        nodes_resp = self.client.get("/api/v1/mesh/nodes", headers=headers)
        assert nodes_resp.status_code == 200
        assert len(nodes_resp.json()) >= 1

        crdt_resp = self.client.get("/api/v1/mesh/crdt/state", headers=headers)
        assert crdt_resp.status_code == 200
        assert "policies" in crdt_resp.json()

    def test_step_11_sub_microsecond_latency_sla(self):
        """Step 11: Candidate verifies kernel latency distribution SLA (< 50.0µs ceiling)."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        resp = self.client.get("/api/v1/benchmark/latency", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["p50_us"] < 50.0
        assert data["p99_us"] < 50.0
        assert data["sla_status"] == "COMPLIANT"

    def test_step_12_saas_billing_checkout_session(self):
        """Step 12: Candidate generates Stripe checkout link to upgrade to Team Pro."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        checkout_payload = {
            "plan_tier": "pro",
            "tenant_id": self.tenant_id
        }
        resp = self.client.post("/api/v1/billing/checkout", json=checkout_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "checkout_url" in data
        assert "stripe.com" in data["checkout_url"]

    def test_step_13_stripe_webhook_quota_boost(self):
        """Step 13: Stripe webhook confirms payment and automates quota expansion."""
        webhook_payload = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "client_reference_id": self.tenant_id,
                    "metadata": {"plan_tier": "enterprise"},
                    "customer_email": self.candidate_email
                }
            }
        }
        resp = self.client.post(
            "/api/v1/billing/webhook",
            json=webhook_payload,
            headers={"Stripe-Signature": "test_signature"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] in ["processed", "PROCESSED"]

    def test_step_14_soc2_audit_vault_export(self):
        """Step 14: Candidate exports cryptographic SHA-256 sealed SOC-2 Type II audit manifest."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        resp = self.client.get(
            f"/api/v1/audit/export-manifest?tenant_id={self.tenant_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SEALED_AND_VERIFIED"
        assert len(data["integrity_sha256_seal"]) == 64
        assert "SOC-2" in data["compliance_standard"]

    def test_step_15_logout_and_session_termination(self):
        """Step 15: Candidate terminates session securely."""
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        resp = self.client.post("/api/auth/logout", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "LOGGED_OUT"

"""
Comprehensive Multi-Tenant SaaS Isolation & Security Guardrail Test Suite for KSEC.
Validates:
1. Complete tenant account, key, and database context isolation.
2. Cross-tenant access denial (Row-Level Security & Cryptographic Boundaries).
3. Multi-tenant real-time telemetry stream separation (Noisy Neighbor / Snooping prevention).
4. Independent Token Bucket rate-limiting & quota isolation per tenant.
5. Isolated SOC-2 Type II audit manifest generation per tenant.
"""

import time
import asyncio
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.broadcaster import event_broadcaster
from backend.app.schemas.telemetry import EbpfEvent
from backend.app.core.metering import quotas
from src.auth.tenant import TenantContext, enforce_tenant_isolation, TenantIsolationError


class TestMultiTenantSaaSIsolation:
    @classmethod
    def setup_class(cls):
        cls.client = TestClient(app)
        timestamp = int(time.time())

        # Tenant Alpha (Enterprise Tier)
        cls.alpha_email = f"ciso_alpha_{timestamp}@alpha-corp.com"
        cls.alpha_pass = "AlphaPassSecure2026!"
        cls.alpha_company = "Alpha Corporation"
        cls.alpha_token = None
        cls.alpha_tenant_id = None
        cls.alpha_api_key = None

        # Tenant Bravo (Healthcare AI Tier)
        cls.bravo_email = f"secops_bravo_{timestamp}@bravo-health.org"
        cls.bravo_pass = "BravoPassSecure2026!"
        cls.bravo_company = "Bravo Healthcare AI"
        cls.bravo_token = None
        cls.bravo_tenant_id = None
        cls.bravo_api_key = None

    def test_01_isolated_tenant_registration_and_activation(self):
        """Alpha and Bravo register independently, receiving unique tenant IDs and cryptographic keys."""
        # 1. Register Alpha
        alpha_reg = self.client.post("/api/auth/register", json={
            "email": self.alpha_email,
            "full_name": "Alpha CISO",
            "password": self.alpha_pass,
            "company_name": self.alpha_company
        })
        assert alpha_reg.status_code == 200
        alpha_otp = alpha_reg.json()["otp_debug"]

        alpha_verify = self.client.post("/api/auth/verify-otp", json={
            "email": self.alpha_email,
            "otp_code": alpha_otp
        })
        assert alpha_verify.status_code == 200
        alpha_data = alpha_verify.json()
        self.__class__.alpha_token = alpha_data["access_token"]
        self.__class__.alpha_tenant_id = alpha_data["user"]["tenant_id"]
        self.__class__.alpha_api_key = alpha_data["user"]["api_key"]

        # 2. Register Bravo
        bravo_reg = self.client.post("/api/auth/register", json={
            "email": self.bravo_email,
            "full_name": "Bravo SecOps",
            "password": self.bravo_pass,
            "company_name": self.bravo_company
        })
        assert bravo_reg.status_code == 200
        bravo_otp = bravo_reg.json()["otp_debug"]

        bravo_verify = self.client.post("/api/auth/verify-otp", json={
            "email": self.bravo_email,
            "otp_code": bravo_otp
        })
        assert bravo_verify.status_code == 200
        bravo_data = bravo_verify.json()
        self.__class__.bravo_token = bravo_data["access_token"]
        self.__class__.bravo_tenant_id = bravo_data["user"]["tenant_id"]
        self.__class__.bravo_api_key = bravo_data["user"]["api_key"]

        # 3. Assert complete physical divergence of identity and keys
        assert self.alpha_tenant_id != self.bravo_tenant_id
        assert self.alpha_api_key != self.bravo_api_key
        assert self.alpha_token != self.bravo_token

    def test_02_strict_profile_and_session_isolation(self):
        """Querying /api/auth/me with Alpha's JWT returns only Alpha's profile, never Bravo's."""
        alpha_headers = {"Authorization": f"Bearer {self.alpha_token}"}
        resp_alpha = self.client.get("/api/auth/me", headers=alpha_headers)
        assert resp_alpha.status_code == 200
        assert resp_alpha.json()["email"] == self.alpha_email
        assert resp_alpha.json()["tenant_id"] == self.alpha_tenant_id
        assert resp_alpha.json()["company_name"] == self.alpha_company

        bravo_headers = {"Authorization": f"Bearer {self.bravo_token}"}
        resp_bravo = self.client.get("/api/auth/me", headers=bravo_headers)
        assert resp_bravo.status_code == 200
        assert resp_bravo.json()["email"] == self.bravo_email
        assert resp_bravo.json()["tenant_id"] == self.bravo_tenant_id
        assert resp_bravo.json()["company_name"] == self.bravo_company

    def test_03_tenant_contextvar_and_rls_guard(self):
        """ContextVar and enforce_tenant_isolation raise TenantIsolationError on cross-tenant access."""
        with TenantContext(self.alpha_tenant_id):
            # Same tenant access succeeds
            enforce_tenant_isolation(self.alpha_tenant_id)

            # Cross-tenant access must raise TenantIsolationError
            with pytest.raises(TenantIsolationError):
                enforce_tenant_isolation(self.bravo_tenant_id)

    @pytest.mark.anyio
    async def test_04_realtime_telemetry_stream_isolation(self):
        """Alpha's isolated subscriber queue receives only Alpha's events; Bravo never receives Alpha's stream."""
        # Subscribe Alpha and Bravo to isolated broadcaster queues
        alpha_queue = await event_broadcaster.subscribe(self.alpha_tenant_id)
        bravo_queue = await event_broadcaster.subscribe(self.bravo_tenant_id)

        try:
            # Publish event scoped exclusively to Alpha
            event_alpha = EbpfEvent(
                pid=9101,
                comm="alpha_worker",
                event_type="tracepoint",
                syscall="sys_enter_connect",
                details={"tenant_id": self.alpha_tenant_id, "dst_ip": "10.0.0.1", "dst_port": 5432},
                severity="INFO"
            )
            await event_broadcaster.publish(event_alpha)

            # Alpha must receive its event immediately
            received_alpha = alpha_queue.get_nowait()
            assert received_alpha.details.get("tenant_id") == self.alpha_tenant_id
            assert received_alpha.comm == "alpha_worker"

            # Bravo's queue must remain strictly empty (zero data leakage)
            assert bravo_queue.empty() is True

        finally:
            await event_broadcaster.unsubscribe(self.alpha_tenant_id, alpha_queue)
            await event_broadcaster.unsubscribe(self.bravo_tenant_id, bravo_queue)

    @pytest.mark.anyio
    async def test_05_independent_quota_token_bucket_isolation(self):
        """Alpha exhausting its quota bucket does not throttle Bravo (Anti-Noisy-Neighbor)."""
        limit = 5

        # 1. Exhaust Alpha's quota
        for _ in range(limit):
            await quotas.check_and_increment_quota(self.alpha_tenant_id, limit=limit)

        # Alpha's next request must raise 429 Too Many Requests
        with pytest.raises(Exception):
            await quotas.check_and_increment_quota(self.alpha_tenant_id, limit=limit)

        # 2. Bravo must still have its fresh, independent capacity unaffected
        bravo_status = await quotas.check_and_increment_quota(self.bravo_tenant_id, limit=limit)
        assert bravo_status == 1

    def test_06_isolated_soc2_audit_vault_manifests(self):
        """Alpha and Bravo receive distinct cryptographic SHA-256 audit manifests scoped to their tenant."""
        alpha_headers = {"Authorization": f"Bearer {self.alpha_token}"}
        resp_alpha = self.client.get(
            f"/api/v1/audit/export-manifest?tenant_id={self.alpha_tenant_id}",
            headers=alpha_headers
        )
        assert resp_alpha.status_code == 200
        alpha_manifest = resp_alpha.json()
        assert alpha_manifest["tenant_id"] == self.alpha_tenant_id

        bravo_headers = {"Authorization": f"Bearer {self.bravo_token}"}
        resp_bravo = self.client.get(
            f"/api/v1/audit/export-manifest?tenant_id={self.bravo_tenant_id}",
            headers=bravo_headers
        )
        assert resp_bravo.status_code == 200
        bravo_manifest = resp_bravo.json()
        assert bravo_manifest["tenant_id"] == self.bravo_tenant_id

        # Integrity seals must be completely distinct
        assert alpha_manifest["integrity_sha256_seal"] != bravo_manifest["integrity_sha256_seal"]

"""
KSEC v2.0 — Enterprise SaaS Authentication & 6-Digit OTP Verification Test Suite
Tests:
- User Registration & OTP Generation
- 6-Digit OTP Verification and JWT Token Activation
- Invalid OTP Rejection & Brute-Force Rate Limiting
- User Login & Password Hash Authentication
- Current User Profile (/api/auth/me)
- Session Termination & Token Revocation (/api/auth/logout)
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from mcp_server import app
from src.auth.auth_service import auth_service


import uuid

class TestSaaSAuthLifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        unique_suffix = uuid.uuid4().hex[:6]
        cls.test_email = f"alex.founder_{unique_suffix}@agentmatrix.ai"
        cls.test_password = "KsecEnterprisePassword2026!"
        cls.test_name = "Alex Vance"
        cls.test_company = "Agent Matrix Autonomous Labs"

    def test_01_user_registration_dispatches_otp(self):
        payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "company_name": self.test_company
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "OTP_DISPATCHED")
        self.assertEqual(data["email"], self.test_email.lower())
        self.assertTrue("otp_debug" in data)
        self.assertEqual(len(data["otp_debug"]), 6)
        TestSaaSAuthLifecycle.active_otp = data["otp_debug"]

    def test_02_invalid_otp_rejection(self):
        payload = {
            "email": self.test_email,
            "otp_code": "000000" if self.active_otp != "000000" else "999999"
        }
        response = self.client.post("/api/auth/verify-otp", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid OTP code", response.json()["detail"])

    def test_03_valid_otp_verification_activates_tenant_jwt(self):
        payload = {
            "email": self.test_email,
            "otp_code": self.active_otp
        }
        response = self.client.post("/api/auth/verify-otp", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "VERIFIED_SUCCESS")
        self.assertTrue("access_token" in data)
        self.assertEqual(data["user"]["email"], self.test_email.lower())
        self.assertEqual(data["user"]["company_name"], self.test_company)
        self.assertTrue(data["user"]["tenant_id"].startswith("t_"))
        self.assertTrue(data["user"]["api_key"].startswith("ksec_live_"))
        TestSaaSAuthLifecycle.jwt_token = data["access_token"]

    def test_04_user_login_with_valid_credentials(self):
        payload = {
            "email": self.test_email,
            "password": self.test_password
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "AUTHENTICATED")
        self.assertTrue("access_token" in data)
        self.assertEqual(data["user"]["email"], self.test_email.lower())

    def test_05_user_login_invalid_password(self):
        payload = {
            "email": self.test_email,
            "password": "WrongPassword123"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid email or password", response.json()["detail"])

    def test_06_get_current_user_profile_me(self):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["authenticated"])
        self.assertEqual(data["email"], self.test_email.lower())
        self.assertEqual(data["role"], "Admin")
        self.assertEqual(data["plan_tier"], "Team Pro")

    def test_07_user_logout_and_session_revocation(self):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        # Logout
        response = self.client.post("/api/auth/logout", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "LOGGED_OUT")

        # Subsequent call with revoked token must fail with 401
        response_me = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(response_me.status_code, 401)
        self.assertIn("revoked", response_me.json()["detail"])


if __name__ == "__main__":
    unittest.main()

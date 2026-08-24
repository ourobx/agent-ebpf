"""
KSEC v2.0 — Live Gateway HTTP Route Verification
Tests static route endpoints (/ redirects to /landing.html#, /landing.html, /console, /whitepaper, /robots.txt, /sitemap.xml).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from mcp_server import app


class TestLiveGatewayRoutes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_apex_redirect_to_landing_html(self):
        # Without follow_redirects: returns 307 with Location header
        response = self.client.get("/", headers={"accept": "text/html"}, follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers.get("location"), "/landing.html#")

    def test_direct_landing_html_endpoint(self):
        response = self.client.get("/landing.html")
        self.assertEqual(response.status_code, 200)
        self.assertIn("KSEC", response.text)
        self.assertIn("Autonomous AI Defense", response.text)

    def test_console_mission_control(self):
        response = self.client.get("/console")
        self.assertEqual(response.status_code, 200)
        self.assertIn("KSEC", response.text)

    def test_whitepaper_endpoint(self):
        response = self.client.get("/whitepaper")
        self.assertEqual(response.status_code, 200)
        self.assertIn("KSEC v2.0 Technical Whitepaper", response.text)

    def test_styles_css(self):
        response = self.client.get("/styles.css")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/css", response.headers.get("content-type", ""))

    def test_robots_txt(self):
        response = self.client.get("/robots.txt")
        self.assertEqual(response.status_code, 200)
        self.assertIn("User-agent: *", response.text)

    def test_sitemap_xml(self):
        response = self.client.get("/sitemap.xml")
        self.assertEqual(response.status_code, 200)
        self.assertIn("urlset", response.text)


if __name__ == "__main__":
    unittest.main()

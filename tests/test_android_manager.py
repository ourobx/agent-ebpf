"""
Tests for Agent-eBPF Android Management API (AM API) Manager & MCP Integration (Real API Mode).
"""

import asyncio
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from tools.android_manager import AndroidDeviceManager, android_manager
from mcp_server import app, execute_tool, TOOLS


@pytest.fixture
def unconfigured_manager():
    return AndroidDeviceManager(key_path="non_existent_key.json")


def test_android_manager_unconfigured(unconfigured_manager):
    """Verifies that manager detects missing credentials without generating fake data."""
    assert unconfigured_manager.is_configured is False
    assert unconfigured_manager.list_devices() == []
    summary = unconfigured_manager.get_fleet_summary()
    assert summary["configured"] is False
    assert summary["mode"] == "unconfigured"


def test_generate_qr_code_base64(unconfigured_manager):
    """Verifies QR code base64 generation for provisioning data."""
    qr_uri = unconfigured_manager.generate_qr_code_base64("REAL-GOOGLE-TOKEN-DATA")
    assert qr_uri.startswith("data:image/")
    assert len(qr_uri) > 50


def test_unconfigured_token_and_command_errors(unconfigured_manager):
    """Verifies that unconfigured manager returns honest error messages instead of fake tokens."""
    tok_res = unconfigured_manager.create_enrollment_token()
    assert tok_res.get("success") is False
    assert "missing" in tok_res.get("error", "").lower()

    cmd_res = unconfigured_manager.execute_command("dev-1", "LOCK")
    assert cmd_res.get("success") is False
    assert "missing" in cmd_res.get("error", "").lower()


def test_execute_command_invalid(unconfigured_manager):
    """Tests invalid command handling."""
    res = unconfigured_manager.execute_command("dev-1", "INVALID_COMMAND")
    assert res.get("success") is False
    assert "Invalid command" in res.get("error", "")


def test_real_google_api_interaction_with_mock_client():
    """Tests that AndroidDeviceManager correctly calls Google API when configured."""
    mock_service = MagicMock()
    mock_devices_req = MagicMock()
    mock_devices_req.execute.return_value = {
        "devices": [
            {
                "name": "enterprises/123/devices/real-pixel-9",
                "hardwareInfo": {"model": "Google Pixel 9", "manufacturer": "Google"},
                "softwareInfo": {"androidVersion": "15"},
                "appliedState": "ACTIVE",
                "powerManagementEvents": [{"batteryLevel": 95}]
            }
        ]
    }
    mock_service.enterprises().devices().list.return_value = mock_devices_req

    manager = AndroidDeviceManager()
    manager.service = mock_service
    manager.is_configured = True
    manager.enterprise_id = "test-enterprise-123"

    devices = manager.list_devices()
    assert len(devices) == 1
    assert devices[0]["model"] == "Google Pixel 9"
    assert devices[0]["osVersion"] == "Android 15"
    assert devices[0]["batteryLevel"] == 95


def test_mcp_android_tools():
    """Tests Android tools via MCP execute_tool."""
    async def run_tests():
        res_list = await execute_tool("android_list_devices", {})
        assert "devices" in res_list

        res_sum = await execute_tool("android_get_fleet_summary", {})
        assert "configured" in res_sum

    asyncio.run(run_tests())


def test_fastapi_android_endpoints():
    """Tests REST API endpoints for Android MDM."""
    client = TestClient(app)

    r1 = client.get("/api/android/devices")
    assert r1.status_code == 200
    assert "devices" in r1.json()

    r2 = client.get("/api/android/summary")
    assert r2.status_code == 200
    assert "configured" in r2.json()

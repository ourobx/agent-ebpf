"""
Agent-eBPF Android Management API (AM API) Manager.
Enables real-time remote device enrollment, fleet monitoring, security policy enforcement,
and remote actions (LOCK, WIPE, REBOOT) for Android endpoints using Google Cloud credentials.
"""

import os
import json
import io
import base64
import time
import structlog
from typing import Dict, Any, List, Optional

logger = structlog.get_logger("android_manager")

# Scopes required for Google Android Management API
ANDROID_MANAGEMENT_SCOPES = [
    "https://www.googleapis.com/auth/androidmanagement"
]

# Google API Client imports
GOOGLE_API_AVAILABLE = False
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False

# QR code generator library import
QRCODE_AVAILABLE = False
try:
    import qrcode
    QRCODE_AVAILABLE = True
except ImportError:
    QRCODE_AVAILABLE = False


class AndroidDeviceManager:
    """
    Manages Android enterprise devices strictly via Google Android Management API (AM API).
    Operates on live Google Cloud API endpoints with zero fake/mock device data.
    """

    def __init__(self, key_path: Optional[str] = None, enterprise_id: Optional[str] = None):
        self.key_path = key_path or os.getenv("ANDROID_SA_KEY_PATH", "service_account.json")
        self.enterprise_id = enterprise_id or os.getenv("ANDROID_ENTERPRISE_ID", "")
        self.service = None
        self.is_configured = False

        self._initialize_service()

    def _initialize_service(self):
        """Initializes Google API Service Client from Service Account JSON key."""
        if not GOOGLE_API_AVAILABLE:
            logger.warning("Google API client packages (googleapiclient, google-auth) not installed.")
            self.is_configured = False
            return

        if not os.path.exists(self.key_path):
            logger.warning(f"Service Account key file '{self.key_path}' not found. Real Android API calls require this JSON key.")
            self.is_configured = False
            return

        try:
            creds = service_account.Credentials.from_service_account_file(
                self.key_path,
                scopes=ANDROID_MANAGEMENT_SCOPES
            )
            self.service = build('androidmanagement', 'v1', credentials=creds)
            self.is_configured = True
            logger.info(f"Successfully authenticated with Google Android Management API using '{self.key_path}'.")
        except Exception as e:
            logger.error(f"Failed to authenticate with Android Management API: {e}")
            self.is_configured = False

    def get_enterprise_name(self) -> str:
        """Formats full enterprise resource name."""
        if not self.enterprise_id:
            return ""
        if not self.enterprise_id.startswith("enterprises/"):
            return f"enterprises/{self.enterprise_id}"
        return self.enterprise_id

    def generate_qr_code_base64(self, text_data: str) -> str:
        """Generates a Base64 encoded PNG data URI for a QR code."""
        if QRCODE_AVAILABLE:
            try:
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=8,
                    border=2,
                )
                qr.add_data(text_data)
                qr.make(fit=True)
                img = qr.make_image(fill_color="#00ff88", back_color="#0b0f19")
                buffered = io.BytesIO()
                img.save(buffered, format="PNG")
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                return f"data:image/png;base64,{img_str}"
            except Exception as ex:
                logger.warning(f"Error generating QR image: {ex}")

        # No silent fallback to a synthetic placeholder: if a real QR code
        # cannot be generated, surface a clear error instead of fabricating one.
        raise RuntimeError(
            "QR code generation is unavailable. Install the 'qrcode' package "
            "or fix the QR generation error; refusing to return fake provisioning data."
        )

    def create_enrollment_token(self, policy_name: str = "sentinel-strict", duration_hours: int = 24) -> Dict[str, Any]:
        """
        Creates a real enrollment token on Google Cloud for onboarding an Android device.
        """
        if not self.is_configured or not self.service:
            return {
                "success": False,
                "error": "Google Service Account key (service_account.json) is missing or not configured. Please place your real Google Cloud key file in the root directory."
            }

        enterprise_name = self.get_enterprise_name()
        if not enterprise_name:
            return {
                "success": False,
                "error": "ANDROID_ENTERPRISE_ID is not configured in .env. Please provide your Google Enterprise ID."
            }

        try:
            token_body = {
                "policyName": f"{enterprise_name}/policies/{policy_name}",
                "duration": f"{duration_hours * 3600}s"
            }
            request = self.service.enterprises().enrollmentTokens().create(
                parent=enterprise_name,
                body=token_body
            )
            response = request.execute()
            token_val = response.get("value", "")

            qr_json = json.dumps({
                "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.google.android.apps.work.clouddpc/.receivers.CloudDpcDeviceAdminReceiver",
                "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
                    "com.google.android.apps.work.clouddpc.EXTRA_ENROLLMENT_TOKEN": token_val
                }
            })

            qr_b64 = self.generate_qr_code_base64(qr_json)
            response["qrCodeDataUri"] = qr_b64
            response["token"] = token_val
            response["success"] = True
            response["mode"] = "live"
            return response
        except Exception as e:
            logger.error(f"Failed to create enrollment token via Google API: {e}")
            return {"success": False, "error": str(e)}

    def list_devices(self) -> List[Dict[str, Any]]:
        """Lists all live registered Android devices from Google Cloud API."""
        if not self.is_configured or not self.service:
            logger.warning("Google Service Account not configured. Returning empty device list.")
            return []

        enterprise_name = self.get_enterprise_name()
        if not enterprise_name:
            logger.warning("ANDROID_ENTERPRISE_ID not configured. Returning empty device list.")
            return []

        try:
            request = self.service.enterprises().devices().list(parent=enterprise_name)
            response = request.execute()
            devices = response.get("devices", [])

            formatted = []
            for d in devices:
                d["deviceId"] = d.get("name", "").split("/")[-1]
                d["model"] = d.get("hardwareInfo", {}).get("model", "Android Device")
                d["manufacturer"] = d.get("hardwareInfo", {}).get("manufacturer", "OEM")
                d["osVersion"] = f"Android {d.get('softwareInfo', {}).get('androidVersion', 'N/A')}"
                d["batteryLevel"] = d.get("powerManagementEvents", [{}])[-1].get("batteryLevel", 0)
                d["complianceState"] = "COMPLIANT" if d.get("appliedState") == "ACTIVE" else "NON_COMPLIANT"
                formatted.append(d)
            return formatted
        except Exception as e:
            logger.error(f"Failed to fetch devices from Google API: {e}")
            return []

    def get_fleet_summary(self) -> Dict[str, Any]:
        """Calculates fleet metrics from real Google Cloud API data."""
        devices = self.list_devices()
        total_count = len(devices)
        compliant_count = sum(1 for d in devices if d.get("complianceState") == "COMPLIANT")
        avg_battery = int(sum(d.get("batteryLevel", 0) for d in devices) / max(total_count, 1)) if total_count > 0 else 0

        if total_count > 0:
            security_score = f"{int(100 * compliant_count / total_count)}/{total_count} COMPLIANT"
        else:
            security_score = "N/A (No Endpoints)"

        return {
            "totalDevices": total_count,
            "activeDevices": compliant_count,
            "avgBattery": avg_battery,
            "securityScore": security_score,
            "configured": self.is_configured,
            "mode": "live" if self.is_configured else "unconfigured"
        }

    def execute_command(self, device_id: str, command_type: str, duration_seconds: int = 0) -> Dict[str, Any]:
        """
        Executes a real remote command (LOCK, WIPE, REBOOT, REBOOT_CLEAR_PASSCODE) on Google Cloud.
        """
        command_type = command_type.upper()
        allowed_commands = ["LOCK", "WIPE", "REBOOT", "REBOOT_CLEAR_PASSCODE"]
        if command_type not in allowed_commands:
            return {"success": False, "error": f"Invalid command '{command_type}'. Allowed: {allowed_commands}"}

        if not self.is_configured or not self.service:
            return {"success": False, "error": "Google Service Account key (service_account.json) is missing. Please provide real credentials."}

        enterprise_name = self.get_enterprise_name()
        if not enterprise_name:
            return {"success": False, "error": "ANDROID_ENTERPRISE_ID is not configured in .env."}

        try:
            device_resource_name = device_id if device_id.startswith("enterprises/") else f"{enterprise_name}/devices/{device_id.replace('devices/', '')}"
            command_body = {"type": command_type}
            if duration_seconds > 0 and command_type == "LOCK":
                command_body["duration"] = f"{duration_seconds}s"

            request = self.service.enterprises().devices().issueCommand(
                name=device_resource_name,
                body=command_body
            )
            response = request.execute()
            return {
                "success": True,
                "mode": "live",
                "response": response,
                "message": f"Real command '{command_type}' issued to device {device_id} via Google API."
            }
        except Exception as e:
            logger.error(f"Failed to issue real command '{command_type}' to device '{device_id}': {e}")
            return {"success": False, "error": str(e)}

    def apply_policy(self, policy_id: str, policy_spec: Dict[str, Any]) -> Dict[str, Any]:
        """
        Patches or updates a real security policy on Google Android Management API.
        """
        if not self.is_configured or not self.service:
            return {"success": False, "error": "Google Service Account key (service_account.json) is missing. Please provide real credentials."}

        enterprise_name = self.get_enterprise_name()
        if not enterprise_name:
            return {"success": False, "error": "ANDROID_ENTERPRISE_ID is not configured in .env."}

        full_policy_name = f"{enterprise_name}/policies/{policy_id}"
        try:
            request = self.service.enterprises().policies().patch(
                name=full_policy_name,
                body=policy_spec
            )
            response = request.execute()
            return {
                "success": True,
                "mode": "live",
                "policy": response,
                "message": f"Real policy '{policy_id}' successfully updated on Google Cloud."
            }
        except Exception as e:
            logger.error(f"Failed to apply real policy '{policy_id}': {e}")
            return {"success": False, "error": str(e)}


# Singleton instance for system usage
android_manager = AndroidDeviceManager()

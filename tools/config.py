"""
Agent-eBPF Central Configuration.

Strict, environment-driven configuration with fail-fast validation.
No hardcoded secret defaults are allowed in production: any critical
credential that is missing results in a clear startup error instead of a
silent fallback to synthetic/mocked values.
"""
import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Reads every value strictly from environment variables / .env file."""

    # Runtime environment: 'production' | 'development' | 'test'
    environment: str = "development"

    # Database
    database_url: str = ""

    # Security / OAuth
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    oauth_client_id: str = ""
    oauth_client_secret: str = ""

    # Android Management API
    android_sa_key_path: str = ""
    android_enterprise_id: str = ""

    # Security / CORS
    cors_origins: str = "https://ksec.space,http://localhost:8000,http://localhost:3000"

    # eBPF / runtime
    xdp_interface: str = "eth0"
    policy_file: str = "policy.yaml"
    mcp_tool_timeout: float = 30.0
    port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    def effective_jwt_secret(self) -> str:
        """Returns the configured secret, or an explicit insecure dev value
        ONLY outside production. Production never falls back."""
        if self.jwt_secret_key:
            return self.jwt_secret_key
        if self.is_production:
            return ""
        return "dev-insecure-secret-do-not-use-in-production"

    def db_configuration_errors(self) -> List[str]:
        errors: List[str] = []
        if not self.database_url:
            errors.append("DATABASE_URL is not configured.")
        return errors

    def validate(self) -> None:
        """Fail-fast: raises RuntimeError listing all missing critical settings.

        In production every critical setting is mandatory. In development/test
        only the settings actually required by the running services are strict,
        so developers can boot the non-DB parts without violating anything.
        """
        errors: List[str] = []

        if self.is_production:
            if not self.effective_jwt_secret():
                errors.append("JWT_SECRET_KEY must be set (no default allowed in production).")
            if not self.oauth_client_id or not self.oauth_client_secret:
                errors.append("OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must be set.")
            errors.extend(self.db_configuration_errors())

        # Android settings must be provided together (both or neither).
        android_provided = bool(self.android_sa_key_path) or bool(self.android_enterprise_id)
        if android_provided and not (self.android_sa_key_path and self.android_enterprise_id):
            errors.append(
                "ANDROID_SA_KEY_PATH and ANDROID_ENTERPRISE_ID must both be set when Android support is enabled."
            )

        if errors:
            raise RuntimeError("Configuration error: " + "; ".join(errors))


# Load once at import time from environment / .env
settings = Settings()

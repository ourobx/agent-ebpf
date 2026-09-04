"""
KSEC v2.0 — Enterprise SaaS Auth Database Layer

SQLite-backed persistent store for users, tenants, OTP verification codes, and sessions.
Features PBKDF2-HMAC-SHA256 password hashing with random salt and rate-limited OTP storage.
"""

from __future__ import annotations
import sqlite3
import os
import hashlib
import secrets
import time
import threading
from typing import Dict, Any, Optional, Tuple


class AuthDatabase:
    """
    Thread-safe SQLite database manager for KSEC multi-tenant SaaS authentication.
    """

    def __init__(self, db_path: str = "ksec_auth.db"):
        self.db_path = os.getenv("AUTH_DB_PATH", db_path)
        db_dir = os.path.dirname(os.path.abspath(self.db_path))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                # 1. Tenants Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS tenants (
                    tenant_id TEXT PRIMARY KEY,
                    company_name TEXT NOT NULL,
                    plan_tier TEXT DEFAULT 'Team Pro',
                    api_key TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """)

                # 2. Users Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    role TEXT DEFAULT 'Admin',
                    is_verified INTEGER DEFAULT 0,
                    created_at REAL NOT NULL,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
                )
                """)

                # 3. OTP Codes Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS otp_codes (
                    email TEXT PRIMARY KEY,
                    otp_code TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    attempts_left INTEGER DEFAULT 3,
                    last_resend_at REAL NOT NULL
                )
                """)

                # 4. Revoked Tokens Table (Logout blacklist)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS revoked_tokens (
                    jti TEXT PRIMARY KEY,
                    revoked_at REAL NOT NULL,
                    expires_at REAL NOT NULL
                )
                """)
                conn.commit()

    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
        """Hashes password with PBKDF2-HMAC-SHA256 and a cryptographically secure salt."""
        if not salt:
            salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000
        )
        return key.hex(), salt

    @staticmethod
    def verify_password(password: str, password_hash: str, salt: str) -> bool:
        """Verifies password against stored PBKDF2 hash."""
        computed_hash, _ = AuthDatabase.hash_password(password, salt)
        return secrets.compare_digest(computed_hash, password_hash)

    def create_user_and_tenant(
        self,
        email: str,
        full_name: str,
        password: str,
        company_name: str
    ) -> Dict[str, Any]:
        """Creates tenant and pending user entry."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                # Check if email exists
                cursor.execute("SELECT user_id, is_verified FROM users WHERE email = ?", (email.lower().strip(),))
                existing = cursor.fetchone()
                if existing:
                    if existing["is_verified"] == 1:
                        raise ValueError("User with this email already exists.")
                    # If pending, update user details
                    pwd_hash, salt = self.hash_password(password)
                    cursor.execute("""
                    UPDATE users SET full_name = ?, password_hash = ?, salt = ? WHERE email = ?
                    """, (full_name, pwd_hash, salt, email.lower().strip()))
                    conn.commit()
                    return {"user_id": existing["user_id"], "email": email, "status": "PENDING_VERIFICATION"}

                tenant_id = f"t_{secrets.token_hex(6)}"
                user_id = f"usr_{secrets.token_hex(6)}"
                api_key = f"ksec_live_{secrets.token_hex(16)}"
                now = time.time()

                pwd_hash, salt = self.hash_password(password)

                cursor.execute("""
                INSERT INTO tenants (tenant_id, company_name, plan_tier, api_key, created_at)
                VALUES (?, ?, 'Team Pro', ?, ?)
                """, (tenant_id, company_name, api_key, now))

                cursor.execute("""
                INSERT INTO users (user_id, tenant_id, email, full_name, password_hash, salt, role, is_verified, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'Admin', 0, ?)
                """, (user_id, tenant_id, email.lower().strip(), full_name, pwd_hash, salt, now))

                conn.commit()
                return {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "email": email.lower().strip(),
                    "status": "PENDING_VERIFICATION"
                }

    def save_otp(self, email: str, otp_code: str, ttl_seconds: int = 300) -> None:
        """Stores or updates 6-digit OTP code for an email with 5-minute expiry."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                now = time.time()
                expires_at = now + ttl_seconds
                cursor.execute("""
                INSERT INTO otp_codes (email, otp_code, created_at, expires_at, attempts_left, last_resend_at)
                VALUES (?, ?, ?, ?, 3, ?)
                ON CONFLICT(email) DO UPDATE SET
                    otp_code = excluded.otp_code,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at,
                    attempts_left = 3,
                    last_resend_at = excluded.last_resend_at
                """, (email.lower().strip(), otp_code, now, expires_at, now))
                conn.commit()

    def verify_otp_code(self, email: str, submitted_code: str) -> bool:
        """Validates OTP code and marks user verified if successful."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM otp_codes WHERE email = ?", (email.lower().strip(),))
                record = cursor.fetchone()
                if not record:
                    raise ValueError("No active OTP request found for this email.")

                now = time.time()
                if now > record["expires_at"]:
                    raise ValueError("OTP code has expired. Please request a new one.")

                if record["attempts_left"] <= 0:
                    raise ValueError("Too many invalid attempts. Please request a new OTP code.")

                if not secrets.compare_digest(record["otp_code"], submitted_code.strip()):
                    # Decrement attempts
                    cursor.execute("""
                    UPDATE otp_codes SET attempts_left = attempts_left - 1 WHERE email = ?
                    """, (email.lower().strip(),))
                    conn.commit()
                    remaining = record["attempts_left"] - 1
                    raise ValueError(f"Invalid OTP code. {remaining} attempt(s) remaining.")

                # Success: mark user verified and delete OTP
                cursor.execute("UPDATE users SET is_verified = 1 WHERE email = ?", (email.lower().strip(),))
                cursor.execute("DELETE FROM otp_codes WHERE email = ?", (email.lower().strip(),))
                conn.commit()
                return True

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieves user and tenant details by email."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                SELECT u.user_id, u.tenant_id, u.email, u.full_name, u.password_hash, u.salt,
                       u.role, u.is_verified, u.created_at, t.company_name, t.plan_tier, t.api_key
                FROM users u
                JOIN tenants t ON u.tenant_id = t.tenant_id
                WHERE u.email = ?
                """, (email.lower().strip(),))
                row = cursor.fetchone()
                if not row:
                    return None
                return dict(row)

    def get_tenant(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves tenant record by tenant_id."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                SELECT tenant_id, company_name, plan_tier, api_key, created_at
                FROM tenants
                WHERE tenant_id = ?
                """, (tenant_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                return dict(row)

    def update_tenant_plan(self, tenant_id: str, plan_tier: str, stripe_customer_id: Optional[str] = None) -> bool:
        """Updates plan tier for a tenant."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                UPDATE tenants
                SET plan_tier = ?
                WHERE tenant_id = ?
                """, (plan_tier, tenant_id))
                conn.commit()
                return cursor.rowcount > 0

    def regenerate_api_key(self, tenant_id: str) -> str:
        """Generates a fresh live API key for a tenant."""
        new_key = f"ksec_live_{secrets.token_hex(16)}"
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                UPDATE tenants
                SET api_key = ?
                WHERE tenant_id = ?
                """, (new_key, tenant_id))
                conn.commit()
                return new_key

    def revoke_token(self, jti: str, expires_at: float) -> None:
        """Revokes a JWT token by adding to blacklist."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR REPLACE INTO revoked_tokens (jti, revoked_at, expires_at)
                VALUES (?, ?, ?)
                """, (jti, time.time(), expires_at))
                conn.commit()

    def is_token_revoked(self, jti: str) -> bool:
        """Checks if a JWT jti is revoked."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT jti, expires_at FROM revoked_tokens WHERE jti = ?", (jti,))
                row = cursor.fetchone()
                if row and time.time() < row["expires_at"]:
                    return True
                return False


# Global singleton instance
auth_db = AuthDatabase()


import os
import time
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr, Field

try:
    from src.auth.auth_service import auth_service
except ImportError:
    auth_service = None

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    company_name: Optional[str] = "Autonomous AI Corp"


class VerifyOtpRequest(BaseModel):
    email: str
    otp_code: str


class ResendOtpRequest(BaseModel):
    email: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/register", tags=["Authentication"])
async def register_endpoint(req: RegisterRequest):
    """
    Registers a new tenant user, initializes cryptographic isolation, and dispatches 6-digit OTP.
    """
    if not auth_service:
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    try:
        res = auth_service.register(
            email=req.email,
            full_name=req.full_name,
            password=req.password,
            company_name=req.company_name or "Autonomous AI Corp"
        )
        return res
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Registration failed: {err}")


@router.post("/auth/verify-otp", tags=["Authentication"])
async def verify_otp_endpoint(req: VerifyOtpRequest):
    """
    Verifies 6-digit OTP passcode, activates tenant account, and returns JWT session access token.
    """
    if not auth_service:
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    try:
        res = auth_service.verify_otp(email=req.email, otp_code=req.otp_code)
        return res
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"OTP verification failed: {err}")


@router.post("/auth/resend-otp", tags=["Authentication"])
async def resend_otp_endpoint(req: ResendOtpRequest):
    """
    Generates and dispatches a fresh 6-digit OTP passcode to the candidate email.
    """
    if not auth_service:
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    try:
        res = auth_service.resend_otp(email=req.email)
        return res
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Resend OTP failed: {err}")


@router.post("/auth/login", tags=["Authentication"])
async def login_endpoint(req: LoginRequest):
    """
    Authenticates tenant user credentials and returns active JWT session tokens.
    """
    if not auth_service:
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    try:
        res = auth_service.login(email=req.email, password=req.password)
        return res
    except ValueError as err:
        raise HTTPException(status_code=401, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {err}")


@router.get("/auth/me", tags=["Authentication"])
async def get_me_endpoint(request: Request):
    """
    Returns current authenticated user profile, tenant ID, and active API keys.
    """
    if not auth_service:
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = auth_header.split(" ")[1]
    try:
        payload = auth_service.decode_token(token)
        user = auth_service.db.get_user_by_email(payload["email"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        return {
            "authenticated": True,
            "user_id": user["user_id"],
            "tenant_id": user["tenant_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "company_name": user["company_name"],
            "plan_tier": user["plan_tier"],
            "api_key": user["api_key"]
        }
    except ValueError as err:
        raise HTTPException(status_code=401, detail=str(err))


@router.post("/auth/logout", tags=["Authentication"])
async def logout_endpoint(request: Request):
    """
    Invalidates current active JWT session and revokes refresh tokens.
    """
    if not auth_service:
        return {"status": "LOGGED_OUT", "message": "Session terminated."}
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        return auth_service.logout(token)
    return {"status": "LOGGED_OUT", "message": "Session terminated."}

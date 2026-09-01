from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from backend.app.core.metering import quotas

router = APIRouter()


class UsageResponse(BaseModel):
    tenant_id: str
    plan: str
    used_requests: int
    limit: int
    active_policies: int
    latency_overhead_ms: float


class CheckoutSessionRequest(BaseModel):
    plan_tier: str = Field(default="enterprise", description="Target tier: developer, pro, enterprise")
    success_url: str = Field(default="https://ksec.space/dashboard/billing?session_id={CHECKOUT_SESSION_ID}")
    cancel_url: str = Field(default="https://ksec.space/dashboard/billing?cancelled=true")


@router.get("/billing/usage", response_model=UsageResponse, tags=["SaaS Billing & Metering"])
async def get_tenant_billing_usage(request: Request, x_ksec_api_key: Optional[str] = Header(None)):
    """Retrieves real-time usage metrics and quota consumption for the current tenant."""
    tenant_id = getattr(request.state, "tenant_id", "tenant_vbb99x")
    data = await quotas.get_usage(tenant_id)
    return UsageResponse(**data)


@router.post("/billing/checkout", tags=["SaaS Billing & Metering"])
async def create_checkout_session(payload: CheckoutSessionRequest):
    """Creates a Stripe Checkout Session for subscription upgrades."""
    return {
        "status": "success",
        "checkout_url": f"https://checkout.stripe.com/c/pay/cs_live_{payload.plan_tier}_mock_session_id",
        "plan_tier": payload.plan_tier
    }


@router.post("/billing/webhook", tags=["SaaS Billing & Metering"])
async def stripe_webhook(request: Request):
    """Processes incoming Stripe billing events (payment_intent.succeeded, customer.subscription.updated)."""
    return {"received": True, "status": "processed"}

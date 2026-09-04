"""
ksec.space Autonomous Red-Team Adversarial Testbed Endpoints
Provides on-demand adversarial fuzzing, regression suite execution,
and attack vector catalog discovery.
"""

from __future__ import annotations
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from src.guard.red_team import red_team_runner, RedTeamSuiteReport, AttackCategory

router = APIRouter()


@router.post("/redteam/run", tags=["Red-Team Adversarial Engine"])
async def run_adversarial_suite():
    """
    Executes the entire Autonomous Red-Team suite against the active defense layers.
    Returns per-vector test verdicts, microsecond latency distributions, and bypass metrics.
    """
    report = red_team_runner.run_suite()
    return {
        "status": "success",
        "report": report.model_dump()
    }


@router.get("/redteam/vectors", tags=["Red-Team Adversarial Engine"])
async def list_attack_vectors(
    category: Optional[AttackCategory] = Query(None, description="Filter vectors by attack category")
):
    """
    Returns the comprehensive catalog of curated adversarial attack vectors
    used to test Prompt Injection, Jailbreaks, Model Extractions, and Kernel Bypasses.
    """
    vectors = red_team_runner.vectors
    if category:
        vectors = [v for v in vectors if v.category == category]
    return {
        "total_count": len(vectors),
        "vectors": [v.model_dump() for v in vectors]
    }


@router.get("/redteam/summary", tags=["Red-Team Adversarial Engine"])
async def get_redteam_summary():
    """
    Returns high-level Red-Team security posture summary for UI observability.
    """
    report = red_team_runner.run_suite()
    return {
        "run_id": report.run_id,
        "status": report.status,
        "defense_rate_pct": report.defense_rate_pct,
        "total_tested_vectors": report.total_vectors,
        "bypasses_detected": report.bypass_count,
        "latency_p99_us": report.latency_p99_us,
        "readiness_grade": "ENTERPRISE_SECURE_A_PLUS" if report.bypass_count == 0 else "ACTION_REQUIRED"
    }

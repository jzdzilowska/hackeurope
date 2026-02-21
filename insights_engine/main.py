"""
main.py — FastAPI entrypoint for the FinInsights Engine.

Single endpoint:  GET /insights/{org_id}?months=1

Flow:
  1. Run all 7 raw insight queries concurrently (asyncio.to_thread wraps sync supabase-py).
  2. Run the two targeted AI enrichment calls concurrently (duplicates + individual plans).
  3. Feed all enriched data into the master Gemini prioritisation call.
  4. Return the complete, AI-ranked insight report as JSON.

Run locally:
  uvicorn insights_engine.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

from .config import SUPABASE_URL, SUPABASE_KEY
from .queries import (
    query_saas_seat_waste,
    query_price_creep,
    query_ad_efficiency,
    query_duplicate_services,
    query_individual_vs_enterprise,
    query_free_trial_trap,
    query_runway_stress_test,
)
from .ai_analyzer import (
    identify_duplicate_services,
    analyze_individual_plans,
    prioritize_all_insights,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(
    title="FinInsights Engine",
    description="AI-powered financial health insights for founders.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # TODO: restrict to your frontend origin before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Dependency — Supabase client
# ─────────────────────────────────────────────────────────────────────────────

def _get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.",
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ─────────────────────────────────────────────────────────────────────────────
# Main insights endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/insights/{org_id}",
    summary="Run all 7 financial insight modules for an organisation",
    response_description="AI-prioritised insight report with recommended actions",
)
async def get_insights(
    org_id: str,
    months: int = Query(
        default=1,
        ge=1,
        le=12,
        description=(
            "Date range in calendar months. "
            "1 = current calendar month only (default). "
            "3 = rolling 3-month window. "
            "Exposed to the UI so users can adjust the analysis window."
        ),
    ),
) -> dict[str, Any]:
    """
    Orchestrates the full insight pipeline:

    - Stage 1  (parallel): Run all 7 raw data queries against Supabase.
    - Stage 2  (parallel): Enrich duplicate-services and individual-plan data with Gemini.
    - Stage 3  (serial):   Master Gemini prioritisation call over all enriched data.
    """
    client = _get_client()

    # ── Validate org exists ───────────────────────────────────────────────────
    try:
        org_resp = client.table("organisations").select("team_size").eq("id", org_id).single().execute()
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Organisation '{org_id}' not found: {exc}") from exc

    if not org_resp.data:
        raise HTTPException(status_code=404, detail=f"Organisation '{org_id}' not found.")

    team_size: int | None = org_resp.data.get("team_size")

    # ── Stage 1: Run all 7 queries concurrently ───────────────────────────────
    log.info("[%s] Running 7 insight queries (months=%d)…", org_id, months)

    (
        saas_waste,
        price_creep,
        ad_efficiency,
        dup_services,
        ind_vs_ent,
        free_trial,
        runway,
    ) = await asyncio.gather(
        asyncio.to_thread(query_saas_seat_waste,          client, org_id, months),
        asyncio.to_thread(query_price_creep,              client, org_id, months),
        asyncio.to_thread(query_ad_efficiency,            client, org_id, months),
        asyncio.to_thread(query_duplicate_services,       client, org_id, months),
        asyncio.to_thread(query_individual_vs_enterprise, client, org_id, months),
        asyncio.to_thread(query_free_trial_trap,          client, org_id, months),
        asyncio.to_thread(query_runway_stress_test,       client, org_id, months),
    )

    log.info("[%s] Stage 1 complete. Running AI enrichment…", org_id)

    # ── Stage 2: AI enrichment for data-heavy modules ────────────────────────
    # Run the two targeted enrichment calls concurrently.
    ai_duplicates_task = asyncio.to_thread(
        identify_duplicate_services,
        dup_services.get("merchants_in_window", []),
        dup_services.get("raw_transactions", []),
    )
    ai_ind_plans_task = asyncio.to_thread(
        analyze_individual_plans,
        ind_vs_ent.get("suspicious_patterns", []),
        team_size,
    )

    ai_duplicates, ai_ind_plans = await asyncio.gather(
        ai_duplicates_task,
        ai_ind_plans_task,
    )

    # Attach AI findings back to the raw dicts
    dup_services["ai_identified_duplicates"] = ai_duplicates
    ind_vs_ent["ai_analysis"]                = ai_ind_plans

    log.info("[%s] Stage 2 complete. Running master AI prioritisation…", org_id)

    # ── Stage 3: Master AI prioritisation ────────────────────────────────────
    all_insights = [
        saas_waste,
        price_creep,
        ad_efficiency,
        dup_services,
        ind_vs_ent,
        free_trial,
        runway,
    ]

    prioritised = await asyncio.to_thread(
        prioritize_all_insights,
        all_insights,
        org_id,
        team_size,
    )

    log.info("[%s] Pipeline complete. Returning %d insights.", org_id, len(prioritised.get("insights", [])))

    return {
        "org_id":             org_id,
        "generated_at":       datetime.now(timezone.utc).isoformat(),
        "date_range_months":  months,
        **prioritised,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "FinInsights Engine", "model": "gemini-2.0-flash"}

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
    query_invoice_obligations,
)
from .health_queries import (
    query_financial_health,
    query_forecast_data,
    query_purchase_context,
)
from .ai_analyzer import (
    identify_duplicate_services,
    analyze_individual_plans,
    prioritize_all_insights,
    analyze_financial_health,
    generate_benchmark_forecast,
    synthesize_executive_briefing,
    evaluate_purchase,
)
from .models import PurchaseAdvisorRequest

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
# ai_insights cache helpers
# ─────────────────────────────────────────────────────────────────────────────

_HEALTH_CACHE_TYPE     = "financial_health_report"
_HEALTH_CACHE_TTL_HRS  = 6


def _get_health_cache(client: Client, user_id: str) -> dict | None:
    """
    Check the ai_insights table for a valid (non-expired) cached financial health report.
    Returns the cached data dict, or None if no valid cache entry exists.
    """
    resp = (
        client.table("ai_insights")
        .select("data, valid_until")
        .eq("user_id", user_id)
        .eq("type", _HEALTH_CACHE_TYPE)
        .gt("valid_until", datetime.now(timezone.utc).isoformat())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]["data"]
    return None


def _set_health_cache(client: Client, user_id: str, data: dict) -> None:
    """
    Store a financial health report in ai_insights with a TTL.
    Deletes any existing entries for this user+type before inserting.
    """
    from datetime import timedelta
    valid_until = (
        datetime.now(timezone.utc) + timedelta(hours=_HEALTH_CACHE_TTL_HRS)
    ).isoformat()
    # Clean up old entries, then insert fresh
    client.table("ai_insights").delete() \
        .eq("user_id", user_id) \
        .eq("type", _HEALTH_CACHE_TYPE) \
        .execute()
    client.table("ai_insights").insert({
        "user_id":     user_id,
        "type":        _HEALTH_CACHE_TYPE,
        "data":        data,
        "valid_until": valid_until,
    }).execute()


# ─────────────────────────────────────────────────────────────────────────────
# Main insights endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/insights/{user_id}",
    summary="Run all 7 financial insight modules for a user",
    response_description="AI-prioritised insight report with recommended actions",
)
async def get_insights(
    user_id: str,
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
    team_size: int | None = Query(
        default=None,
        ge=1,
        description=(
            "Number of employees. Used for SaaS Seat Waste analysis. "
            "Pass this from your onboarding / profile data."
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

    # ── Validate user exists via profiles table ───────────────────────────────
    try:
        profile_resp = (
            client.table("profiles")
            .select("display_name, company_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found: {exc}") from exc

    if not profile_resp.data:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    # ── Stage 1: Run all 7 queries concurrently ───────────────────────────────
    log.info("[%s] Running insight queries (months=%d)…", user_id, months)

    (
        saas_waste,
        price_creep,
        ad_efficiency,
        dup_services,
        ind_vs_ent,
        free_trial,
        runway,
        invoices_data,
    ) = await asyncio.gather(
        asyncio.to_thread(query_saas_seat_waste,          client, user_id, months, team_size),
        asyncio.to_thread(query_price_creep,              client, user_id, months),
        asyncio.to_thread(query_ad_efficiency,            client, user_id, months),
        asyncio.to_thread(query_duplicate_services,       client, user_id, months),
        asyncio.to_thread(query_individual_vs_enterprise, client, user_id, months),
        asyncio.to_thread(query_free_trial_trap,          client, user_id, months),
        asyncio.to_thread(query_runway_stress_test,       client, user_id, months),
        asyncio.to_thread(query_invoice_obligations,      client, user_id),
    )

    log.info("[%s] Stage 1 complete. Running AI enrichment…", user_id)

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

    log.info("[%s] Stage 2 complete. Running master AI prioritisation…", user_id)

    # ── Stage 3: Master AI prioritisation ────────────────────────────────────
    all_insights = [
        saas_waste,
        price_creep,
        ad_efficiency,
        dup_services,
        ind_vs_ent,
        free_trial,
        runway,
        invoices_data,
    ]

    prioritised = await asyncio.to_thread(
        prioritize_all_insights,
        all_insights,
        user_id,
        team_size,
    )

    # ── Stage 3b: Executive synthesis ────────────────────────────────────────
    # health_raw/forecast for synthesis — fetch in parallel with prioritisation
    # then run all three master AI calls in parallel (3, 4, 5 are independent).
    health_raw_lite, forecast_raw_lite = await asyncio.gather(
        asyncio.to_thread(query_financial_health, client, user_id, 1),
        asyncio.to_thread(query_forecast_data,    client, user_id),
    )
    ai_health_lite, ai_forecast_lite = await asyncio.gather(
        asyncio.to_thread(analyze_financial_health,    health_raw_lite,   {}),
        asyncio.to_thread(generate_benchmark_forecast, forecast_raw_lite, {}),
    )
    briefing = await asyncio.to_thread(
        synthesize_executive_briefing, prioritised, ai_health_lite, ai_forecast_lite
    )

    log.info("[%s] Pipeline complete. Returning %d insights.", user_id, len(prioritised.get("insights", [])))

    return {
        "user_id":            user_id,
        "generated_at":       datetime.now(timezone.utc).isoformat(),
        "date_range_months":  months,
        "executive_briefing": briefing,
        **prioritised,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Financial Health Report endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/financial-health/{user_id}",
    summary="Full financial health report with AI forecasting and benchmarking",
    response_description="Health score, P&L, cost structure, forecast, and investment insights",
)
async def get_financial_health(
    user_id: str,
    months: int = Query(
        default=1, ge=1, le=12,
        description="Cost analysis window in calendar months (UI-selectable, default=1).",
    ),
    industry: str | None = Query(
        default=None,
        description="Business industry for benchmark context, e.g. 'SaaS', 'Retail', 'Agency'.",
    ),
    location: str | None = Query(
        default=None,
        description="City or country for regional benchmark context, e.g. 'London', 'Berlin'.",
    ),
    team_size: int | None = Query(default=None, ge=1),
    refresh: bool = Query(
        default=False,
        description="Force a fresh analysis, bypassing the 6-hour cache.",
    ),
) -> dict[str, Any]:
    """
    Returns a comprehensive financial health report:

    - Net worth, P&L, and fixed/variable/payroll cost breakdown
    - **health_score** (1–100): controllable-elements only — cost structure, profit
      quality, cash efficiency, expense control (distinct from priority_score which
      measures subscription waste)
    - OLS linear regression + AI-benchmarked **predicted_burn_next_month**
    - Seasonal **inventory_alert** and **seasonal_risk**
    - **lazy_cash_alert** and **investment_opportunity** if idle cash is detected
    - Top 3 controllable improvements with estimated financial impact

    Results are cached in the `ai_insights` table for 6 hours.
    Pass `?refresh=true` to force a fresh analysis.
    """
    client = _get_client()

    # ── Validate user ─────────────────────────────────────────────────────────
    try:
        profile_resp = (
            client.table("profiles")
            .select("display_name, company_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.") from exc

    # ── Cache check ───────────────────────────────────────────────────────────
    if not refresh:
        cached = await asyncio.to_thread(_get_health_cache, client, user_id)
        if cached:
            log.info("[%s] Returning cached financial health report.", user_id)
            return {**cached, "cached": True}

    profile          = profile_resp.data or {}
    business_context = {
        "company_name": profile.get("company_name") or profile.get("display_name") or "Unknown",
        "industry":     industry  or "Not specified",
        "location":     location  or "Not specified",
        "team_size":    team_size or "Not specified",
    }

    log.info("[%s] Building financial health report (months=%d)…", user_id, months)

    # ── Stage 1: Parallel raw data queries ────────────────────────────────────
    health_raw, forecast_raw = await asyncio.gather(
        asyncio.to_thread(query_financial_health, client, user_id, months),
        asyncio.to_thread(query_forecast_data,    client, user_id),
    )

    # ── Stage 2: Parallel AI analysis ────────────────────────────────────────
    ai_health, ai_forecast = await asyncio.gather(
        asyncio.to_thread(analyze_financial_health,    health_raw,   business_context),
        asyncio.to_thread(generate_benchmark_forecast, forecast_raw, business_context),
    )

    log.info("[%s] Financial health report built. health_score=%s", user_id, ai_health.get("health_score"))

    # ── Stage 2b: Executive synthesis ────────────────────────────────────────
    # For the health endpoint we don't have the subscription prioritised dict,
    # so pass an empty stub — the synthesis still connects health + forecast.
    briefing = await asyncio.to_thread(
        synthesize_executive_briefing,
        {},          # no subscription data available in this endpoint
        ai_health,
        ai_forecast,
    )

    # ── Merge into final report ───────────────────────────────────────────────
    report: dict[str, Any] = {
        "user_id":          user_id,
        "generated_at":     datetime.now(timezone.utc).isoformat(),
        "cached":           False,
        "business_context": business_context,
        # Scores
        "health_score":     ai_health.get("health_score", 0),
        "score_breakdown":  ai_health.get("score_breakdown", {}),
        # P&L
        "net_worth":                 health_raw["net_worth"],
        "effective_net_worth":       health_raw.get("effective_net_worth", health_raw["net_worth"]),
        "outstanding_invoice_total": health_raw.get("outstanding_invoice_total", 0),
        "overdue_invoice_total":     health_raw.get("overdue_invoice_total", 0),
        "account_breakdown":         health_raw["account_breakdown"],
        "total_expenditure":         health_raw["total_expenditure"],
        "total_income":              health_raw["total_income"],
        "total_profit":              health_raw["total_profit"],
        "profit_margin_pct":         health_raw["profit_margin_pct"],
        # Cost structure
        "cost_breakdown":              health_raw["cost_breakdown"],
        "variable_cost_assessment":    ai_health.get("variable_cost_assessment", ""),
        "payroll_assessment":          ai_health.get("payroll_assessment", ""),
        # Forecast — include both statistical baseline and AI-adjusted figure
        "avg_monthly_burn":            forecast_raw["avg_monthly_burn"],
        "statistical_burn_forecast":   forecast_raw["predicted_expenditure"],
        "statistical_income_forecast": forecast_raw["predicted_income"],
        "predicted_burn_next_month":   ai_forecast.get("predicted_burn_next_month",   forecast_raw["predicted_expenditure"]),
        "predicted_income_next_month": ai_forecast.get("predicted_income_next_month", forecast_raw["predicted_income"]),
        "forecast_confidence":         ai_forecast.get("forecast_confidence", "low"),
        "forecast_reasoning":          ai_forecast.get("forecast_reasoning", ""),
        "historical_months":           forecast_raw["historical_months"],
        # Benchmark
        "benchmark_comparison": ai_forecast.get("benchmark_comparison", {}),
        # Alerts
        "inventory_alert":           ai_forecast.get("inventory_alert"),
        "seasonal_risk":             ai_forecast.get("seasonal_risk"),
        "lazy_cash_estimate":        health_raw["lazy_cash_estimate"],
        "lazy_cash_alert":           ai_health.get("lazy_cash_alert"),
        "invoice_liability_alert":   ai_health.get("invoice_liability_alert"),
        "investment_opportunity":    ai_health.get("investment_opportunity"),
        # Improvements
        "top_3_controllable_improvements": ai_health.get("top_3_controllable_improvements", []),
        # Executive synthesis
        "executive_briefing": briefing,
    }

    # ── Cache and return ──────────────────────────────────────────────────────
    await asyncio.to_thread(_set_health_cache, client, user_id, report)
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Purchase Advisor endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/ask-purchase/{user_id}",
    summary="Green / Yellow / Red purchase advisor",
    response_description="Risk verdict, reasoning, alternatives, and optional investment tip",
)
async def ask_purchase(
    user_id: str,
    body: PurchaseAdvisorRequest,
    industry: str | None = Query(default=None),
) -> dict[str, Any]:
    """
    Evaluates a proposed purchase against the user's live financial position.

    - **GREEN**  → runway stays above 6 months and spend is proportionate.
    - **YELLOW** → runway drops to 4–6 months, or category spend is unusually high.
    - **RED**    → runway falls below 4 months, or category already >30% of burn.

    Also surfaces an `investment_opportunity` if idle cash > 150% of 6-month buffer.

    Stateless — always queries fresh data, no caching.
    """
    client = _get_client()

    # Validate user
    try:
        client.table("profiles").select("id").eq("id", user_id).single().execute()
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.") from exc

    log.info(
        "[%s] Purchase advisor: '%s' @ %s %s",
        user_id, body.item_description, body.price, body.currency,
    )

    # ── Build financial context ───────────────────────────────────────────────
    # Prefer the pre-computed financial_health_report from ai_insights (written
    # by run_ai.py) to avoid re-scanning all transactions on every request.
    # Falls back to a fresh DB query if no cached report exists yet.
    cached_health = await asyncio.to_thread(_get_health_cache, client, user_id)

    if cached_health:
        log.info("[%s] Using cached financial_health_report for purchase context.", user_id)
        _eff_balance = cached_health.get("effective_net_worth", cached_health.get("net_worth", 0))
        financial_context = {
            "current_balance":            _eff_balance,
            "outstanding_invoice_total":  cached_health.get("outstanding_invoice_total", 0),
            "overdue_invoice_total":      cached_health.get("overdue_invoice_total", 0),
            "avg_monthly_burn":           cached_health.get("avg_monthly_burn", 0),
            "current_runway_months": round(
                _eff_balance / cached_health.get("avg_monthly_burn", 1), 1
            ) if cached_health.get("avg_monthly_burn", 0) > 0 else None,
            "cost_breakdown":             cached_health.get("cost_breakdown", {}),
            "health_score":               cached_health.get("health_score"),
            "top_3_improvements":         cached_health.get("top_3_controllable_improvements", []),
        }
    else:
        log.info("[%s] No cache found — querying fresh purchase context.", user_id)
        financial_context = await asyncio.to_thread(query_purchase_context, client, user_id)
        # Promote effective_balance → current_balance so the runway calc below and
        # the Gemini prompt always see cash-minus-invoice-liabilities, not raw cash.
        if "effective_balance" in financial_context:
            financial_context["current_balance"] = financial_context["effective_balance"]

    # Pre-calculate runway after purchase so Gemini has it as a hard number
    if financial_context.get("avg_monthly_burn", 0) > 0:
        runway_after = round(
            (financial_context["current_balance"] - body.price)
            / financial_context["avg_monthly_burn"],
            1,
        )
    else:
        runway_after = None

    financial_context["proposed_purchase"] = {
        "item":                  body.item_description,
        "price":                 body.price,
        "currency":              body.currency,
        "runway_after_purchase": runway_after,
    }
    if industry:
        financial_context["industry"] = industry

    # Gemini evaluation
    ai_result = await asyncio.to_thread(
        evaluate_purchase,
        body.item_description,
        body.price,
        financial_context,
        body.currency,
    )

    return {
        "user_id":               user_id,
        "evaluated_at":          datetime.now(timezone.utc).isoformat(),
        "item_description":      body.item_description,
        "price":                 body.price,
        "currency":              body.currency,
        "current_balance":       financial_context["current_balance"],
        "current_runway_months": financial_context["current_runway_months"],
        "avg_monthly_burn":      financial_context["avg_monthly_burn"],
        **ai_result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "FinInsights Engine", "model": "gemini-2.0-flash"}

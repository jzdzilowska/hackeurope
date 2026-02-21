"""
run_ai.py — Batch insight runner.

Processes every user in the profiles table, runs the full pipeline
(7 insight queries + health queries + Gemini AI calls), and writes
two records per user into the ai_insights Supabase table:

  type = "subscription_insights"   — ranked 7-module waste report
  type = "financial_health_report" — P&L, health score, forecast, alerts

Usage:
  # AI disabled (DB queries + OLS only, no Gemini calls):
  python run_ai.py

  # AI enabled (requires GEMINI_API_KEY in .env):
  AI_ENABLED=true python run_ai.py

  # Single user:
  AI_ENABLED=true python run_ai.py --user c5cbf7bd-2801-407e-9efe-222d8e93fddc
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from supabase import create_client

from insights_engine.queries import (
    query_saas_seat_waste,
    query_price_creep,
    query_ad_efficiency,
    query_duplicate_services,
    query_individual_vs_enterprise,
    query_free_trial_trap,
    query_runway_stress_test,
)
from insights_engine.health_queries import query_financial_health, query_forecast_data
from insights_engine.ai_analyzer import (
    identify_duplicate_services,
    analyze_individual_plans,
    prioritize_all_insights,
    analyze_financial_health,
    generate_benchmark_forecast,
    AI_ENABLED,
)

VALID_HOURS = 6   # how long each record stays fresh


def _upsert(client, user_id: str, record_type: str, data: dict) -> None:
    """Delete the old record for this user+type, then insert a fresh one."""
    valid_until = (datetime.now(timezone.utc) + timedelta(hours=VALID_HOURS)).isoformat()
    client.table("ai_insights").delete() \
        .eq("user_id", user_id).eq("type", record_type).execute()
    client.table("ai_insights").insert({
        "user_id":     user_id,
        "type":        record_type,
        "data":        data,
        "valid_until": valid_until,
    }).execute()


def run_user(client, user_id: str, profile: dict) -> None:
    print(f"\n{'='*64}")
    print(f"User: {user_id}  ({profile.get('company_name') or profile.get('display_name', 'Unknown')})")
    print(f"{'='*64}")

    business_context = {
        "company_name": profile.get("company_name") or profile.get("display_name") or "Unknown",
        "industry":     profile.get("industry") or "Not specified",
        "location":     profile.get("location") or "Not specified",
        "team_size":    profile.get("team_size") or "Not specified",
    }
    team_size = profile.get("team_size")

    # ── Stage 1: 7 live insight queries ──────────────────────────────────────
    print("  [1/5] Running 7 insight queries...")
    saas_waste  = query_saas_seat_waste(client, user_id, months=1, team_size=team_size)
    price_creep = query_price_creep(client, user_id, months=1)
    ad_eff      = query_ad_efficiency(client, user_id, months=1)
    dup_svc     = query_duplicate_services(client, user_id, months=1)
    ind_ent     = query_individual_vs_enterprise(client, user_id, months=1)
    free_trial  = query_free_trial_trap(client, user_id, months=1)
    runway      = query_runway_stress_test(client, user_id, months=1)
    print(f"        runway={runway.get('stressed_runway_months')} months  burn=${runway.get('avg_monthly_burn', 0):,.2f}/mo")

    # ── Stage 2: Health + forecast queries ───────────────────────────────────
    print("  [2/5] Running health & forecast queries...")
    health_raw   = query_financial_health(client, user_id, months=1)
    forecast_raw = query_forecast_data(client, user_id)
    print(f"        net_worth=${health_raw['net_worth']:,.2f}  profit=${health_raw['total_profit']:,.2f}")
    print(f"        avg_burn=${forecast_raw['avg_monthly_burn']:,.2f}  predicted=${forecast_raw['predicted_expenditure']:,.2f}")

    # ── Stage 3: AI enrichment for duplicate/individual modules ──────────────
    print(f"  [3/5] AI enrichment (AI_ENABLED={AI_ENABLED})...")
    ai_dups      = identify_duplicate_services(dup_svc.get("merchants_in_window", []), dup_svc.get("raw_transactions", []))
    ai_ind_plans = analyze_individual_plans(ind_ent.get("suspicious_patterns", []), team_size)
    dup_svc["ai_identified_duplicates"] = ai_dups
    ind_ent["ai_analysis"]              = ai_ind_plans

    # ── Stage 4: Master prioritisation ───────────────────────────────────────
    print("  [4/5] AI prioritisation + health scoring...")
    all_7 = [saas_waste, price_creep, ad_eff, dup_svc, ind_ent, free_trial, runway]
    prioritised = prioritize_all_insights(all_7, user_id, team_size=team_size)
    ai_health   = analyze_financial_health(health_raw, business_context)
    ai_forecast = generate_benchmark_forecast(forecast_raw, business_context)
    print(f"        priority_score={prioritised.get('priority_score')}  health_score={ai_health.get('health_score')}")
    print(f"        forecast_confidence={ai_forecast.get('forecast_confidence')}")

    # ── Stage 5: Write to Supabase ────────────────────────────────────────────
    print("  [5/5] Writing to ai_insights table...")

    subscription_record = {
        "generated_at":                  datetime.now(timezone.utc).isoformat(),
        "business_context":              business_context,
        "priority_score":                prioritised.get("priority_score"),
        "summary":                       prioritised.get("summary"),
        "total_estimated_monthly_savings": prioritised.get("total_estimated_monthly_savings"),
        "total_estimated_annual_savings":  prioritised.get("total_estimated_annual_savings"),
        "insights":                      prioritised.get("insights", []),
        # Raw module results attached for frontend drill-down
        "raw": {
            "saas_seat_waste":          saas_waste,
            "price_creep":              price_creep,
            "ad_efficiency":            ad_eff,
            "duplicate_services":       dup_svc,
            "individual_vs_enterprise": ind_ent,
            "free_trial_trap":          free_trial,
            "runway_stress_test":       runway,
        },
    }

    health_record = {
        "generated_at":      datetime.now(timezone.utc).isoformat(),
        "business_context":  business_context,
        # Scores
        "health_score":      ai_health.get("health_score", 0),
        "score_breakdown":   ai_health.get("score_breakdown", {}),
        # P&L
        "net_worth":           health_raw["net_worth"],
        "account_breakdown":   health_raw["account_breakdown"],
        "total_expenditure":   health_raw["total_expenditure"],
        "total_income":        health_raw["total_income"],
        "total_profit":        health_raw["total_profit"],
        "profit_margin_pct":   health_raw["profit_margin_pct"],
        # Cost structure
        "cost_breakdown":              health_raw["cost_breakdown"],
        "variable_cost_assessment":    ai_health.get("variable_cost_assessment", ""),
        "payroll_assessment":          ai_health.get("payroll_assessment", ""),
        # Forecast
        "avg_monthly_burn":            forecast_raw["avg_monthly_burn"],
        "statistical_burn_forecast":   forecast_raw["predicted_expenditure"],
        "statistical_income_forecast": forecast_raw["predicted_income"],
        "predicted_burn_next_month":   ai_forecast.get("predicted_burn_next_month", forecast_raw["predicted_expenditure"]),
        "predicted_income_next_month": ai_forecast.get("predicted_income_next_month", forecast_raw["predicted_income"]),
        "forecast_confidence":         ai_forecast.get("forecast_confidence", "low"),
        "forecast_reasoning":          ai_forecast.get("forecast_reasoning", ""),
        "historical_months":           forecast_raw["historical_months"],
        "category_forecasts":          forecast_raw["category_forecasts"],
        # Benchmark
        "benchmark_comparison": ai_forecast.get("benchmark_comparison", {}),
        # Alerts
        "inventory_alert":       ai_forecast.get("inventory_alert"),
        "seasonal_risk":         ai_forecast.get("seasonal_risk"),
        "lazy_cash_estimate":    health_raw["lazy_cash_estimate"],
        "lazy_cash_alert":       ai_health.get("lazy_cash_alert"),
        "investment_opportunity": ai_health.get("investment_opportunity"),
        # Improvements
        "top_3_controllable_improvements": ai_health.get("top_3_controllable_improvements", []),
    }

    _upsert(client, user_id, "subscription_insights",  subscription_record)
    _upsert(client, user_id, "financial_health_report", health_record)

    print(f"  ✅ Written subscription_insights + financial_health_report for {user_id}")


def main():
    parser = argparse.ArgumentParser(description="Run AI insight pipeline and write to Supabase.")
    parser.add_argument("--user", metavar="USER_ID", help="Process a single user ID only.")
    args = parser.parse_args()

    client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

    if args.user:
        resp = client.table("profiles").select("*").eq("id", args.user).single().execute()
        users = [resp.data] if resp.data else []
    else:
        resp = client.table("profiles").select("*").execute()
        users = resp.data or []

    if not users:
        print("No users found.")
        sys.exit(0)

    print(f"Processing {len(users)} user(s)  |  AI_ENABLED={AI_ENABLED}")

    for profile in users:
        user_id = profile["id"]
        try:
            run_user(client, user_id, profile)
        except Exception as exc:
            print(f"  ❌ ERROR for {user_id}: {exc}")

    print(f"\n✅ Done. {len(users)} user(s) processed.")


if __name__ == "__main__":
    main()

"""
One-shot AI enrichment: calls all 3 Gemini functions and prints the merged report.
"""
import sys, os, json
sys.path.insert(0, "/Users/Radek/Documents/GitHub/hackeurope")
from dotenv import load_dotenv
load_dotenv("/Users/Radek/Documents/GitHub/hackeurope/.env")

from supabase import create_client
from insights_engine.health_queries import query_financial_health, query_forecast_data
from insights_engine.ai_analyzer import (
    prioritize_all_insights,
    analyze_financial_health,
    generate_benchmark_forecast,
)

client  = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
USER_ID = "c5cbf7bd-2801-407e-9efe-222d8e93fddc"

business_context = {
    "company_name": "Test SME",
    "industry":     "SME / General Business",
    "location":     "Boston, MA",
    "team_size":    8,
}

# ── Pre-computed 7-insight results ───────────────────────────────────────────
all_7 = [
    {"insight_type": "saas_seat_waste", "team_size": 8, "flagged_merchants": []},
    {"insight_type": "price_creep", "flagged_merchants": []},
    {"insight_type": "ad_efficiency", "this_month_ad_spend": 0.0,
     "last_month_ad_spend": 0.0, "this_month_income": 4.22,
     "last_month_income": 4.22, "flagged": False},
    {"insight_type": "duplicate_services", "window_days": 30,
     "merchants_in_window": ["FUN","KFC","McDonald's","Starbucks","Uber","United Airlines"],
     "raw_transactions": []},
    {"insight_type": "individual_vs_enterprise", "suspicious_patterns": [],
     "month_start": "2026-02-01"},
    {"insight_type": "free_trial_trap", "traps_found": []},
    {"insight_type": "runway_stress_test",
     "current_balance": 214535.80,
     "top_3_income_sources": [{"merchant": "INTRST PYMNT", "three_month_total": 16.88}],
     "top_3_income_total": 16.88,
     "avg_monthly_burn": 22213.67,
     "stressed_balance": 214518.92,
     "stressed_runway_months": 9.7},
]

print("Fetching live DB data...")
health_raw   = query_financial_health(client, USER_ID, months=1)
forecast_raw = query_forecast_data(client, USER_ID)
print(f"  ✅ net_worth=${health_raw['net_worth']:,.2f}  profit=${health_raw['total_profit']:,.2f}")
print(f"  ✅ avg_burn=${forecast_raw['avg_monthly_burn']:,.2f}  predicted=${forecast_raw['predicted_expenditure']:,.2f}\n")

print("[1/3] Gemini: financial health score...")
ai_health = analyze_financial_health(health_raw, business_context)
print(f"  ✅ health_score={ai_health.get('health_score')}\n")

print("[2/3] Gemini: benchmark forecast...")
ai_forecast = generate_benchmark_forecast(forecast_raw, business_context)
print(f"  ✅ predicted_burn=${ai_forecast.get('predicted_burn_next_month'):,}  confidence={ai_forecast.get('forecast_confidence')}\n")

print("[3/3] Gemini: master prioritisation...")
prioritised = prioritize_all_insights(all_7, USER_ID, team_size=8)
print(f"  ✅ priority_score={prioritised.get('priority_score')}  insights={len(prioritised.get('insights', []))}\n")

# ── Merge everything ──────────────────────────────────────────────────────────
report = {
    "user_id":                   USER_ID,
    "business_context":          business_context,
    # subscription insights
    "priority_score":            prioritised.get("priority_score"),
    "insights_summary":          prioritised.get("summary"),
    "total_monthly_savings":     prioritised.get("total_estimated_monthly_savings"),
    "subscription_insights":     prioritised.get("insights", []),
    # financial health
    "health_score":              ai_health.get("health_score"),
    "score_breakdown":           ai_health.get("score_breakdown"),
    "net_worth":                 health_raw["net_worth"],
    "total_expenditure":         health_raw["total_expenditure"],
    "total_income":              health_raw["total_income"],
    "total_profit":              health_raw["total_profit"],
    "profit_margin_pct":         health_raw["profit_margin_pct"],
    "cost_breakdown": {
        "fixed_amount":    health_raw["cost_breakdown"]["fixed"]["amount"],
        "variable_amount": health_raw["cost_breakdown"]["variable"]["amount"],
        "payroll_amount":  health_raw["cost_breakdown"]["payroll"]["amount"],
    },
    "lazy_cash_alert":           ai_health.get("lazy_cash_alert"),
    "investment_opportunity":    ai_health.get("investment_opportunity"),
    "top_3_improvements":        ai_health.get("top_3_controllable_improvements"),
    "variable_cost_assessment":  ai_health.get("variable_cost_assessment"),
    # forecast
    "avg_monthly_burn":          forecast_raw["avg_monthly_burn"],
    "stat_burn_forecast":        forecast_raw["predicted_expenditure"],
    "ai_burn_forecast":          ai_forecast.get("predicted_burn_next_month"),
    "forecast_confidence":       ai_forecast.get("forecast_confidence"),
    "forecast_reasoning":        ai_forecast.get("forecast_reasoning"),
    "seasonal_risk":             ai_forecast.get("seasonal_risk"),
    "inventory_alert":           ai_forecast.get("inventory_alert"),
    "benchmark_comparison":      ai_forecast.get("benchmark_comparison"),
}

print("=" * 64)
print("FINAL MERGED AI REPORT")
print("=" * 64)
print(json.dumps(report, indent=2, default=str))

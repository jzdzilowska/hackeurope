"""
health_queries.py — Predictive financial health, forecasting, and purchase context queries.

Companion to queries.py for the HELM Predictive & General Health module:

  query_financial_health()  → net worth, P&L, fixed / variable / payroll cost split
  query_forecast_data()     → 3-month historical series + OLS linear regression forecasts
  query_purchase_context()  → lightweight financial snapshot for /ask-purchase

Plaid amount convention (confirmed): positive = expense, negative = income.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

import numpy as np
from dateutil.relativedelta import relativedelta
from supabase import Client

from .config import PLAID_CATEGORY_INCOME, ACCOUNTS_TABLE, BALANCE_COLUMN

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Plaid PFC category classification maps (confirmed category_primary values)
# ─────────────────────────────────────────────────────────────────────────────

# Hard-coded overhead — classified as Fixed regardless of anything else
FIXED_PRIMARY: frozenset[str] = frozenset({
    "RENT_AND_UTILITIES",   # rent, electricity, gas, internet, water
    "LOAN_PAYMENTS",        # debt service, mortgages, hire-purchase
})

# Discretionary / usage-driven spend — classified as Variable
VARIABLE_PRIMARY: frozenset[str] = frozenset({
    "GENERAL_MERCHANDISE",  # inventory, office supplies, equipment purchases
    "TRAVEL",               # flights, hotels, car hire
    "FOOD_AND_DRINK",       # team meals, client entertainment, coffee
    "ENTERTAINMENT",        # events, team perks, subscriptions
    "PERSONAL_CARE",
    "HOME_IMPROVEMENT",
    "TRANSPORTATION",       # taxis, fuel, commuting
})

# Text signals (ai_category, name, or merchant_name) indicating payroll outflows
PAYROLL_SIGNALS: frozenset[str] = frozenset({
    "payroll", "salary", "salaries", "wages", "wage", "compensation",
    "paychex", "adp", "gusto", "rippling", "deel", "remote.com",
})

# Text signals indicating advertising spend within GENERAL_SERVICES
AD_SIGNALS: frozenset[str] = frozenset({
    "advertising", "ad spend", "ads", "marketing",
    "google ads", "meta ads", "facebook ads", "tiktok ads",
    "linkedin ads", "twitter ads", "snapchat ads", "bing ads",
})


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _month_start(months_back: int = 0) -> date:
    """Return the first day of the calendar month, offset backwards by months_back."""
    return date.today().replace(day=1) - relativedelta(months=months_back)


def _classify_transaction(txn: dict) -> str:
    """
    Classify a single expense transaction as 'fixed', 'variable', 'payroll', or 'other'.

    Priority order:
      1. Payroll signal in ai_category / name / merchant_name
      2. category_primary exact match (FIXED_PRIMARY / VARIABLE_PRIMARY)
      3. GENERAL_SERVICES: advertising signal → variable, otherwise → fixed
      4. TRANSFER_OUT with payroll signal → payroll, otherwise → other
    """
    cat_primary  = (txn.get("category_primary")  or "").upper().strip()
    cat_detailed = (txn.get("category_detailed") or "").upper().strip()
    ai_cat       = (txn.get("ai_category")       or "").lower().strip()
    name         = (txn.get("name")              or "").lower().strip()
    merchant     = (txn.get("merchant_name")     or "").lower().strip()
    combined     = f"{ai_cat} {name} {merchant}"

    # Payroll takes priority over all other classification
    if any(sig in combined for sig in PAYROLL_SIGNALS):
        return "payroll"

    if cat_primary in FIXED_PRIMARY:
        return "fixed"

    if cat_primary in VARIABLE_PRIMARY:
        return "variable"

    if cat_primary == "GENERAL_SERVICES":
        if any(sig in combined for sig in AD_SIGNALS):
            return "variable"
        if "SUBSCRIPTION" in cat_detailed or "INSURANCE" in cat_detailed:
            return "fixed"
        return "fixed"   # default: unknown services treated as fixed overhead

    if cat_primary == "TRANSFER_OUT":
        if any(sig in combined for sig in PAYROLL_SIGNALS):
            return "payroll"
        return "other"

    return "other"


def _linear_forecast(series: list[float]) -> float:
    """
    Project the next value using simple OLS (ordinary least squares) linear regression.
    Returns the mean if fewer than 2 data points are available.
    Always returns a non-negative value (costs can't be negative).
    """
    n = len(series)
    if n < 2:
        return float(series[0]) if series else 0.0
    x = np.arange(n, dtype=float)
    y = np.array(series, dtype=float)
    m, b = np.polyfit(x, y, 1)
    return max(0.0, float(m * n + b))    # index n = next month


# ─────────────────────────────────────────────────────────────────────────────
# 1. Financial Health
# ─────────────────────────────────────────────────────────────────────────────

def query_financial_health(
    client: Client, user_id: str, months: int = 1
) -> dict[str, Any]:
    """
    Calculate net worth, P&L, and fixed/variable/payroll cost breakdown.

    `months` controls the analysis window:
      - 1  → current calendar month only (default, UI-selectable)
      - 3  → rolling 3-calendar-month window
    """
    period_start = _month_start(months_back=months - 1)
    tomorrow     = date.today() + timedelta(days=1)

    # ── Net worth — sum balance_current across all accounts ──────────────────
    accounts_resp = (
        client.table(ACCOUNTS_TABLE)
        .select(f"{BALANCE_COLUMN}, type, subtype, name")
        .eq("user_id", user_id)
        .execute()
    )
    accounts  = accounts_resp.data or []
    net_worth = sum(float(a.get(BALANCE_COLUMN) or 0) for a in accounts)

    account_breakdown = [
        {
            "name":    a.get("name"),
            "type":    a.get("type"),
            "subtype": a.get("subtype"),
            "balance": round(float(a.get(BALANCE_COLUMN) or 0), 2),
        }
        for a in accounts
    ]

    # ── Transactions for the analysis period ─────────────────────────────────
    resp = (
        client.table("transactions")
        .select(
            "amount, category_primary, category_detailed, "
            "ai_category, name, merchant_name"
        )
        .eq("user_id", user_id)
        .gte("date", period_start.isoformat())
        .lt("date", tomorrow.isoformat())
        .execute()
    )
    txns = resp.data or []

    # ── P&L ──────────────────────────────────────────────────────────────────
    # Plaid: positive amount = money out (expense), negative = money in (income)
    expenditure = sum(float(t["amount"]) for t in txns if float(t["amount"]) > 0)
    income      = sum(abs(float(t["amount"])) for t in txns if float(t["amount"]) < 0)
    profit      = income - expenditure

    # ── Fixed / Variable / Payroll split ─────────────────────────────────────
    buckets:      dict[str, float] = defaultdict(float)
    bucket_items: dict[str, list]  = defaultdict(list)

    for txn in txns:
        amt = float(txn["amount"])
        if amt <= 0:
            continue                                     # skip income rows
        label = _classify_transaction(txn)
        buckets[label]      += amt
        bucket_items[label].append({
            "merchant": txn.get("merchant_name") or txn.get("name"),
            "amount":   round(amt, 2),
        })

    fixed_total    = buckets["fixed"]
    variable_total = buckets["variable"]
    payroll_total  = buckets["payroll"]
    other_total    = buckets["other"]

    def _pct(part: float) -> float:
        return round(part / expenditure * 100, 1) if expenditure > 0 else 0.0

    # ── Idle / lazy cash ─────────────────────────────────────────────────────
    # Lazy cash = cash beyond 1.5× the 6-month expense buffer
    # Uses current-month spend as a proxy (3-month burn is in query_forecast_data)
    six_month_buffer = expenditure * 6

    # ── Outstanding invoice obligations (populated by Gmail invoice agent) ────
    # These are future cash outflows not yet in Plaid — they reduce real runway.
    inv_resp = (
        client.table("invoices")
        .select("amount, due_date, status")
        .eq("user_id", user_id)
        .neq("status", "paid")
        .execute()
    )
    inv_data  = inv_resp.data or []
    inv_today = date.today()
    outstanding_invoice_total = sum(float(i.get("amount") or 0) for i in inv_data)
    overdue_invoice_total = sum(
        float(i.get("amount") or 0)
        for i in inv_data
        if i.get("due_date") and date.fromisoformat(i["due_date"]) < inv_today
    )
    # Effective net worth = balance minus all outstanding unpaid invoice liabilities
    effective_net_worth = net_worth - outstanding_invoice_total
    # Lazy cash recalculated against effective position so invoices reduce free cash
    lazy_cash = max(0.0, effective_net_worth - six_month_buffer * 1.5)

    return {
        "insight_type":              "financial_health",
        "period_start":              period_start.isoformat(),
        "net_worth":                 round(net_worth, 2),
        "effective_net_worth":       round(effective_net_worth, 2),
        "outstanding_invoice_total": round(outstanding_invoice_total, 2),
        "overdue_invoice_total":     round(overdue_invoice_total, 2),
        "account_breakdown":         account_breakdown,
        "total_expenditure":         round(expenditure, 2),
        "total_income":              round(income, 2),
        "total_profit":              round(profit, 2),
        "profit_margin_pct":         round((profit / income * 100) if income > 0 else 0.0, 1),
        "cost_breakdown": {
            "fixed":    {"amount": round(fixed_total, 2),    "pct": _pct(fixed_total),    "items": bucket_items["fixed"]},
            "variable": {"amount": round(variable_total, 2), "pct": _pct(variable_total), "items": bucket_items["variable"]},
            "payroll":  {"amount": round(payroll_total, 2),  "pct": _pct(payroll_total),  "items": bucket_items["payroll"]},
            "other":    {"amount": round(other_total, 2),    "pct": _pct(other_total)},
        },
        "lazy_cash_estimate":        round(lazy_cash, 2),
        "six_month_buffer_needed":   round(six_month_buffer, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Forecast Data + Linear Regression
# ─────────────────────────────────────────────────────────────────────────────

def query_forecast_data(client: Client, user_id: str) -> dict[str, Any]:
    """
    Fetch monthly P&L + category spend for the last 3 complete calendar months,
    then run OLS linear regression to forecast next month's burn and income.

    Returns both the raw series and the forecast — the Gemini layer then validates
    these figures against industry benchmarks and seasonal patterns.
    """
    monthly: list[dict] = []

    for i in range(3, 0, -1):       # iterate oldest → most recent: 3mo, 2mo, 1mo ago
        start = _month_start(months_back=i)
        end   = _month_start(months_back=i - 1)

        resp = (
            client.table("transactions")
            .select(
                "amount, category_primary, category_detailed, "
                "ai_category, name, merchant_name"
            )
            .eq("user_id", user_id)
            .gte("date", start.isoformat())
            .lt("date", end.isoformat())
            .execute()
        )
        txns = resp.data or []

        expenditure = sum(float(t["amount"]) for t in txns if float(t["amount"]) > 0)
        income      = sum(abs(float(t["amount"])) for t in txns if float(t["amount"]) < 0)

        # Category spend breakdown — gives Gemini context for benchmark comparison
        cat_spend: dict[str, float] = defaultdict(float)
        for t in txns:
            if float(t["amount"]) > 0:
                cat = t.get("category_primary") or "UNKNOWN"
                cat_spend[cat] += float(t["amount"])

        monthly.append({
            "month":          start.strftime("%Y-%m"),
            "expenditure":    round(expenditure, 2),
            "income":         round(income, 2),
            "profit":         round(income - expenditure, 2),
            "category_spend": {k: round(v, 2) for k, v in cat_spend.items()},
        })

    # ── OLS linear regression ─────────────────────────────────────────────────
    exp_series = [m["expenditure"] for m in monthly]
    inc_series = [m["income"]      for m in monthly]

    predicted_exp = _linear_forecast(exp_series)
    predicted_inc = _linear_forecast(inc_series)

    # Per-category forecast (gives inventory/seasonal alerts more context)
    all_cats: set[str] = set()
    for m in monthly:
        all_cats.update(m["category_spend"].keys())

    category_forecasts: dict[str, dict] = {
        cat: {
            "series":               [m["category_spend"].get(cat, 0.0) for m in monthly],
            "predicted_next_month": round(
                _linear_forecast([m["category_spend"].get(cat, 0.0) for m in monthly]), 2
            ),
        }
        for cat in all_cats
    }

    avg_burn = sum(exp_series) / len(exp_series) if exp_series else 0.0

    return {
        "insight_type":          "forecast",
        "historical_months":     monthly,
        "avg_monthly_burn":      round(avg_burn, 2),
        "predicted_expenditure": round(predicted_exp, 2),
        "predicted_income":      round(predicted_inc, 2),
        "predicted_profit":      round(predicted_inc - predicted_exp, 2),
        "category_forecasts":    category_forecasts,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Purchase Context (lightweight snapshot for /ask-purchase)
# ─────────────────────────────────────────────────────────────────────────────

def query_purchase_context(client: Client, user_id: str) -> dict[str, Any]:
    """
    Return a lightweight financial snapshot for the purchase advisor endpoint.
    Avoids re-running the full health pipeline for a single ad-hoc question.

    Includes: current balance, 3-month avg burn, runway, per-category monthly avg spend,
    and lazy-cash estimate (for the investment opportunity suggestion).
    """
    # Current balance
    accounts_resp = (
        client.table(ACCOUNTS_TABLE)
        .select(BALANCE_COLUMN)
        .eq("user_id", user_id)
        .execute()
    )
    current_balance = sum(
        float(a.get(BALANCE_COLUMN) or 0) for a in (accounts_resp.data or [])
    )

    # Last 3 months of expenses
    three_months_ago = _month_start(months_back=3)
    resp = (
        client.table("transactions")
        .select("amount, category_primary")
        .eq("user_id", user_id)
        .gte("date", three_months_ago.isoformat())
        .gt("amount", 0)      # expenses only
        .execute()
    )
    txns = resp.data or []

    total_3mo_expense = sum(float(t["amount"]) for t in txns)
    avg_monthly_burn  = total_3mo_expense / 3 if total_3mo_expense > 0 else 0.0
    current_runway    = (
        round(current_balance / avg_monthly_burn, 1)
        if avg_monthly_burn > 0 else None
    )

    # Monthly average spend per category (gives Gemini context on category saturation)
    cat_spend_3mo: dict[str, float] = defaultdict(float)
    for t in txns:
        cat = t.get("category_primary") or "UNKNOWN"
        cat_spend_3mo[cat] += float(t["amount"])

    six_month_buffer = avg_monthly_burn * 6

    # ── Outstanding invoice obligations ───────────────────────────────────────
    inv_resp = (
        client.table("invoices")
        .select("amount, due_date, status, vendor")
        .eq("user_id", user_id)
        .neq("status", "paid")
        .execute()
    )
    inv_data  = inv_resp.data or []
    inv_today = date.today()
    outstanding_invoice_total = sum(float(i.get("amount") or 0) for i in inv_data)
    overdue_invoice_total = sum(
        float(i.get("amount") or 0)
        for i in inv_data
        if i.get("due_date") and date.fromisoformat(i["due_date"]) < inv_today
    )
    # Purchase decisions should use effective balance (cash minus known liabilities)
    effective_balance = current_balance - outstanding_invoice_total
    lazy_cash = max(0.0, effective_balance - six_month_buffer * 1.5)

    return {
        "current_balance":              round(current_balance, 2),
        "effective_balance":            round(effective_balance, 2),
        "outstanding_invoice_total":    round(outstanding_invoice_total, 2),
        "overdue_invoice_total":        round(overdue_invoice_total, 2),
        "avg_monthly_burn":             round(avg_monthly_burn, 2),
        "current_runway_months":        current_runway,
        "six_month_buffer":             round(six_month_buffer, 2),
        "lazy_cash_estimate":           round(lazy_cash, 2),
        # Monthly averages per category — divide by 3 for monthly view
        "category_monthly_avg_spend": {
            k: round(v / 3, 2) for k, v in cat_spend_3mo.items()
        },
    }

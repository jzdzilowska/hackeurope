"""
queries.py — Raw data extraction for all 7 financial insight modules.

All functions are *synchronous* (supabase-py uses a sync HTTP client).
They are wrapped with asyncio.to_thread() in main.py for concurrent execution.

Schema assumptions (update once the database team confirms):
  transactions(id, org_id, amount, date, merchant_name, plaid_category, recurring_id)
  organisations(id, team_size)

TODO items are marked inline — most relate to unconfirmed Plaid schema details.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta
from supabase import Client

from .config import KNOWN_SEAT_PRICES, PLAID_CATEGORY_SOFTWARE, PLAID_CATEGORY_ADVERTISING, PLAID_CATEGORY_INCOME, EXPENSES_ARE_POSITIVE, ACCOUNTS_TABLE, BALANCE_COLUMN

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _calendar_month_start(months_back: int = 0) -> date:
    """Return the first day of the calendar month, offset by *months_back*."""
    today = date.today()
    return (today.replace(day=1) - relativedelta(months=months_back))


def _is_expense(amount: float) -> bool:
    """
    Return True if this transaction is an expense (money leaving the org).

    TODO: Update once the database team confirms whether Plaid stores expenses
    as positive or negative numbers, or uses a separate transaction_type column.
    Current assumption: EXPENSES_ARE_POSITIVE = True (standard Plaid behaviour).
    """
    if EXPENSES_ARE_POSITIVE:
        return amount > 0
    return amount < 0


def _is_income(amount: float) -> bool:
    """
    TODO: Mirror of _is_expense — confirm sign convention with database team.
    """
    return not _is_expense(amount)


def _abs_amount(amount: float) -> float:
    """Always return the absolute spending value regardless of sign convention."""
    return abs(amount)


# ─────────────────────────────────────────────────────────────────────────────
# 1. SaaS Seat Waste
# ─────────────────────────────────────────────────────────────────────────────

def query_saas_seat_waste(client: Client, org_id: str, months: int = 1) -> dict[str, Any]:
    """
    Find Software-category merchants where (amount / known_seat_price) implies
    more seats than the organisation's team_size.

    Returns the list of flagged merchants with estimated monthly waste.
    """
    # Fetch team size
    org_resp = (
        client.table("organisations")
        .select("team_size")
        .eq("id", org_id)
        .single()
        .execute()
    )
    team_size: int = (org_resp.data or {}).get("team_size") or 1

    month_start = _calendar_month_start(months_back=0)

    txn_resp = (
        client.table("transactions")
        .select("merchant_name, amount, date")
        .eq("org_id", org_id)
        .ilike("plaid_category", PLAID_CATEGORY_SOFTWARE)
        # TODO: If Plaid uses a hierarchical category list (e.g. JSON array), switch to
        # a containedBy / overlap filter once confirmed.
        .gte("date", month_start.isoformat())
        .execute()
    )

    # Keep only the most-recent transaction per merchant (latest recurring charge)
    latest: dict[str, dict] = {}
    for txn in (txn_resp.data or []):
        key = txn["merchant_name"].lower().strip()
        if key not in latest or txn["date"] > latest[key]["date"]:
            latest[key] = {**txn, "_key": key}

    flagged = []
    for key, txn in latest.items():
        seat_price = next(
            (price for label, price in KNOWN_SEAT_PRICES.items()
             if label in key and price is not None),
            None,
        )
        if seat_price and seat_price > 0:
            amount = _abs_amount(txn["amount"])
            implied_seats = amount / seat_price
            if implied_seats > team_size:
                flagged.append(
                    {
                        "merchant": txn["merchant_name"],
                        "amount": amount,
                        "seat_price": seat_price,
                        "implied_seats": round(implied_seats, 1),
                        "team_size": team_size,
                        "wasted_seats": round(implied_seats - team_size, 1),
                        "estimated_monthly_waste": round(
                            (implied_seats - team_size) * seat_price, 2
                        ),
                    }
                )

    return {
        "insight_type": "saas_seat_waste",
        "team_size": team_size,
        "flagged_merchants": flagged,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Price Creep
# ─────────────────────────────────────────────────────────────────────────────

def query_price_creep(client: Client, org_id: str, months: int = 1) -> dict[str, Any]:
    """
    For recurring transactions, flag any merchant whose latest charge is more
    than 10 % above the average of the previous 3 calendar months.

    Relies on recurring_id being populated by Plaid.
    TODO: If recurring_id is sparsely populated, add a fallback that groups by
    (merchant_name, approximate_amount) to infer recurrence.
    """
    three_months_ago = _calendar_month_start(months_back=3)

    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date, recurring_id")
        .eq("org_id", org_id)
        .not_.is_("recurring_id", "null")
        # TODO: confirm Supabase / PostgREST null filter syntax for your version
        .gte("date", three_months_ago.isoformat())
        .execute()
    )

    merchant_txns: dict[str, list] = defaultdict(list)
    for txn in (resp.data or []):
        merchant_txns[txn["merchant_name"]].append(txn)

    flagged = []
    for merchant, txns in merchant_txns.items():
        if len(txns) < 2:
            continue
        sorted_txns = sorted(txns, key=lambda t: t["date"])
        latest = sorted_txns[-1]
        historical = sorted_txns[:-1]

        avg_amount = sum(_abs_amount(t["amount"]) for t in historical) / len(historical)
        latest_amount = _abs_amount(latest["amount"])

        if avg_amount > 0:
            pct_change = (latest_amount - avg_amount) / avg_amount
            if pct_change > 0.10:
                flagged.append(
                    {
                        "merchant": merchant,
                        "latest_amount": latest_amount,
                        "three_month_avg": round(avg_amount, 2),
                        "pct_increase": round(pct_change * 100, 1),
                        "latest_date": latest["date"],
                        "extra_cost_per_month": round(latest_amount - avg_amount, 2),
                        "projected_annual_extra": round(
                            (latest_amount - avg_amount) * 12, 2
                        ),
                    }
                )

    return {"insight_type": "price_creep", "flagged_merchants": flagged}


# ─────────────────────────────────────────────────────────────────────────────
# 3. Ad Efficiency Anomaly
# ─────────────────────────────────────────────────────────────────────────────

def query_ad_efficiency(client: Client, org_id: str, months: int = 1) -> dict[str, Any]:
    """
    Flag if this calendar month's advertising spend is >20 % higher than last
    month's without a corresponding increase in income.

    TODO: PLAID_CATEGORY_INCOME may need to be updated — Plaid uses category
    strings like "Transfer In", "Payroll", or "Interest Earned" for credits.
    Confirm with the database team which plaid_category values represent revenue.

    TODO: Confirm amount sign convention (EXPENSES_ARE_POSITIVE flag in config.py).
    """
    this_month = _calendar_month_start(0)
    last_month = _calendar_month_start(1)

    def _sum_category(category_pattern: str, start: date, end: date) -> float:
        r = (
            client.table("transactions")
            .select("amount")
            .eq("org_id", org_id)
            .ilike("plaid_category", category_pattern)
            .gte("date", start.isoformat())
            .lt("date", end.isoformat())
            .execute()
        )
        return sum(_abs_amount(t["amount"]) for t in (r.data or []))

    # Advertising spend
    this_ad  = _sum_category(PLAID_CATEGORY_ADVERTISING, this_month, date.today() + timedelta(days=1))
    last_ad  = _sum_category(PLAID_CATEGORY_ADVERTISING, last_month, this_month)

    # Income / revenue
    # TODO: Replace PLAID_CATEGORY_INCOME with the correct Plaid category(ies)
    this_inc = _sum_category(PLAID_CATEGORY_INCOME, this_month, date.today() + timedelta(days=1))
    last_inc = _sum_category(PLAID_CATEGORY_INCOME, last_month, this_month)

    result: dict[str, Any] = {
        "insight_type": "ad_efficiency",
        "this_month_ad_spend": round(this_ad, 2),
        "last_month_ad_spend": round(last_ad, 2),
        "this_month_income":   round(this_inc, 2),
        "last_month_income":   round(last_inc, 2),
        "flagged": False,
    }

    if last_ad > 0:
        ad_pct   = (this_ad  - last_ad)  / last_ad
        inc_pct  = (this_inc - last_inc) / last_inc if last_inc > 0 else 0.0

        result["ad_spend_pct_change"] = round(ad_pct * 100, 1)
        result["income_pct_change"]   = round(inc_pct * 100, 1)

        # Flag: ad spend jumped >20 % while income grew <5 %
        if ad_pct > 0.20 and inc_pct < 0.05:
            result["flagged"] = True
            result["estimated_wasted_spend"] = round(this_ad - last_ad, 2)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 4. Duplicate Services  (raw data — AI does the semantic matching)
# ─────────────────────────────────────────────────────────────────────────────

def query_duplicate_services(client: Client, org_id: str, months: int = 1) -> dict[str, Any]:
    """
    Collect all distinct merchants paid in the last 30 days and pass the full
    list to Gemini, which will semantically identify overlapping/competing tools.

    No hard-coded competitor pairs here — the AI decides based on its up-to-date
    knowledge of the SaaS landscape.
    """
    window_start = date.today() - timedelta(days=30)

    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date, plaid_category")
        .eq("org_id", org_id)
        .gte("date", window_start.isoformat())
        .execute()
    )

    transactions = resp.data or []
    merchants = sorted(set(t["merchant_name"] for t in transactions))

    return {
        "insight_type": "duplicate_services",
        "window_days": 30,
        "merchants_in_window": merchants,
        # Pass full transaction list so the AI has amounts / categories as context
        "raw_transactions": transactions,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Individual vs. Enterprise Plan  (raw data — AI decides thresholds)
# ─────────────────────────────────────────────────────────────────────────────

def query_individual_vs_enterprise(
    client: Client, org_id: str, months: int = 1
) -> dict[str, Any]:
    """
    Find patterns where the same merchant is charged multiple times at the same
    small amount within the same calendar month — a signal that employees are
    expensing individual accounts instead of a shared team plan.

    The AI layer decides whether each pattern is genuinely suspicious and
    estimates potential savings — no hard-coded price thresholds here.
    """
    month_start = _calendar_month_start(0)

    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date")
        .eq("org_id", org_id)
        .gte("date", month_start.isoformat())
        .execute()
    )

    # Group by (merchant, rounded_amount) to surface same-price repeats
    groups: dict[tuple, list] = defaultdict(list)
    for txn in (resp.data or []):
        key = (txn["merchant_name"], round(float(txn["amount"]), 2))
        groups[key].append(txn)

    suspicious = []
    for (merchant, amount), txns in groups.items():
        if len(txns) > 1:
            suspicious.append(
                {
                    "merchant": merchant,
                    "amount_per_transaction": amount,
                    "transaction_count": len(txns),
                    "total_monthly_spend": round(amount * len(txns), 2),
                    "transactions": txns,
                }
            )

    return {
        "insight_type": "individual_vs_enterprise",
        # Full list passed to AI — no filtering here, let AI decide what's suspicious
        "suspicious_patterns": suspicious,
        "month_start": month_start.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Free Trial Trap
# ─────────────────────────────────────────────────────────────────────────────

def query_free_trial_trap(client: Client, org_id: str, months: int = 1) -> dict[str, Any]:
    """
    Detect a €0.00 transaction from a merchant followed by a full-price charge
    exactly 7, 14, or 30 days later — classic free-trial-to-paid conversion.

    TODO: Plaid may surface trial authorisations as:
      - amount = 0.00 (most common)
      - a 'pending' flag on the transaction (check if Plaid includes a `pending`
        boolean column in your schema — this is common in Plaid's transaction objects)
      - a separate transaction_type = 'authorization'
    Add a .eq("pending", True) filter (or equivalent) once confirmed.

    We look back 60 days to catch the €0 event and any follow-up within 30 days.
    """
    lookback_start = date.today() - timedelta(days=60)

    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date")
        # TODO: add .eq("pending", True) or equivalent once Plaid schema confirmed
        .eq("org_id", org_id)
        .gte("date", lookback_start.isoformat())
        .execute()
    )

    transactions = resp.data or []

    # TODO: If a `pending` or `status` column exists, filter zero-amount rows by
    # that column rather than purely by amount == 0, to avoid false positives from
    # legitimate refunds or balance checks.
    zero_txns = [t for t in transactions if float(t["amount"]) == 0.0]
    paid_txns = [t for t in transactions if float(t["amount"]) > 0.0]

    traps: list[dict] = []
    for z in zero_txns:
        z_date = date.fromisoformat(z["date"])
        for p in paid_txns:
            if p["merchant_name"] != z["merchant_name"]:
                continue
            p_date = date.fromisoformat(p["date"])
            days_diff = (p_date - z_date).days
            if days_diff in (7, 14, 30):
                traps.append(
                    {
                        "merchant":         z["merchant_name"],
                        "trial_date":       z["date"],
                        "charge_date":      p["date"],
                        "charge_amount":    _abs_amount(p["amount"]),
                        "days_until_charge": days_diff,
                    }
                )

    return {"insight_type": "free_trial_trap", "traps_found": traps}


# ─────────────────────────────────────────────────────────────────────────────
# 7. Runway Stress Test
# ─────────────────────────────────────────────────────────────────────────────

def query_runway_stress_test(client: Client, org_id: str, months: int = 1) -> dict[str, Any]:
    """
    Simulate losing the top 3 income sources and calculate how many months of
    runway remain at the current 3-month average burn rate.

    Formula:
        stressed_runway = (current_balance - top_3_income_total) / avg_monthly_burn

    TODO: Populate current_balance once the accounts table schema is confirmed.
    Expected: accounts(id, org_id, balance, currency, updated_at)
    """
    three_months_ago = _calendar_month_start(3)

    # ── Current balance ───────────────────────────────────────────────────────
    # TODO: uncomment and adjust once accounts table is confirmed
    # accounts_resp = (
    #     client.table(ACCOUNTS_TABLE)
    #     .select(BALANCE_COLUMN)
    #     .eq("org_id", org_id)
    #     .execute()
    # )
    # current_balance = sum(
    #     float(a[BALANCE_COLUMN]) for a in (accounts_resp.data or [])
    # )
    current_balance = None  # TODO: replace with real query above

    # ── Last 3 months of transactions ─────────────────────────────────────────
    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date, plaid_category")
        .eq("org_id", org_id)
        .gte("date", three_months_ago.isoformat())
        .execute()
    )
    transactions = resp.data or []

    # TODO: Update income / expense split once sign convention is confirmed.
    # Current approach: treat PLAID_CATEGORY_INCOME as income, everything else as expense.
    income_txns  = [t for t in transactions if PLAID_CATEGORY_INCOME.strip("%").lower() in (t.get("plaid_category") or "").lower()]
    expense_txns = [t for t in transactions if t not in income_txns]

    # Top 3 income sources (by total over 3 months)
    income_by_merchant: dict[str, float] = defaultdict(float)
    for txn in income_txns:
        income_by_merchant[txn["merchant_name"]] += _abs_amount(txn["amount"])

    top_3 = sorted(income_by_merchant.items(), key=lambda x: x[1], reverse=True)[:3]
    top_3_total = sum(v for _, v in top_3)

    # Average monthly burn
    total_expenses   = sum(_abs_amount(t["amount"]) for t in expense_txns)
    avg_monthly_burn = total_expenses / 3 if total_expenses > 0 else 0.0

    # Stress calculation — only possible once balance is available
    stressed_balance = (current_balance - top_3_total) if current_balance is not None else None
    stressed_runway  = (
        round(stressed_balance / avg_monthly_burn, 1)
        if stressed_balance is not None and avg_monthly_burn > 0
        else None
    )

    return {
        "insight_type":           "runway_stress_test",
        "current_balance":        current_balance,  # TODO: awaiting accounts table
        "top_3_income_sources":   [{"merchant": m, "three_month_total": round(v, 2)} for m, v in top_3],
        "top_3_income_total":     round(top_3_total, 2),
        "avg_monthly_burn":       round(avg_monthly_burn, 2),
        "stressed_balance":       round(stressed_balance, 2) if stressed_balance is not None else None,
        "stressed_runway_months": stressed_runway,
    }

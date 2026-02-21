"""
queries.py — Raw data extraction for all 7 financial insight modules.

All functions are *synchronous* (supabase-py uses a sync HTTP client).
They are wrapped with asyncio.to_thread() in main.py for concurrent execution.

Confirmed schema (from supabase/schema.sql):
  transactions(id, user_id, account_id, plaid_transaction_id, plaid_account_id,
               amount, date, authorized_date, name, merchant_name, merchant_entity_id,
               original_description, pending, pending_transaction_id,
               category_primary, category_detailed, category_confidence, ai_category,
               payment_channel, iso_currency_code, logo_url, website, ...)
  accounts(id, user_id, plaid_account_id, ..., balance_available, balance_current, ...)
  profiles(id, display_name, company_name, ...)

Amount sign: POSITIVE = money out (expense), NEGATIVE = money in (income)  ← Plaid convention
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta
from supabase import Client

from .config import (
    KNOWN_SEAT_PRICES,
    PLAID_CATEGORY_ADVERTISING, PLAID_AI_CATEGORY_ADVERTISING,
    PLAID_CATEGORY_INCOME,
    EXPENSES_ARE_POSITIVE,
    ACCOUNTS_TABLE, BALANCE_COLUMN,
)

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
    Confirmed: Plaid stores expenses as POSITIVE amounts (positive = money out).
    """
    if EXPENSES_ARE_POSITIVE:
        return amount > 0
    return amount < 0


def _is_income(amount: float) -> bool:
    """
    Return True if this transaction is income (money into the org).
    Confirmed: Plaid stores income/credits as NEGATIVE amounts (negative = money in).
    """
    return not _is_expense(amount)


def _abs_amount(amount: float) -> float:
    """Always return the absolute spending value regardless of sign convention."""
    return abs(amount)


def _merchant(txn: dict) -> str:
    """Return the best available merchant label: merchant_name → name → 'Unknown'."""
    return (txn.get("merchant_name") or txn.get("name") or "Unknown").strip()


# ─────────────────────────────────────────────────────────────────────────────
# 1. SaaS Seat Waste
# ─────────────────────────────────────────────────────────────────────────────

def query_saas_seat_waste(
    client: Client, user_id: str, months: int = 1, team_size: int | None = None
) -> dict[str, Any]:
    """
    Find Software-category merchants where (amount / known_seat_price) implies
    more seats than the organisation's team_size.

    team_size is passed in from the API layer (set during onboarding / UI).
    Falls back to 1 if unknown, which flags any multi-seat subscription charge.
    """
    effective_team_size: int = team_size or 1
    month_start = _calendar_month_start(months_back=0)

    # Query all current-month expenses. KNOWN_SEAT_PRICES merchant-name matching
    # is the real filter, so we cast a wide net rather than relying on category.
    txn_resp = (
        client.table("transactions")
        .select("merchant_name, amount, date, category_primary")
        .eq("user_id", user_id)
        .gte("date", month_start.isoformat())
        .gt("amount", 0)          # expenses only (Plaid: positive = money out)
        .execute()
    )

    # Keep only the most-recent transaction per merchant (latest recurring charge)
    latest: dict[str, dict] = {}
    for txn in (txn_resp.data or []):
        label = _merchant(txn)
        if not label or label == "Unknown":
            continue
        key = label.lower().strip()
        if key not in latest or txn["date"] > latest[key]["date"]:
            latest[key] = {**txn, "_key": key, "_merchant_label": label}

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
            if implied_seats > effective_team_size:
                flagged.append(
                    {
                        "merchant": txn.get("_merchant_label", key),
                        "amount": amount,
                        "seat_price": seat_price,
                        "implied_seats": round(implied_seats, 1),
                        "team_size": effective_team_size,
                        "wasted_seats": round(implied_seats - effective_team_size, 1),
                        "estimated_monthly_waste": round(
                            (implied_seats - effective_team_size) * seat_price, 2
                        ),
                    }
                )

    return {
        "insight_type": "saas_seat_waste",
        "team_size": effective_team_size,
        "flagged_merchants": flagged,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Price Creep
# ─────────────────────────────────────────────────────────────────────────────

def query_price_creep(client: Client, user_id: str, months: int = 1) -> dict[str, Any]:
    """
    Flag merchants whose latest charge is more than 10 % above the 3-month average.

    The schema has no recurring_id column, so recurrence is inferred: a merchant
    is treated as recurring if it appears in at least 2 of the last 3 calendar months.
    """
    three_months_ago = _calendar_month_start(months_back=3)

    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date")
        .eq("user_id", user_id)
        .gte("date", three_months_ago.isoformat())
        .gt("amount", 0)          # expenses only (Plaid: positive = money out)
        .execute()
    )

    # Group transactions and track which calendar months each merchant appears in
    merchant_txns: dict[str, list] = defaultdict(list)
    merchant_months: dict[str, set] = defaultdict(set)
    for txn in (resp.data or []):
        m = _merchant(txn)
        if m == "Unknown":
            continue
        merchant_txns[m].append(txn)
        merchant_months[m].add(txn["date"][:7])   # "YYYY-MM"

    flagged = []
    for merchant, txns in merchant_txns.items():
        # Only analyse merchants appearing in ≥2 distinct months (recurring signal)
        if len(merchant_months[merchant]) < 2:
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

def query_ad_efficiency(client: Client, user_id: str, months: int = 1) -> dict[str, Any]:
    """
    Flag if this calendar month's advertising spend is >20 % higher than last
    month's without a corresponding increase in income.

    Advertising is detected via:
      1. ai_category ILIKE '%advertising%' (primary — WS3 AI pipeline)
      2. Merchant name pattern matching as fallback (when ai_category is null)
    Income uses category_primary = 'INCOME' (confirmed Plaid PFC value).
    Amount sign: positive = money out (expense), negative = money in (income).
    """
    this_month = _calendar_month_start(0)
    last_month = _calendar_month_start(1)
    tomorrow   = date.today() + timedelta(days=1)

    _AD_MERCHANTS = {
        "google ads", "facebook ads", "meta ads", "tiktok ads",
        "linkedin ads", "twitter ads", "instagram ads", "snapchat ads",
        "bing ads", "youtube ads", "amazon advertising", "pinterest ads",
    }

    def _sum_ad_spend(start: date, end: date) -> float:
        """Fetch GENERAL_SERVICES transactions and filter by ai_category / merchant name."""
        r = (
            client.table("transactions")
            .select("amount, merchant_name, ai_category")
            .eq("user_id", user_id)
            .eq("category_primary", PLAID_CATEGORY_ADVERTISING)
            .gte("date", start.isoformat())
            .lt("date", end.isoformat())
            .execute()
        )
        total = 0.0
        for t in (r.data or []):
            ai_cat   = (t.get("ai_category")   or "").lower()
            merchant = (t.get("merchant_name") or "").lower()
            if (
                "advertising" in ai_cat or "marketing" in ai_cat
                or any(p in merchant for p in _AD_MERCHANTS)
            ):
                total += _abs_amount(t["amount"])
        return total

    def _sum_income(start: date, end: date) -> float:
        """Sum income using confirmed Plaid PFC INCOME category. Amounts are negative."""
        r = (
            client.table("transactions")
            .select("amount")
            .eq("user_id", user_id)
            .eq("category_primary", PLAID_CATEGORY_INCOME)
            .gte("date", start.isoformat())
            .lt("date", end.isoformat())
            .execute()
        )
        return sum(_abs_amount(t["amount"]) for t in (r.data or []))

    this_ad  = _sum_ad_spend(this_month, tomorrow)
    last_ad  = _sum_ad_spend(last_month, this_month)
    this_inc = _sum_income(this_month, tomorrow)
    last_inc = _sum_income(last_month, this_month)

    result: dict[str, Any] = {
        "insight_type": "ad_efficiency",
        "this_month_ad_spend": round(this_ad, 2),
        "last_month_ad_spend": round(last_ad, 2),
        "this_month_income":   round(this_inc, 2),
        "last_month_income":   round(last_inc, 2),
        "flagged": False,
    }

    if last_ad > 0:
        ad_pct  = (this_ad  - last_ad)  / last_ad
        inc_pct = (this_inc - last_inc) / last_inc if last_inc > 0 else 0.0

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

def query_duplicate_services(client: Client, user_id: str, months: int = 1) -> dict[str, Any]:
    """
    Collect all distinct merchants paid in the last 30 days and pass the full
    list to Gemini, which will semantically identify overlapping/competing tools.

    No hard-coded competitor pairs here — the AI decides based on its up-to-date
    knowledge of the SaaS landscape.
    """
    window_start = date.today() - timedelta(days=30)

    resp = (
        client.table("transactions")
        .select("merchant_name, amount, date, category_primary, category_detailed, ai_category")
        .eq("user_id", user_id)
        .gte("date", window_start.isoformat())
        .gt("amount", 0)           # expenses only
        .execute()
    )

    transactions = resp.data or []
    merchants = sorted(set(
        _merchant(t) for t in transactions if _merchant(t) != "Unknown"
    ))

    return {
        "insight_type": "duplicate_services",
        "window_days": 30,
        "merchants_in_window": merchants,
        "raw_transactions": transactions,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Individual vs. Enterprise Plan  (raw data — AI decides thresholds)
# ─────────────────────────────────────────────────────────────────────────────

def query_individual_vs_enterprise(
    client: Client, user_id: str, months: int = 1
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
        .select("merchant_name, amount, date, category_primary")
        .eq("user_id", user_id)
        .gte("date", month_start.isoformat())
        .gt("amount", 0)          # expenses only (Plaid: positive = money out)
        .execute()
    )

    # Group by (merchant, rounded_amount) to surface same-price repeats
    groups: dict[tuple, list] = defaultdict(list)
    for txn in (resp.data or []):
        m = _merchant(txn)
        if m == "Unknown":
            continue
        key = (m, round(float(txn["amount"]), 2))
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
        "suspicious_patterns": suspicious,
        "month_start": month_start.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Free Trial Trap
# ─────────────────────────────────────────────────────────────────────────────

def query_free_trial_trap(client: Client, user_id: str, months: int = 1) -> dict[str, Any]:
    """
    Detect a $0.00 / pending transaction from a merchant followed by a full-price
    charge exactly 7, 14, or 30 days later — classic free-trial-to-paid conversion.

    Uses the confirmed `pending boolean` column (schema: `pending boolean default false`).
    Plaid sets pending=True for authorisation holds, which includes $0 trial charges.
    We also capture completed $0 transactions to cover all Plaid implementation variants.
    """
    lookback_start = date.today() - timedelta(days=60)

    resp = (
        client.table("transactions")
        .select("merchant_name, name, amount, date, pending, authorized_date")
        .eq("user_id", user_id)
        .gte("date", lookback_start.isoformat())
        .execute()
    )

    transactions = resp.data or []

    # Trial signals: pending $0 authorisations OR completed $0 transactions
    zero_txns = [
        t for t in transactions
        if float(t["amount"]) == 0.0 and t.get("merchant_name")
    ]
    # Confirmed paid charges: not pending, positive amount
    paid_txns = [
        t for t in transactions
        if not t.get("pending") and float(t["amount"]) > 0.0 and t.get("merchant_name")
    ]

    traps: list[dict] = []
    seen: set[tuple] = set()   # deduplicate (merchant, charge_date) pairs
    for z in zero_txns:
        z_date    = date.fromisoformat(z["date"])
        z_merch   = _merchant(z)
        for p in paid_txns:
            if _merchant(p) != z_merch:
                continue
            p_date = date.fromisoformat(p["date"])
            days_diff = (p_date - z_date).days
            if days_diff in (7, 14, 30):
                key = (z_merch, p["date"])
                if key in seen:
                    continue
                seen.add(key)
                traps.append(
                    {
                        "merchant":          z_merch,
                        "trial_date":        z["date"],
                        "charge_date":       p["date"],
                        "charge_amount":     _abs_amount(p["amount"]),
                        "days_until_charge": days_diff,
                    }
                )

    return {"insight_type": "free_trial_trap", "traps_found": traps}


# ─────────────────────────────────────────────────────────────────────────────
# 7. Runway Stress Test
# ─────────────────────────────────────────────────────────────────────────────

def query_runway_stress_test(client: Client, user_id: str, months: int = 1) -> dict[str, Any]:
    """
    Simulate losing the top 3 income sources and calculate how many months of
    runway remain at the current 3-month average burn rate.

    Formula:
        stressed_runway = (current_balance - top_3_income_total) / avg_monthly_burn

    Balance: sum of accounts.balance_current for the user (confirmed schema).
    Income:  category_primary = 'INCOME' (confirmed Plaid PFC value; amounts are negative).
    Expenses: all positive-amount transactions (Plaid: positive = money out).
    """
    three_months_ago = _calendar_month_start(3)

    # ── Current balance — sum balance_current across all user accounts ────────
    accounts_resp = (
        client.table(ACCOUNTS_TABLE)
        .select(BALANCE_COLUMN)
        .eq("user_id", user_id)
        .execute()
    )
    current_balance: float | None = None
    if accounts_resp.data:
        current_balance = sum(
            float(a[BALANCE_COLUMN] or 0) for a in accounts_resp.data
        )

    # ── Last 3 months of transactions ─────────────────────────────────────────
    resp = (
        client.table("transactions")
        .select("merchant_name, name, amount, date, category_primary")
        .eq("user_id", user_id)
        .gte("date", three_months_ago.isoformat())
        .execute()
    )
    transactions = resp.data or []

    # Income: category_primary = 'INCOME' (amounts are NEGATIVE in Plaid)
    income_txns  = [
        t for t in transactions
        if (t.get("category_primary") or "") == PLAID_CATEGORY_INCOME
    ]
    # Expenses: all positive-amount transactions (Plaid: positive = money out)
    expense_txns = [t for t in transactions if float(t["amount"]) > 0]

    # Top 3 income sources by total over 3 months
    income_by_merchant: dict[str, float] = defaultdict(float)
    for txn in income_txns:
        label = txn.get("merchant_name") or txn.get("name") or "Unknown"
        income_by_merchant[label] += _abs_amount(txn["amount"])

    top_3 = sorted(income_by_merchant.items(), key=lambda x: x[1], reverse=True)[:3]
    top_3_total = sum(v for _, v in top_3)

    # 3-month average monthly burn
    total_expenses   = sum(float(t["amount"]) for t in expense_txns)
    avg_monthly_burn = total_expenses / 3 if total_expenses > 0 else 0.0

    stressed_balance = (current_balance - top_3_total) if current_balance is not None else None
    stressed_runway  = (
        round(stressed_balance / avg_monthly_burn, 1)
        if stressed_balance is not None and avg_monthly_burn > 0
        else None
    )

    return {
        "insight_type":           "runway_stress_test",
        "current_balance":        round(current_balance, 2) if current_balance is not None else None,
        "top_3_income_sources":   [{"merchant": m, "three_month_total": round(v, 2)} for m, v in top_3],
        "top_3_income_total":     round(top_3_total, 2),
        "avg_monthly_burn":       round(avg_monthly_burn, 2),
        "stressed_balance":       round(stressed_balance, 2) if stressed_balance is not None else None,
        "stressed_runway_months": stressed_runway,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 8. Invoice Obligations  (populated by Gmail invoice agent)
# ─────────────────────────────────────────────────────────────────────────────

def query_invoice_obligations(client: Client, user_id: str) -> dict[str, Any]:
    """
    Surface outstanding invoice obligations from the invoices table.
    The Gmail invoice agent parses email attachments and writes rows here;
    this module turns those rows into an actionable financial risk signal.

    Classifies each unpaid invoice as:
      - overdue:           due_date has passed and status != 'paid'
      - due_within_30d:    due date falls within the next 30 days
      - upcoming:          due date is more than 30 days away (or no due date set)

    These amounts represent *future cash outflows not yet captured in Plaid*,
    so they directly reduce effective available cash and shorten real runway.
    """
    today           = date.today()
    thirty_days_out = today + timedelta(days=30)

    resp = (
        client.table("invoices")
        .select("id, vendor, amount, due_date, status, source")
        .eq("user_id", user_id)
        .neq("status", "paid")
        .execute()
    )

    overdue:  list[dict] = []
    due_soon: list[dict] = []
    upcoming: list[dict] = []

    for inv in (resp.data or []):
        amt    = round(float(inv.get("amount") or 0), 2)
        vendor = (inv.get("vendor") or "Unknown").strip()
        status = inv.get("status") or "pending"
        source = inv.get("source") or "unknown"

        due: date | None = None
        if inv.get("due_date"):
            try:
                due = date.fromisoformat(inv["due_date"])
            except ValueError:
                pass

        record: dict[str, Any] = {
            "vendor":   vendor,
            "amount":   amt,
            "due_date": inv.get("due_date"),
            "status":   status,
            "source":   source,
        }

        if due is None:
            upcoming.append(record)
        elif due < today:
            record["days_overdue"] = (today - due).days
            overdue.append(record)
        elif due <= thirty_days_out:
            record["days_until_due"] = (due - today).days
            due_soon.append(record)
        else:
            upcoming.append(record)

    total_overdue  = sum(inv["amount"] for inv in overdue)
    total_due_soon = sum(inv["amount"] for inv in due_soon)
    total_unpaid   = total_overdue + total_due_soon + sum(inv["amount"] for inv in upcoming)

    return {
        "insight_type":          "invoice_obligations",
        "overdue_invoices":      overdue,
        "due_within_30_days":    due_soon,
        "upcoming_invoices":     upcoming,
        "total_overdue_amount":  round(total_overdue, 2),
        "total_due_soon_amount": round(total_due_soon, 2),
        "total_unpaid_amount":   round(total_unpaid, 2),
        "overdue_count":         len(overdue),
        "due_soon_count":        len(due_soon),
    }

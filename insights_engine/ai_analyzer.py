"""
ai_analyzer.py — Gemini 2.0 Flash integration layer.

Three distinct AI calls are made per request:
  1. identify_duplicate_services  — semantic matching of competing SaaS tools.
  2. analyze_individual_plans     — decide if repeat-charge patterns mean individual accounts.
  3. prioritize_all_insights      — master call: rank, enrich, and recommend actions for
                                    every insight from all 7 modules.

All calls use response_mime_type="application/json" (Gemini structured output)
so JSON parsing is safe and hallucinated formatting is avoided.

These functions are synchronous and are wrapped with asyncio.to_thread() in main.py.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

from google import genai
from google.genai.types import GenerateContentConfig

from .config import GEMINI_API_KEY, GEMINI_MODEL, COMPETING_SERVICES_SEED

log = logging.getLogger(__name__)

# Set AI_ENABLED=true in your environment to activate Gemini calls.
# When False (default) every AI function returns its structured stub immediately.
AI_ENABLED: bool = os.getenv("AI_ENABLED", "false").lower() == "true"

# Lazy-initialised so the client is only created when actually needed.
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _generate(
    system: str,
    user: str,
    *,
    max_retries: int = 4,
    base_delay: float = 55.0,
) -> str | None:
    """
    Call Gemini with automatic retry-on-rate-limit (exponential back-off).
    Returns the raw text of the response, or None when AI_ENABLED is False.
    """
    if not AI_ENABLED:
        return None

    cfg = GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        temperature=0.2,
        max_output_tokens=8192,
    )
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = _get_client().models.generate_content(
                model=GEMINI_MODEL,
                contents=user,
                config=cfg,
            )
            return resp.text
        except Exception as exc:
            msg = str(exc)
            if (
                "RESOURCE_EXHAUSTED" in msg
                or "429" in msg
                or "quota" in msg.lower()
                or "rate" in msg.lower()
            ):
                delay = base_delay * (2 ** attempt)
                log.warning(
                    "Gemini rate-limit hit (attempt %d/%d). Retrying in %.0fs …",
                    attempt + 1, max_retries, delay,
                )
                time.sleep(delay)
                last_exc = exc
            else:
                raise
    raise RuntimeError(
        f"Gemini quota exceeded after {max_retries} retries."
    ) from last_exc


def _safe_parse(raw: str | None, fallback: Any) -> Any:
    if raw is None:          # AI disabled — return stub directly
        return fallback
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        log.warning("Gemini returned non-JSON response; using fallback.\n%s", raw[:300])
        return fallback


# ─────────────────────────────────────────────────────────────────────────────
# Call 1 — Duplicate / Competing Services
# ─────────────────────────────────────────────────────────────────────────────

DUPLICATE_SYSTEM = """\
You are a senior SaaS procurement analyst with exhaustive, up-to-date knowledge of
business software tools as of 2026. You will be given a list of merchants a company
pays for. Your task is to identify any redundant or competing tools — where the
company is paying for two or more products that serve the same core purpose.

Be thorough. Consider all known SaaS categories: AI assistants, design, project
management, communication, analytics, CRM, HR, security, storage, etc.
"""

DUPLICATE_USER = """\
Here are the merchants this company is currently paying for:
{merchants}

Here are some example competing-service categories to guide you (but don't limit
yourself to these — use your full knowledge of the SaaS landscape):
{seed_categories}

Identify every overlapping service pair or group. For each duplicate cluster, return:

```json
[
  {{
    "service_category": "string  — e.g. 'AI Coding Assistant'",
    "competing_merchants": ["Merchant A", "Merchant B"],
    "overlap_description": "string — what these tools both do",
    "estimated_redundancy": "High | Medium | Low",
    "recommendation": "string — which to keep and why (consider pricing, features, integrations)"
  }}
]
```

Return ONLY the JSON array. If no duplicates are found, return [].
"""


def identify_duplicate_services(
    merchants: list[str],
    raw_transactions: list[dict],
) -> list[dict]:
    """
    Call Gemini to semantically identify competing / duplicate SaaS tools.
    Returns a list of duplicate-cluster dicts.
    """
    if not merchants:
        return []

    seed = json.dumps(
        [s["category"] + ": " + ", ".join(s["services"]) for s in COMPETING_SERVICES_SEED],
        indent=2,
    )

    prompt = DUPLICATE_USER.format(
        merchants=json.dumps(merchants, indent=2),
        seed_categories=seed,
    )

    return _safe_parse(_generate(DUPLICATE_SYSTEM, prompt), [])


# ─────────────────────────────────────────────────────────────────────────────
# Call 2 — Individual vs. Enterprise Plan Analysis
# ─────────────────────────────────────────────────────────────────────────────

INDIVIDUAL_SYSTEM = """\
You are a SaaS pricing expert who knows the pricing tiers of every major business
software product as of 2026. You will be given transaction patterns where the same
merchant is charged multiple times at the same amount in one month. Your job is to
determine whether each pattern suggests employees are paying for individual accounts
instead of a shared team/enterprise plan.
"""

INDIVIDUAL_USER = """\
These transaction patterns were detected for one organisation this month
(same merchant, same amount, multiple charges):
{patterns}

{team_size_line}

For each pattern:
1. Identify whether the amount matches a known individual-tier price for that merchant.
2. If so, determine the cheapest team/enterprise plan that would cover this many users.
3. Calculate the potential monthly saving.

Return ONLY a JSON array:
[
  {{
    "merchant": "string",
    "amount_per_person": number,
    "transaction_count": number,
    "current_monthly_spend": number,
    "is_individual_plan": true | false,
    "confidence": "high | medium | low",
    "individual_plan_name": "string or null  — e.g. 'ChatGPT Plus'",
    "enterprise_plan_name": "string or null  — e.g. 'ChatGPT Team'",
    "enterprise_plan_price_per_user": number | null,
    "estimated_monthly_savings": number | null,
    "recommendation": "string — specific, actionable advice"
  }}
]
"""


def analyze_individual_plans(
    suspicious_patterns: list[dict],
    team_size: int | None = None,
) -> list[dict]:
    """
    Call Gemini to classify whether repeat-charge patterns are individual plans
    and estimate potential savings from switching to an enterprise tier.
    """
    if not suspicious_patterns:
        return []

    team_size_line = (
        f"The organisation has {team_size} employees."
        if team_size
        else "Team size is unknown."
    )

    prompt = INDIVIDUAL_USER.format(
        patterns=json.dumps(suspicious_patterns, indent=2),
        team_size_line=team_size_line,
    )

    return _safe_parse(_generate(INDIVIDUAL_SYSTEM, prompt), [])


# ─────────────────────────────────────────────────────────────────────────────
# Call 3 — Master Prioritisation & Recommended Actions
# ─────────────────────────────────────────────────────────────────────────────

PRIORITISE_SYSTEM = """\
You are a CFO-level financial advisor for early-stage and growth-stage tech startups.
You have deep expertise in SaaS spend optimisation, burn rate management, and
financial health monitoring. You will receive the output of 7 automated financial
insight modules for a company. Your job is to:

1. Analyse ALL findings holistically.
2. Assign a severity (critical / warning / info) to each insight that has findings.
3. Rank insights by business impact (cash saved, risk reduced, urgency).
4. Generate specific, actionable recommendations with realistic effort estimates.
5. Produce a concise executive summary a founder can act on immediately.
6. Return ONLY valid JSON matching the schema below — no prose, no markdown fences.

Be specific with numbers. If a saving is €X/month, state it explicitly.
Prioritise insights that have immediate, quantifiable financial impact.
"""

PRIORITISE_USER = """\
Organisation ID: {org_id}
{team_size_line}
Report date: {report_date}

Raw insight data from all insight modules:
{all_insights}

Return a JSON object with this exact schema:
{{
  "priority_score": <integer 1–100, overall financial health, 100 = perfectly optimised>,
  "summary": "<2–3 sentence executive summary — most critical findings a founder must act on today>",
  "total_estimated_monthly_savings": <number>,
  "total_estimated_annual_savings": <number>,
  "insights": [
    {{
      "insight_type": "<string matching the insight_type field in the raw data>",
      "title": "<short punchy title, max 8 words>",
      "severity": "critical | warning | info",
      "priority_rank": <integer, 1 = most urgent>,
      "headline_metric": "<single most impactful metric, e.g. '€480/month wasted on duplicate AI tools'>",
      "description": "<clear 2–3 sentence explanation of the problem and its business impact>",
      "recommended_actions": [
        {{
          "action": "<specific, imperative-tense step the founder should take>",
          "estimated_impact": "<e.g. 'Save €120/month'>",
          "effort": "low | medium | high",
          "timeframe": "<e.g. 'Today', 'This week', 'This quarter'>"
        }}
      ],
      "supporting_data": <object — relevant subset of raw data supporting this insight>
    }}
  ]
}}

Rules:
- Only include insights where there are actual findings (non-empty flagged lists, flagged=true, etc.).
- Sort the insights array by severity (critical first) then by estimated financial impact descending.
- Omit insights with no actionable findings entirely.
- Do not invent numbers — base all estimates on the raw data provided.
"""


def prioritize_all_insights(
    all_insights: list[dict],
    org_id: str,
    team_size: int | None = None,
) -> dict:
    """
    Master Gemini call: receive all 7 raw insight dicts, return a single
    prioritised, AI-enriched report with recommended actions.
    """
    from datetime import date

    team_size_line = (
        f"Team size: {team_size} employees."
        if team_size
        else "Team size: unknown."
    )

    prompt = PRIORITISE_USER.format(
        org_id=org_id,
        team_size_line=team_size_line,
        report_date=date.today().isoformat(),
        all_insights=json.dumps(all_insights, indent=2),
    )

    return _safe_parse(
        _generate(PRIORITISE_SYSTEM, prompt),
        {
            "priority_score": 0,
            "summary": "AI analysis failed — please retry.",
            "total_estimated_monthly_savings": 0,
            "total_estimated_annual_savings": 0,
            "insights": [],
            "_error": "JSON parse failed",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Call 4 — Financial Health Score (Controllable Elements Only)
# ─────────────────────────────────────────────────────────────────────────────

HEALTH_SYSTEM = """\
You are a CFO-level financial analyst specialising in early-stage and growth-stage technology startups.
You score companies ONLY on controllable financial metrics — things the founder can directly influence.
You never penalise for market conditions, revenue size, or uncontrollable external factors.
You are direct, specific, and always reference actual numbers from the data provided.
"""

HEALTH_USER = """\
Analyse this company's financial health data and produce a structured assessment.

Financial Data:
{health_data}

Business Context:
{business_context}

Score ONLY on these 4 controllable dimensions (25 points each = 100 total):
  1. Cost Structure  (25 pts): Is the fixed/variable/payroll split healthy for their stage?
  2. Profit Quality  (25 pts): Is the profit margin sustainable? Revenue diversification?
  3. Cash Efficiency (25 pts): Is cash deployed productively? Any idle/lazy cash losing value to inflation? Also factor in outstanding and overdue invoice liabilities — they reduce effective available cash and signal cash-management risk.
  4. Expense Control (25 pts): Are there signs of cost discipline, or growing undisciplined spend?

Return ONLY this JSON object — no prose, no markdown:
{{
  "health_score": <integer 1–100, sum of the 4 dimension scores>,
  "score_breakdown": {{
    "cost_structure":  {{"score": <0–25>, "reasoning": "string — reference their specific numbers"}},
    "profit_quality":  {{"score": <0–25>, "reasoning": "string — reference their specific numbers"}},
    "cash_efficiency": {{"score": <0–25>, "reasoning": "string — reference their specific numbers"}},
    "expense_control": {{"score": <0–25>, "reasoning": "string — reference their specific numbers"}}
  }},
  "variable_cost_assessment": "string — is their variable cost % healthy for their industry and stage?",
  "payroll_assessment": "string — is payroll proportionate to their revenue and stage?",
  "lazy_cash_alert": <null | "string — if idle cash > 150% of 6-month burn: state exact amount, inflation cost per month, and opportunity">,
  "invoice_liability_alert": <null | "string — if overdue_invoice_total > 0: name the vendors, state the total overdue amount, and give a specific payment urgency recommendation">,
  "investment_opportunity": <null | "string — specific capital allocation recommendation with projected return, e.g. 'Move €200k to a 4.5% business savings account — generates €750/month, covering your entire SaaS stack'">,
  "top_3_controllable_improvements": [
    "string — specific, imperative, with estimated monthly impact in currency",
    "string",
    "string"
  ]
}}
"""


def analyze_financial_health(
    health_data: dict,
    business_context: dict,
) -> dict:
    """
    Call Gemini to score the company's financial health on controllable metrics only
    (cost structure, profit quality, cash efficiency, expense control).
    Surfaces lazy-cash opportunities and top improvement actions.
    """
    prompt = HEALTH_USER.format(
        health_data=json.dumps(health_data, indent=2),
        business_context=json.dumps(business_context, indent=2),
    )
    return _safe_parse(_generate(HEALTH_SYSTEM, prompt), {
        "health_score": 0,
        "score_breakdown": {},
        "variable_cost_assessment": "Analysis unavailable — please retry.",
        "payroll_assessment":       "Analysis unavailable — please retry.",
        "lazy_cash_alert":          None,
        "invoice_liability_alert":  None,
        "investment_opportunity":   None,
        "top_3_controllable_improvements": [],
        "_error": "JSON parse failed",
    })


# ─────────────────────────────────────────────────────────────────────────────
# Call 5 — Benchmark Forecast + Seasonal Intelligence
# ─────────────────────────────────────────────────────────────────────────────

FORECAST_SYSTEM = """\
You are a financial forecasting analyst with deep knowledge of industry benchmarks,
seasonal spending patterns, and sector-specific financial ratios for SMEs and startups
across Europe and North America as of 2026.
You use your knowledge of business cycles, retail seasons, regulatory calendars, and
startup financial patterns to enrich and validate statistical forecasts.
"""

FORECAST_USER = """\
Here is a company's financial trend data for the last 3 calendar months,
plus linear regression (OLS) forecasts for next month:

Forecast Data:
{forecast_data}

Business Context:
{business_context}

Today: {today}

Your tasks:
1. Validate or refine the statistical burn/income forecasts using seasonal and industry knowledge.
2. Compare their category spend patterns to benchmarks for a similar-stage company in their sector.
3. Flag inventory or stock-up recommendations based on upcoming seasons or business cycles.
4. Identify any upcoming financial risks (tax deadlines, seasonal slow periods, etc.).

Return ONLY this JSON object — no prose, no markdown:
{{
  "predicted_burn_next_month":   <number — your best estimate; can differ from the statistical model>,
  "predicted_income_next_month": <number>,
  "forecast_confidence": "high | medium | low",
  "forecast_reasoning": "string — key drivers behind your forecast adjustment, 2–3 sentences",
  "benchmark_comparison": {{
    "summary": "string — how does this company compare to similar-stage businesses in their sector?",
    "areas_above_benchmark": ["string — category name + specific observation"],
    "areas_below_benchmark": ["string — category name + specific observation"]
  }},
  "inventory_alert": <null | "string — seasonal stock/inventory recommendation with specific timing and rationale">,
  "seasonal_risk":   <null | "string — upcoming risk with estimated financial impact, e.g. 'Q1 corporation tax estimated at €X based on current profit'">
}}
"""


def generate_benchmark_forecast(
    forecast_data: dict,
    business_context: dict,
) -> dict:
    """
    Call Gemini to validate statistical forecasts against industry benchmarks and
    surface seasonal intelligence (inventory alerts, tax risk, slow periods).
    """
    from datetime import date as _date

    prompt = FORECAST_USER.format(
        forecast_data=json.dumps(forecast_data, indent=2),
        business_context=json.dumps(business_context, indent=2),
        today=_date.today().isoformat(),
    )
    return _safe_parse(_generate(FORECAST_SYSTEM, prompt), {
        "predicted_burn_next_month":   forecast_data.get("predicted_expenditure", 0),
        "predicted_income_next_month": forecast_data.get("predicted_income", 0),
        "forecast_confidence": "low",
        "forecast_reasoning":  "AI forecast unavailable.",
        "benchmark_comparison": {
            "summary": "Unavailable.",
            "areas_above_benchmark": [],
            "areas_below_benchmark": [],
        },
        "inventory_alert": None,
        "seasonal_risk":   None,
        "_error": "JSON parse failed",
    })


# ─────────────────────────────────────────────────────────────────────────────
# Call 6 — Purchase Advisor (Green / Yellow / Red)
# ─────────────────────────────────────────────────────────────────────────────

PURCHASE_SYSTEM = """\
You are a CFO advisor for early-stage startups. You give direct, financially-grounded
advice on whether a founder should make a specific purchase right now.
Use a strict Green/Yellow/Red traffic-light system. You are not overly conservative —
good tooling drives growth — but you protect runway ruthlessly.
Always reference specific numbers from the financial context. Never give vague advice.
"""

PURCHASE_USER = """\
A founder is considering this purchase:
  Description: {item_description}
  Price: {price} {currency}

Their current financial position:
{financial_context}

Decision rules:
  RED    → purchase reduces runway below 4 months, OR this category already exceeds 30% of monthly burn.
  YELLOW → runway drops to 4–6 months after purchase, OR this category spend is unusually high.
  GREEN  → runway stays above 6 months and the purchase is proportionate to their stage.

Return ONLY this JSON object — no prose, no markdown:
{{
  "risk_level": "green | yellow | red",
  "runway_after_purchase_months": <number | null>,
  "verdict": "string — 1 direct sentence, e.g. 'Do not approve this purchase.' or 'This is a sound investment at your current runway.'",
  "reasoning": "string — 2–3 sentences with specific numbers from their financial data",
  "alternatives": ["string — specific cheaper or free alternative if applicable"],
  "best_time_to_buy": "string — e.g. 'After your Q2 revenue lands' or 'Now — your cash position supports it'",
  "investment_opportunity": <null | "string — if idle cash > 150% of 6-month buffer, recommend specific capital allocation with projected return">
}}
"""


def evaluate_purchase(
    item_description: str,
    price: float,
    financial_context: dict,
    currency: str = "USD",
) -> dict:
    """
    Call Gemini to evaluate a proposed purchase against the user's live financial position.
    Returns a Green/Yellow/Red verdict with specific reasoning, alternatives, and
    an investment opportunity tip if idle cash is detected.
    """
    prompt = PURCHASE_USER.format(
        item_description=item_description,
        price=price,
        currency=currency,
        financial_context=json.dumps(financial_context, indent=2),
    )
    return _safe_parse(_generate(PURCHASE_SYSTEM, prompt), {
        "risk_level":                    "yellow",
        "runway_after_purchase_months":  None,
        "verdict":                       "Unable to evaluate — please retry.",
        "reasoning":                     "AI evaluation failed.",
        "alternatives":                  [],
        "best_time_to_buy":              "Unknown",
        "investment_opportunity":        None,
        "_error": "JSON parse failed",
    })

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
from typing import Any

import google.generativeai as genai

from .config import GEMINI_API_KEY, GEMINI_MODEL, COMPETING_SERVICES_SEED

log = logging.getLogger(__name__)

# Configure once at import time
genai.configure(api_key=GEMINI_API_KEY)

_JSON_CONFIG = genai.types.GenerationConfig(
    response_mime_type="application/json",
    temperature=0.2,          # Low temp → consistent, fact-like output
    max_output_tokens=8192,
)


def _make_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=_JSON_CONFIG,
    )


def _safe_parse(raw: str, fallback: Any) -> Any:
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

    model = _make_model()
    resp = model.generate_content([DUPLICATE_SYSTEM, prompt])
    return _safe_parse(resp.text, [])


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

    model = _make_model()
    resp = model.generate_content([INDIVIDUAL_SYSTEM, prompt])
    return _safe_parse(resp.text, [])


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

Raw insight data from all 7 modules:
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

    model = _make_model()
    resp = model.generate_content([PRIORITISE_SYSTEM, prompt])
    return _safe_parse(
        resp.text,
        {
            "priority_score": 0,
            "summary": "AI analysis failed — please retry.",
            "total_estimated_monthly_savings": 0,
            "total_estimated_annual_savings": 0,
            "insights": [],
            "_error": "JSON parse failed",
            "_raw_response": resp.text[:500],
        },
    )

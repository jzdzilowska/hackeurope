# FinInsights Engine — Frontend API Reference

**Base URL (local dev):** `http://localhost:8000`  
**Run the server:**
```bash
AI_ENABLED=true uvicorn insights_engine.main:app --reload --port 8000
```

Interactive docs auto-generated at: `http://localhost:8000/docs`

---

## Authentication

All endpoints are **unauthenticated at the API level** — they take a `user_id` path parameter (the Supabase `auth.users` UUID). Your frontend should pass the ID of the currently logged-in user from its Supabase session.

---

## Endpoints

### 1. `GET /insights/{user_id}` — Subscription Waste Report

Runs all 7 financial insight modules and returns a ranked, AI-prioritised report of subscription waste.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `months` | int (1–12) | `1` | Analysis window. `1` = current calendar month only. |
| `team_size` | int | `null` | Number of employees — required for seat-waste detection. |

**Example request**
```
GET /insights/c5cbf7bd-2801-407e-9efe-222d8e93fddc?months=1&team_size=8
```

**Response**
```jsonc
{
  "user_id": "c5cbf7bd-...",
  "generated_at": "2026-02-21T14:30:00Z",
  "date_range_months": 1,

  // Overall subscription health (1–100). Low = more waste detected.
  "priority_score": 25,

  // 2–3 sentence exec summary for the founder
  "summary": "Your company faces a critical financial situation with only 9.7 months of runway...",

  "total_estimated_monthly_savings": 480.00,
  "total_estimated_annual_savings": 5760.00,

  // Array of findings, sorted: critical → warning → info
  "insights": [
    {
      "insight_type": "runway_stress_test",   // see Insight Types below
      "title": "Critical Runway Shortage",
      "severity": "critical",                 // "critical" | "warning" | "info"
      "priority_rank": 1,                     // 1 = most urgent
      "headline_metric": "9.7 months runway with current burn",
      "description": "Your current cash balance of $214,535...",
      "recommended_actions": [
        {
          "action": "Immediately review all expenses and implement aggressive cost-cutting measures.",
          "estimated_impact": "Extend runway by reducing monthly burn.",
          "effort": "medium",                 // "low" | "medium" | "high"
          "timeframe": "This week"
        }
      ],
      "supporting_data": {
        // Raw numbers that back up this insight — varies by insight_type
        "current_balance": 214535.8,
        "avg_monthly_burn": 22213.67,
        "stressed_runway_months": 9.7
      }
    }
  ]
}
```

**Insight types** (values of `insight_type` field)

| Value | What it detects |
|---|---|
| `saas_seat_waste` | SaaS tools where implied seat count exceeds team size |
| `price_creep` | Subscriptions that have silently increased in price |
| `ad_efficiency` | Ad spend growing faster than revenue |
| `duplicate_services` | Two or more tools serving the same purpose |
| `individual_vs_enterprise` | Employees on individual plans instead of a team tier |
| `free_trial_trap` | Trials that converted to paid without notice |
| `runway_stress_test` | Burn rate vs. current balance — months of runway remaining |

---

### 2. `GET /financial-health/{user_id}` — Full Financial Health Report

Returns a comprehensive P&L, health score, burn forecast, and AI benchmarking. Results are **cached for 6 hours** — pass `?refresh=true` to force a fresh run.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `months` | int (1–12) | `1` | Cost analysis window. |
| `industry` | string | `null` | e.g. `"SaaS"`, `"Retail"`, `"Agency"` — used for AI benchmarks. |
| `location` | string | `null` | e.g. `"London"`, `"Boston"` — used for regional context. |
| `team_size` | int | `null` | Number of employees. |
| `refresh` | bool | `false` | `true` bypasses the 6-hour cache and forces a fresh AI analysis. |

**Example request**
```
GET /financial-health/c5cbf7bd-2801-407e-9efe-222d8e93fddc?months=1&industry=SaaS&location=Boston&team_size=8
```

**Response**
```jsonc
{
  "user_id": "c5cbf7bd-...",
  "generated_at": "2026-02-21T14:30:00Z",
  "cached": false,   // true if served from cache

  "business_context": {
    "company_name": "Acme Corp",
    "industry": "SaaS",
    "location": "Boston",
    "team_size": 8
  },

  // ── Scores ──────────────────────────────────────────────────────────────
  // Controllable-elements score (1–100). Measures cost structure, profit
  // quality, cash efficiency, and expense control — NOT market conditions.
  "health_score": 25,
  "score_breakdown": {
    "cost_structure":  { "score": 10, "reasoning": "Payroll at 71.1% is unsustainable..." },
    "profit_quality":  { "score": 0,  "reasoning": "Profit margin is -178.3%..." },
    "cash_efficiency": { "score": 10, "reasoning": "$57k liquid vs $182k 6-month buffer needed..." },
    "expense_control": { "score": 5,  "reasoning": "Expenditure is 3× income..." }
  },

  // ── P&L (live from Supabase) ─────────────────────────────────────────────
  "net_worth": 214535.80,
  "total_expenditure": 30455.63,
  "total_income": 10944.22,
  "total_profit": -19511.41,
  "profit_margin_pct": -178.3,

  // All linked accounts with balances
  "account_breakdown": [
    { "name": "Plaid 401k",    "type": "investment", "subtype": "401k",        "balance": 23631.98 },
    { "name": "Plaid Mortgage","type": "loan",       "subtype": "mortgage",    "balance": 56302.06 },
    { "name": "Plaid Checking","type": "depository", "subtype": "checking",    "balance": 110.00 }
    // ... up to 14 accounts
  ],

  // ── Cost breakdown ───────────────────────────────────────────────────────
  "cost_breakdown": {
    "fixed": {
      "amount": 549.00, "pct": 1.8,
      "items": [{ "merchant": "Comcast", "amount": 120.00 }, { "merchant": "Blue Cross Blue Shield", "amount": 429.00 }]
    },
    "variable": {
      "amount": 1649.63, "pct": 5.4,
      "items": [{ "merchant": "Uber", "amount": 5.40 }, { "merchant": "Starbucks", "amount": 4.33 }]
    },
    "payroll": {
      "amount": 21666.00, "pct": 71.1,
      "items": [{ "merchant": "Paychex Payroll", "amount": 3925.00 }]
    },
    "other": { "amount": 6591.00, "pct": 21.6 }
  },
  // AI narrative on cost structure
  "variable_cost_assessment": "Variable costs at 5.4% are unusually low...",
  "payroll_assessment": "Payroll at 71.1% is disproportionate given current revenue...",

  // ── Forecast ─────────────────────────────────────────────────────────────
  "avg_monthly_burn": 12061.79,              // 3-month rolling average
  "statistical_burn_forecast": 14798.79,     // OLS linear regression (always present)
  "statistical_income_forecast": 504.22,
  "predicted_burn_next_month": 14798.79,     // AI-adjusted forecast
  "predicted_income_next_month": 504.22,
  "forecast_confidence": "medium",           // "high" | "medium" | "low"
  "forecast_reasoning": "Expenditure is projected to continue its upward trajectory...",

  // Last 3 months of actuals for charts
  "historical_months": [
    {
      "month": "2025-11",
      "expenditure": 11149.46,
      "income": 504.22,
      "profit": -10645.24,
      "category_spend": {
        "RENT_AND_UTILITIES": 5850.00,
        "ENTERTAINMENT": 1589.40,
        "TRANSFER_OUT": 2103.50,
        "FOOD_AND_DRINK": 516.33
        // ...
      }
    },
    { "month": "2025-12", "expenditure": 11149.46, "income": 504.22, "profit": -10645.24, "category_spend": { "...": 0 } },
    { "month": "2026-01", "expenditure": 13886.46, "income": 504.22, "profit": -13382.24, "category_spend": { "...": 0 } }
  ],

  // ── Benchmark ────────────────────────────────────────────────────────────
  "benchmark_comparison": {
    "summary": "This SME's financial health is critically below benchmarks...",
    "areas_above_benchmark": ["Expenditure: significantly above sustainable levels..."],
    "areas_below_benchmark": ["Income: critically low for an 8-person SME..."]
  },

  // ── Alerts (null if none) ────────────────────────────────────────────────
  "inventory_alert": null,
  "seasonal_risk": "Federal tax filing deadline March 15th — estimated $1,500–$3,000 in accounting fees.",
  "lazy_cash_estimate": 0.0,
  "lazy_cash_alert": null,           // non-null if idle cash > 150% of 6-month buffer
  "investment_opportunity": null,    // e.g. "Move $200k to a 4.5% savings account — $750/month"

  // ── Top 3 improvements ───────────────────────────────────────────────────
  "top_3_controllable_improvements": [
    "Reduce monthly payroll by at least $10,000 to align with current revenue.",
    "Increase monthly revenue by a minimum of $15,000.",
    "Audit the $6,591 'other' expenses and eliminate at least $2,000 in non-essential spending."
  ]
}
```

---

### 3. `POST /ask-purchase/{user_id}` — Purchase Advisor

Should the founder buy this? Returns a **Green / Yellow / Red** verdict against their live financial position.

**Request body**
```jsonc
{
  "item_description": "MacBook Pro 16-inch",
  "price": 2499.00,
  "currency": "USD"          // optional, defaults to "USD"
}
```

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `industry` | string | `null` | Optional industry context for the AI. |

**Example request**
```
POST /ask-purchase/c5cbf7bd-2801-407e-9efe-222d8e93fddc
Content-Type: application/json

{ "item_description": "MacBook Pro 16-inch", "price": 2499.00 }
```

**Response**
```jsonc
{
  "user_id": "c5cbf7bd-...",
  "evaluated_at": "2026-02-21T14:30:00Z",
  "item_description": "MacBook Pro 16-inch",
  "price": 2499.00,
  "currency": "USD",

  // ── Live financial snapshot (always present, even without AI) ────────────
  "current_balance": 214535.80,
  "current_runway_months": 17.8,
  "avg_monthly_burn": 12061.79,

  // ── AI verdict ───────────────────────────────────────────────────────────
  "risk_level": "green",                 // "green" | "yellow" | "red"
  "runway_after_purchase_months": 17.6,  // always calculated in Python, not AI

  // Display these three fields as the main verdict card
  "verdict": "This is a sound investment at your current runway.",
  "reasoning": "With $214,535 in the bank and 17.8 months of runway, a $2,499 purchase reduces runway by only 0.2 months. At $12k/month burn, this is proportionate.",
  "alternatives": ["Consider a refurbished MacBook Pro (approx. $1,600 via Apple Certified Refurbished)"],
  "best_time_to_buy": "Now — your cash position supports it.",
  "investment_opportunity": null    // non-null if idle cash detected
}
```

**Traffic light logic**

| Colour | Condition |
|---|---|
| 🔴 Red | Runway drops below 4 months after purchase, OR category already >30% of monthly burn |
| 🟡 Yellow | Runway drops to 4–6 months, OR category spend is unusually high |
| 🟢 Green | Runway stays above 6 months and purchase is proportionate |

---

### 4. `GET /health` — Service Health Check

```
GET /health
```
```json
{ "status": "ok", "service": "FinInsights Engine", "model": "gemini-2.5-flash" }
```

---

## Shared Field Reference

### Severity levels
| Value | Meaning | Suggested UI |
|---|---|---|
| `critical` | Immediate action required | Red badge |
| `warning` | Should be addressed soon | Orange badge |
| `info` | Informational / optimisation opportunity | Blue badge |

### Effort levels
| Value | Meaning |
|---|---|
| `low` | Under 1 hour |
| `medium` | 1 day to 1 week |
| `high` | Multi-week project |

### Score interpretation
| Range | Meaning |
|---|---|
| 80–100 | Healthy — well optimised |
| 60–79 | Good — minor improvements available |
| 40–59 | Fair — several issues to address |
| 20–39 | Poor — significant problems |
| 0–19 | Critical — immediate intervention required |

### Plaid category keys (used in `historical_months.category_spend`)
These are the raw Plaid PFC enums your charting code will see as keys:

`RENT_AND_UTILITIES`, `ENTERTAINMENT`, `FOOD_AND_DRINK`, `TRANSPORTATION`,
`TRAVEL`, `GENERAL_MERCHANDISE`, `TRANSFER_OUT`, `LOAN_PAYMENTS`,
`HOME_IMPROVEMENT`, `PERSONAL_CARE`, `INCOME`, `OTHER`

---

## Error responses

All errors follow FastAPI's standard shape:

```json
{ "detail": "User 'abc-123' not found." }
```

| HTTP status | Cause |
|---|---|
| `404` | `user_id` does not exist in the `profiles` table |
| `500` | Supabase env vars not configured |
| `422` | Invalid query param or request body |

---

## CORS

All origins are allowed (`*`) during development. Before production, restrict this to your frontend domain in `main.py`:

```python
allow_origins=["https://your-frontend-domain.com"]
```

---

## Environment variables required on the server

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `AI_ENABLED` | `true` to enable Gemini calls (default: `false`) |

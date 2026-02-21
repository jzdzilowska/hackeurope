# FinInsights Engine — Frontend API Reference

## Architecture overview

Financial data is pre-computed server-side and written directly into the `ai_insights` Supabase table. The frontend reads `subscription_insights` and `financial_health_report` **directly from Supabase** — no HTTP server needed for those.

The only thing that requires calling the API server is the **Purchase Advisor**, because it's interactive: the user types an item and price at runtime, so it can't be pre-computed.

```
run_ai.py (run on server / cron)
  └─► ai_insights table
        ├─ type = "subscription_insights"    ◄── frontend reads via Supabase JS client
        └─ type = "financial_health_report"  ◄── frontend reads via Supabase JS client
                        │
                        └── also used as context for purchase requests
                                      │
                                      ▼
                        POST /ask-purchase  ──► Gemini ──► Green/Yellow/Red verdict
```

---

## Reading pre-computed reports (no API call needed)

Use the Supabase JS client directly in your frontend:

```js
const { data } = await supabase
  .from('ai_insights')
  .select('data, created_at, valid_until')
  .eq('user_id', userId)
  .eq('type', 'subscription_insights')   // or 'financial_health_report'
  .gt('valid_until', new Date().toISOString())
  .single()

const report = data?.data   // the full JSON payload
```

`valid_until` is 6 hours after the last `run_ai.py` run — use it to show a "Last updated X hrs ago" label. If `data` is `null`, no report has been generated yet for this user.

---

## Purchase Advisor API

**Base URL (local dev):** `http://localhost:8000`

**Start the server:**
```bash
AI_ENABLED=true uvicorn insights_engine.main:app --reload --port 8000
```

Interactive docs: `http://localhost:8000/docs`

---

### `POST /ask-purchase/{user_id}`

Evaluates a proposed purchase against the user's financial position and returns a **Green / Yellow / Red** verdict.

The server reads the user's `financial_health_report` from `ai_insights` as context (written by `run_ai.py`), so no transaction scanning happens on each call. It then makes a single Gemini call and returns the verdict.

**Path parameter**

| Param | Description |
|---|---|
| `user_id` | The Supabase `auth.users` UUID of the logged-in user |

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `industry` | string | `null` | Optional — e.g. `"SaaS"`, `"Retail"`. Adds sector context to the AI. |

**Request body**
```jsonc
{
  "item_description": "MacBook Pro 16-inch",  // what the founder wants to buy
  "price": 2499.00,                           // numeric, in the given currency
  "currency": "USD"                           // optional, defaults to "USD"
}
```

**Example**
```js
const res = await fetch(
  `http://localhost:8000/ask-purchase/${userId}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item_description: 'MacBook Pro 16-inch',
      price: 2499.00,
      currency: 'USD',
    }),
  }
)
const verdict = await res.json()
```

**Response**
```jsonc
{
  "user_id": "c5cbf7bd-...",
  "evaluated_at": "2026-02-21T14:30:00Z",
  "item_description": "MacBook Pro 16-inch",
  "price": 2499.00,
  "currency": "USD",

  // ── Financial snapshot (from pre-computed report) ────────────────────────
  "current_balance": 214535.80,
  "current_runway_months": 17.8,
  "avg_monthly_burn": 12061.79,

  // ── Verdict ──────────────────────────────────────────────────────────────
  "risk_level": "green",                 // "green" | "yellow" | "red"  ← use for traffic light UI
  "runway_after_purchase_months": 17.6,  // always present — calculated before AI call

  "verdict": "This is a sound investment at your current runway.",   // 1-sentence headline
  "reasoning": "With $214,535 in the bank and 17.8 months of runway, a $2,499 purchase reduces runway by only 0.2 months.",
  "alternatives": [
    "Consider a refurbished MacBook Pro (approx. $1,600 via Apple Certified Refurbished)"
  ],
  "best_time_to_buy": "Now — your cash position supports it.",
  "investment_opportunity": null   // non-null string if idle cash is detected
}
```

**Traffic light rules**

| `risk_level` | Condition |
|---|---|
| `"red"` | Purchase would reduce runway below 4 months |
| `"yellow"` | Runway drops to 4–6 months, or category spend is already high |
| `"green"` | Runway stays above 6 months and spend is proportionate |

**Suggested UI: display `verdict` as the headline, `reasoning` as the body, and `alternatives` as a bullet list beneath.**

---

### `GET /health`

```
GET /health
→ { "status": "ok", "service": "FinInsights Engine", "model": "gemini-2.5-flash" }
```

---

## Error responses

```json
{ "detail": "User 'abc-123' not found." }
```

| HTTP status | Cause |
|---|---|
| `404` | `user_id` not found in `profiles` table |
| `422` | Invalid request body (missing `item_description` or `price`) |
| `500` | Server env vars not configured |

---

## Environment variables (server only)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `GEMINI_API_KEY` | Google AI Studio key |
| `AI_ENABLED` | Set to `true` to enable Gemini (default: `false`) |

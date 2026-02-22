# Runwave — AI-Powered SME Financial Dashboard

Built at **HackEurope 2026** (FinTech track).

Runwave is a real-time financial operations dashboard for SME founders. Connect your bank accounts, point it at your Gmail inbox, and get a CFO-grade view of your business — spending breakdowns, cash flow forecasts, invoice management, and AI recommendations — without hiring an accountant.

## Features

- **Bank account aggregation** via Plaid — multi-institution, live balance sync
- **AI financial chat** — Gemini 2.5 Flash with full dashboard context injected as system prompt
- **Voice briefing + voice agent** — ElevenLabs TTS + Web Speech API STT, continuous listen/think/speak loop
- **Invoice ingestion from Gmail** — Python agent polls via Zapier MCP, extracts PDFs with pdfplumber, parses with GPT-4o
- **Live invoice toast** — frontend polls every 5s, fires a notification the moment a new invoice lands
- **One-click invoice payments** — real Stripe sandbox PaymentIntent, confirmed immediately
- **AI insights engine** — FastAPI microservice, 7 concurrent SQL queries + 3 Gemini calls per request
- **Cash flow forecasting** — backward balance reconstruction from transactions + forward projection from open invoices
- **Restock forecast** — Pearson correlation sweep to detect sales→inventory lag, COGS rate model
- **Monthly surplus chart** — deployable cash per month with a conservative safe-to-invest floor

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend | Next.js API Routes, FastAPI (Python) |
| Database | Supabase (PostgreSQL + Auth) |
| AI / LLM | Gemini 2.5 Flash (chat), Gemini 2.0 Flash (insights), GPT-4o (invoice parsing) |
| Voice | ElevenLabs TTS, Web Speech API (STT), Web Audio API (waveform) |
| Payments | Stripe (sandbox) |
| Banking | Plaid |
| Email | Zapier MCP, pdfplumber |

---

## Running the App

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project (schema at `supabase/schema.sql`)

---

### 1. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Required environment variables in `frontend/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Plaid (sandbox)
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...

# Gemini (AI chat)
GEMINI_API_KEY=your_gemini_key

# ElevenLabs (voice)
ELEVENLABS_API_KEY=your_elevenlabs_key
# ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # optional, defaults to Rachel
```

> Stripe and ElevenLabs will gracefully degrade if keys are missing — payments fall back to a mock reference, voice features are disabled.

---

### 2. Insights Engine (FastAPI)

```bash
# From repo root
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn insights_engine.main:app --reload --port 8000
# → http://localhost:8000
```

Required environment variables in `.env` (repo root):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
AI_ENABLED=true   # set false to skip Gemini calls and use stub responses
```

---

### 3. Gmail Invoice Agent (Python)

```bash
# Activate the same venv
source .venv/bin/activate

cd email_integration
python src/gmail_invoice_agent.py --watch --duration 3600 --interval 30
# Polls Gmail every 30s for 1 hour, POSTs any found invoices to localhost:3000/api/invoices/ingest
```

Required in `.env` (repo root):

```env
ZAPIER_API_KEY=your_zapier_key
ZAPIER_MCP_URL=https://mcp.zapier.com/api/v1/connect
OPENAI_API_KEY=your_openai_key
INGEST_URL=http://localhost:3000/api/invoices/ingest
INGEST_USER_ID=your_supabase_user_id
```

---

### 4. How invoice ingestion works end-to-end

```
Gmail inbox
    │
    │  email with PDF attachment (subject: invoice / bill / receipt)
    ▼
Gmail Invoice Agent  (email_integration/src/gmail_invoice_agent.py)
    │
    │  polls Gmail every N seconds via Zapier MCP
    │  detects PDF attachment (raw bytes, base64, or hydrate URL)
    │  extracts text with pdfplumber
    │  sends extracted text to GPT-4o → structured JSON
    │    { vendor, amount, due_date, currency, invoice_number }
    ▼
POST /api/invoices/ingest  (Next.js API route)
    │
    │  writes invoice record to Supabase `invoices` table
    │  status = 'pending'
    ▼
Dashboard poller  (runs every 5 seconds in the browser)
    │
    │  fetches /api/dashboard/invoices
    │  compares returned IDs against the known-IDs set seeded at page load
    │  any new ID → fires InvoiceToast notification (bottom-right)
    ▼
Approval Queue  (dashboard widget)
    │
    │  pending invoices appear here automatically
    │  clicking Approve → POST /api/stripe/invoice-payment
    │    creates real Stripe sandbox PaymentIntent (pm_card_visa)
    │    confirms immediately, writes transaction back to Supabase
    │  status → 'paid', card animates out of the queue
```

To trigger the full flow: send yourself an email with a PDF invoice attached (subject line containing "invoice", "bill", or "receipt"), then start the Gmail agent. It will find the email, parse it, and the dashboard toast will fire within one poll cycle.

---

### 5. Database setup

Run `supabase/schema.sql` in your Supabase SQL editor to create all tables:
`profiles`, `plaid_items`, `accounts`, `transactions`, `invoices`, `recurring_payments`.

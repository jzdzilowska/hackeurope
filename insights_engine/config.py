import os
from dotenv import load_dotenv

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
# Use the service-role key so RLS does not block server-side reads
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── Gemini ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = "gemini-2.0-flash"

# ── Plaid Personal Finance Category (PFC) values — CONFIRMED ────────────────
# The schema stores Plaid's modern PFC taxonomy in two columns:
#   category_primary  — uppercase enum, e.g. "GENERAL_SERVICES", "INCOME"
#   category_detailed — finer breakdown,  e.g. "GENERAL_SERVICES_SUBSCRIPTION"
#   ai_category       — WS3 AI-refined category (populated by the AI pipeline)

# SaaS / Software subscriptions map to GENERAL_SERVICES at the primary level.
PLAID_CATEGORY_SOFTWARE         = "GENERAL_SERVICES"
PLAID_CATEGORY_DETAILED_SUB     = "%SUBSCRIPTION%"       # ILIKE on category_detailed

# Advertising has no dedicated Plaid PFC — also falls under GENERAL_SERVICES.
# The ai_category column (WS3-refined) is the reliable ad-spend signal once live.
PLAID_CATEGORY_ADVERTISING      = "GENERAL_SERVICES"
PLAID_AI_CATEGORY_ADVERTISING   = "%advertising%"        # ILIKE on ai_category

# Income — confirmed Plaid PFC primary value
PLAID_CATEGORY_INCOME           = "INCOME"

# ── Transaction amount sign convention — CONFIRMED ────────────────────────────
# Schema comment: "Plaid convention: positive = money out, negative = money in"
EXPENSES_ARE_POSITIVE: bool = True   # confirmed — positive amount = expense

# ── Accounts / Balance — CONFIRMED ────────────────────────────────────────────
# Schema: accounts(id, user_id, plaid_account_id, ..., balance_current, balance_available, ...)
ACCOUNTS_TABLE:  str = "accounts"
BALANCE_COLUMN:  str = "balance_current"   # posted balance; balance_available excludes pending

# ── Known SaaS per-seat monthly prices (EUR, as of early 2026) ───────────────
# Used as a starting seed for SaaS Seat Waste detection.
# The AI layer will also reason about unlisted merchants dynamically.
KNOWN_SEAT_PRICES: dict[str, float] = {
    # Productivity / Workspace
    "google workspace":  12.00,
    "google":            12.00,
    "microsoft 365":     12.50,
    "microsoft":         12.50,
    "notion":            16.00,
    "coda":              12.00,
    "evernote":           8.00,
    # Communication
    "slack":              8.75,
    "microsoft teams":   12.50,
    "discord":            9.99,
    # Video
    "zoom":              15.99,
    "loom":              12.50,
    # Design
    "figma":             15.00,
    "canva":             13.00,
    "miro":              16.00,
    "sketch":            12.00,
    # Dev / Engineering
    "github":             4.00,
    "gitlab":            19.00,
    "linear":             8.00,
    "jira":               8.15,
    "confluence":         5.75,
    "jetbrains":          24.90,
    # Project / Work management
    "asana":             13.49,
    "monday":            12.00,
    "trello":             5.00,
    "basecamp":           15.00,
    "clickup":            7.00,
    # CRM / Sales
    "hubspot":            50.00,
    "salesforce":         25.00,
    "pipedrive":          15.00,
    "zoho":               14.00,
    # Security
    "1password":           8.00,
    "lastpass":            4.00,
    "okta":               16.00,
    # Storage
    "dropbox":            16.58,
    "box":                20.00,
    # AI Tools
    "chatgpt":            20.00,
    "openai":             20.00,
    "claude":             20.00,
    "anthropic":          20.00,
    "midjourney":         10.00,
    "github copilot":     19.00,
    # Customer support
    "intercom":           74.00,
    "zendesk":            55.00,
    "freshdesk":          15.00,
    # Email marketing
    "mailchimp":          13.00,
    "klaviyo":            45.00,
    # Analytics
    "mixpanel":           28.00,
    "amplitude":          49.00,
    # Usage-based — cannot do seat analysis, skip these
    "stripe":   None,
    "aws":      None,
    "gcp":      None,
    "azure":    None,
    "twilio":   None,
    "sendgrid": None,
}

# ── Competing service seed pairs ──────────────────────────────────────────────
# Pre-seeded categories used as *context* for the Gemini duplicate-service prompt.
# The AI will extend this with its own knowledge of the current SaaS landscape.
COMPETING_SERVICES_SEED: list[dict] = [
    {"category": "AI Coding Assistant",     "services": ["github copilot", "cursor", "tabnine", "codeium"]},
    {"category": "AI Chat / LLM",           "services": ["chatgpt", "openai", "claude", "anthropic", "gemini", "perplexity"]},
    {"category": "AI Image Generation",     "services": ["midjourney", "dall-e", "stable diffusion", "adobe firefly"]},
    {"category": "Design",                  "services": ["figma", "canva", "sketch", "adobe xd", "penpot"]},
    {"category": "Whiteboard / Diagramming","services": ["miro", "mural", "figjam", "lucidchart"]},
    {"category": "Project Management",      "services": ["jira", "linear", "asana", "monday", "trello", "clickup", "basecamp"]},
    {"category": "Docs / Knowledge Base",   "services": ["notion", "coda", "confluence", "slab", "gitbook"]},
    {"category": "Communication",           "services": ["slack", "microsoft teams", "discord"]},
    {"category": "Video Conferencing",      "services": ["zoom", "google meet", "webex", "around"]},
    {"category": "Screen Recording",        "services": ["loom", "tella", "vidyard", "claap"]},
    {"category": "Cloud Storage",           "services": ["dropbox", "google drive", "onedrive", "box"]},
    {"category": "CRM",                     "services": ["salesforce", "hubspot", "pipedrive", "zoho", "attio"]},
    {"category": "Email Marketing",         "services": ["mailchimp", "klaviyo", "sendgrid", "brevo", "hubspot"]},
    {"category": "Analytics / Product",     "services": ["mixpanel", "amplitude", "segment", "heap", "posthog"]},
    {"category": "Password Manager",        "services": ["1password", "lastpass", "bitwarden", "dashlane"]},
    {"category": "HR / People",             "services": ["bamboohr", "lattice", "rippling", "personio", "workday"]},
]

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

# ── Plaid category strings ────────────────────────────────────────────────────
# TODO: Confirm exact Plaid category strings once the Plaid integration is live.
# Plaid uses a hierarchical category system, e.g. ["Software", "Computers and Electronics"]
# or the newer Plaid Personal Finance Category taxonomy (e.g. "SOFTWARE_AS_A_SERVICE").
# Update the ILIKE patterns in queries.py to match your actual Plaid output.
PLAID_CATEGORY_SOFTWARE     = "%Software%"
PLAID_CATEGORY_ADVERTISING  = "%Advertising%"
PLAID_CATEGORY_INCOME       = "%Income%"   # TODO: verify — may be "Payroll", "Transfer In", etc.

# ── Transaction amount sign convention ───────────────────────────────────────
# TODO: Confirm with the database team.
# Common Plaid conventions:
#   Option A) Expenses are POSITIVE, income / credits are NEGATIVE.
#   Option B) A separate `transaction_type` column ("debit" / "credit").
#   Option C) A separate `amount` sign per transaction type.
# Set this to True if expenses are stored as positive numbers (most common for Plaid).
EXPENSES_ARE_POSITIVE: bool = True  # TODO: confirm

# ── Accounts / Balance ────────────────────────────────────────────────────────
# TODO: Confirm the accounts table name and balance column with the database team.
# Expected structure: accounts(id, org_id, balance, currency, updated_at)
ACCOUNTS_TABLE:  str = "accounts"   # TODO: confirm
BALANCE_COLUMN:  str = "balance"    # TODO: confirm

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


import os
import io
import re
import json
import base64
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
import httpx
import pdfplumber

load_dotenv()

from supabase import create_client, Client as SupabaseClient

_SUPABASE_URL  = os.getenv("SUPABASE_URL", "")
_SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") 
_SUPABASE_USER = os.getenv("SUPABASE_USER_ID", "")           

_supabase: SupabaseClient | None = (
    create_client(_SUPABASE_URL, _SUPABASE_KEY)
    if _SUPABASE_URL and _SUPABASE_KEY
    else None
)

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o")

ZAPIER_MCP_URL = "https://mcp.zapier.com/api/v1/connect"
TOKENS_FILE    = Path(__file__).parent.parent.parent / ".zapier_tokens.json"


def get_auth_headers() -> dict:
    """Load the OAuth access token saved by zapier_oauth.py."""
    if not TOKENS_FILE.exists():
        raise RuntimeError(
            "No Zapier tokens found.  Authenticate first:\n"
            "  python email_integration/src/zapier_oauth.py"
        )
    tokens = json.loads(TOKENS_FILE.read_text())
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _get_access_token() -> str:
    tokens = json.loads(TOKENS_FILE.read_text())
    return tokens["access_token"]


def _payment_status_to_db(status: str | None) -> str:
    """Map AI payment_status → invoices.status enum (pending / paid / overdue)."""
    if status == "paid":
        return "paid"
    return "pending"


def save_to_supabase(invoices: list[dict]) -> int:
    """
    Upsert invoices into the Supabase `invoices` table.
    Returns the number of rows saved, or 0 if Supabase is not configured.
    """
    if not _supabase:
        print("  [DB] Supabase not configured — skipping DB save")
        print("       Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_USER_ID in .env")
        return 0
    if not _SUPABASE_USER:
        print("  [DB] SUPABASE_USER_ID not set — skipping DB save")
        return 0

    rows = []
    for inv in invoices:
        rows.append({
            "user_id":     _SUPABASE_USER,
            "vendor":      inv.get("vendor_name"),
            "amount":      inv.get("total_amount"),
            "due_date":    inv.get("due_date"),
            "status":      _payment_status_to_db(inv.get("payment_status")),
            "parsed_data": inv,          # full JSON blob
            "source":      "email",
        })

    result = _supabase.table("invoices").insert(rows).execute()
    saved = len(result.data) if result.data else 0
    print(f"  [DB] Saved {saved} invoice(s) to Supabase")
    return saved


OUTPUT_DIR = Path(__file__).parent.parent / "output"
STATE_FILE = Path(__file__).parent.parent / "output" / ".last_pull.json"


def save_last_pull(ts: datetime) -> None:
    """Persist the timestamp of the last successful pull."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps({"last_pull_utc": ts.isoformat()}))


def load_last_pull() -> datetime | None:
    """Return the UTC datetime of the last successful pull, or None."""
    if not STATE_FILE.exists():
        return None
    try:
        data = json.loads(STATE_FILE.read_text())
        return datetime.fromisoformat(data["last_pull_utc"])
    except Exception:
        return None


def gmail_query_since(since: datetime) -> str:
    """Build a Gmail search query for emails received after `since`."""
    return (
        f"subject:(invoice OR bill OR receipt) "
        f"has:attachment filename:pdf "
        f"after:{since.strftime('%Y/%m/%d')}"
    )


def gmail_query_last_n_hours(hours: int = 24) -> str:
    """Build a Gmail search query scoped to the past N hours."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    # Gmail's after: filter accepts YYYY/MM/DD
    return (
        f"subject:(invoice OR bill OR receipt) "
        f"has:attachment filename:pdf "
        f"after:{since.strftime('%Y/%m/%d')}"
    )


# Base64 prefix of any PDF (%PDF- encoded)
_PDF_B64_PREFIX = "JVBERi0"


def _extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using pdfplumber."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages_text = [page.extract_text() or "" for page in pdf.pages]
    extracted = "\n\n".join(pages_text).strip()
    if not extracted:
        return "[PDF detected but no text layer found — scanned/image PDF, OCR required.]"
    return extracted


def extract_text_from_tool_result(raw: str) -> str:
    """
    Post-process a Zapier tool result string:
      1. If it contains a Zapier S3 URL, download the PDF without auth and extract text.
      2. Zapier hydrate URLs (zapier.com/engine/hydrate/...) are inaccessible — skip them.
      3. If it contains raw base64 PDF bytes, decode and extract text.
      4. Otherwise return as-is.
    """
    # Case 1: Zapier uploads attachment to their S3 bucket — fetchable WITHOUT auth
    s3_match = re.search(r'https://zapier(?:-dev)?-files\.s3\.amazonaws\.com/\S+', raw)
    if s3_match:
        pdf_url = s3_match.group(0).rstrip('",}')
        print(f"  [PDF] Fetching S3 URL (no-auth): {pdf_url[:100]}…")
        try:
            resp = httpx.get(pdf_url, timeout=30, follow_redirects=True)  # S3: NO auth header
            print(f"  [PDF] HTTP {resp.status_code} len={len(resp.content)}")
            if resp.status_code == 200 and (resp.content[:4] == b"%PDF" or "pdf" in resp.headers.get("content-type", "")):
                extracted = _extract_text_from_pdf_bytes(resp.content)
                print(f"  [PDF] ✅ Extracted {len(extracted)} chars from PDF")
                return raw + "\n\n[PDF TEXT EXTRACTED]:\n" + extracted
            else:
                print(f"  [PDF] ⚠ Unexpected response: {resp.text[:200]}")
        except Exception as e:
            print(f"  [PDF] S3 fetch error: {e}")
        return raw

    # Case 2: Zapier hydrate URL — these are internal execution-context references
    # that cannot be fetched externally. Skip gracefully.
    if "zapier.com/engine/hydrate" in raw:
        print("  [PDF] Skipping Zapier hydrate URL (not externally accessible)")
        return raw

    # Case 3: raw base64-encoded PDF
    stripped = raw.strip()
    if stripped.startswith(_PDF_B64_PREFIX):
        try:
            pdf_bytes = base64.b64decode(stripped)
            return _extract_text_from_pdf_bytes(pdf_bytes)
        except Exception as e:
            return f"[PDF decode error: {e}]"

    return raw


PARSE_PROMPT = """\
You are an accounts-payable assistant. Extract invoice data from the provided email and PDF content.

For EVERY invoice found, extract:
  - vendor_name
  - invoice_number
  - invoice_date   (ISO-8601)
  - due_date       (ISO-8601, if present)
  - currency       (3-letter code, e.g. "EUR", "USD")
  - total_amount   (numeric, no symbol)
  - line_items     (list of {description, quantity, unit_price, total})
  - payment_status (paid / unpaid / unknown)

Return a JSON array of invoice objects. Nothing else — no markdown, no explanation.
If a field cannot be determined, use null.
"""


async def _collect_email_with_pdfs(session: ClientSession, gmail_query: str) -> list[dict]:
    """
    Phase 1: Directly call gmail_find_email via MCP.
    For each matching email, immediately fetch any S3 PDF URL (no-auth, single-use)
    and inject extracted text into the result.
    Returns a list of email dicts ready for AI parsing.
    """
    print("  Calling gmail_find_email …")
    result = await session.call_tool("gmail_find_email", {
        "instructions": (
            "Find invoice emails with PDF attachments. "
            "Return email metadata with attachment download URLs."
        ),
        "query": gmail_query,
        "output_hint": "body text and the direct download URL of each PDF attachment",
    })

    emails: list[dict] = []
    for block in result.content:
        if not hasattr(block, "text"):
            continue
        try:
            data = json.loads(block.text)
        except json.JSONDecodeError:
            continue

        results = data.get("results", {})
        # Zapier may return a single dict or a list
        if isinstance(results, dict):
            results = [results]

        for email in results:
            for att in email.get("pdf_attachments", []):
                url = att.get("download_url") or att.get("url") or att.get("attachment", "")
                if not url or "s3.amazonaws.com" not in url:
                    continue
                print(f"  [PDF] Fetching (no-auth): {url[:90]}…")
                try:
                    resp = httpx.get(url, timeout=30, follow_redirects=True)
                    print(f"  [PDF] HTTP {resp.status_code} len={len(resp.content)}")
                    if resp.status_code == 200 and resp.content[:4] == b"%PDF":
                        att["pdf_text"] = _extract_text_from_pdf_bytes(resp.content)
                        print(f"  [PDF] ✅ Extracted {len(att['pdf_text'])} chars")
                    elif resp.status_code == 403:
                        print("  [PDF] ⚠ URL already consumed / expired — no PDF text available")
                except Exception as e:
                    print(f"  [PDF] Error: {e}")
            emails.append(email)

    return emails


async def run_agent(since_hours: int = 24, since_dt: datetime | None = None) -> list:
    """
    Pull and parse invoice emails.

    Priority:
      1. since_dt   — pull everything after this exact datetime
      2. since_hours — pull the last N hours (default 24)
    """
    if since_dt is not None:
        query = gmail_query_since(since_dt)
    else:
        query = gmail_query_last_n_hours(since_hours)

    run_ts = datetime.now(timezone.utc)
    print(f"[{run_ts.isoformat()}] Connecting to Zapier MCP …")
    print(f"Gmail query: {query}")

    async with streamablehttp_client(
        url=ZAPIER_MCP_URL,
        headers=get_auth_headers(),
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # ── Phase 1: collect email data + PDF text directly ──────────
            print("\nPhase 1: Collecting email data …")
            emails = await _collect_email_with_pdfs(session, query)

    if not emails:
        print("No matching emails found.")
        save_last_pull(run_ts)
        return []

    # ── Phase 2: parse with AI (no MCP, plain OpenAI call) ──────────────
    print(f"\nPhase 2: Parsing {len(emails)} email(s) with AI …")
    email_context = json.dumps(emails, indent=2)

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system",  "content": PARSE_PROMPT},
            {"role": "user",    "content": f"Extract invoices from these emails:\n\n{email_context}"},
        ],
    )

    content = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    try:
        invoices = json.loads(content.strip())
        if not isinstance(invoices, list):
            invoices = [invoices]
    except json.JSONDecodeError:
        print(f"Model returned non-JSON:\n{content}")
        invoices = []

    print(json.dumps(invoices, indent=2))

    # Persist results — local JSON backup + Supabase
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_file = OUTPUT_DIR / f"invoices_{run_ts.strftime('%Y%m%d_%H%M%S')}.json"
    out_file.write_text(json.dumps(invoices, indent=2))
    print(f"\nSaved {len(invoices)} invoice(s) → {out_file}")
    save_to_supabase(invoices)
    save_last_pull(run_ts)
    return invoices


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Gmail invoice agent")
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--hours",
        type=int,
        default=24,
        metavar="N",
        help="Pull emails from the last N hours (default: 24)",
    )
    group.add_argument(
        "--since-last-pull",
        action="store_true",
        help="Pull emails received since the last successful run",
    )
    args = parser.parse_args()

    if args.since_last_pull:
        last = load_last_pull()
        if last is None:
            print("No previous pull recorded — falling back to last 24 hours.")
            asyncio.run(run_agent(since_hours=24))
        else:
            print(f"Pulling since last run: {last.isoformat()}")
            asyncio.run(run_agent(since_dt=last))
    else:
        asyncio.run(run_agent(since_hours=args.hours))


if __name__ == "__main__":
    main()

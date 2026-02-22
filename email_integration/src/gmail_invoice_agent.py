
import os
import io
import json
import time
import base64
import asyncio
import traceback
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
import pdfplumber

load_dotenv()

ZAPIER_API_KEY  = os.environ["ZAPIER_API_KEY"]
OPENAI_API_KEY  = os.environ["OPENAI_API_KEY"]
OPENAI_MODEL    = os.getenv("OPENAI_MODEL", "gpt-4o")
INGEST_URL      = os.getenv("INGEST_URL", "http://localhost:3000/api/invoices/ingest")
INGEST_USER_ID  = os.getenv("INGEST_USER_ID", "")
ZAPIER_MCP_URL  = os.getenv("ZAPIER_MCP_URL", "https://mcp.zapier.com/api/v1/connect")

OUTPUT_DIR = Path(__file__).parent.parent / "output"


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


def _fetch_zapier_hydrate(url: str) -> str:
    """Fetch a Zapier hydrate URL and return its content as text."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        return f"[Hydrate fetch error: {e}]"


def _pdf_bytes_to_text(pdf_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
        extracted = "\n\n".join(pages_text).strip()
        if not extracted:
            return (
                "[PDF attachment detected but it appears to be a scanned/image PDF. "
                "No text layer found — OCR required to read this document.]"
            )
        return extracted
    except Exception as e:
        return f"[PDF decode error: {e}]"


def extract_text_from_tool_result(raw: str) -> str:
    stripped = raw.strip()

    # Already base64-encoded PDF bytes
    if stripped.startswith(_PDF_B64_PREFIX):
        return _pdf_bytes_to_text(base64.b64decode(stripped))

    # Zapier may return {"results": "https://zapier.com/engine/hydrate/..."} for large payloads
    if "zapier.com/engine/hydrate" in stripped:
        try:
            payload = json.loads(stripped)
            hydrate_url = None
            if isinstance(payload, dict):
                results = payload.get("results", "")
                if isinstance(results, str) and results.startswith("https://"):
                    hydrate_url = results
            if hydrate_url:
                content = _fetch_zapier_hydrate(hydrate_url)
                # Hydrated content may itself be base64 PDF
                content_stripped = content.strip()
                if content_stripped.startswith(_PDF_B64_PREFIX):
                    return _pdf_bytes_to_text(base64.b64decode(content_stripped))
                return content
        except (json.JSONDecodeError, Exception):
            pass

    return raw


SYSTEM_PROMPT_TEMPLATE = """\
You are an accounts-payable assistant.  Your job is:

1. Search the user's Gmail inbox for emails that contain invoices.
   Use the query: {gmail_query}
2. For each result, read the full email (body + metadata).
3. For each email that has a PDF attachment, download and read the attachment.
4. Extract the following fields from every invoice you find:
     - vendor_name
     - invoice_number
     - invoice_date   (ISO-8601)
     - due_date       (ISO-8601, if present)
     - currency       (3-letter code)
     - total_amount   (numeric, no symbol)
     - line_items     (list of {{description, quantity, unit_price, total}})
     - payment_status (paid / unpaid / unknown)
5. Return a JSON array of invoice objects.  Nothing else.

If a field cannot be determined, use null.
"""


def _extract_json_array(text: str) -> str:
    """Pull the first valid JSON array out of a block of prose/markdown text."""
    import re
    # Strip markdown code fences: ```json ... ``` or ``` ... ```
    fenced = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if fenced:
        return fenced.group(1)
    # Fall back: find the first '[' that starts an object array
    for i, ch in enumerate(text):
        if ch == "[":
            end = text.rfind("]")
            if end > i:
                candidate = text[i:end + 1]
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, list):
                        return candidate
                except (json.JSONDecodeError, ValueError):
                    pass
    return ""


async def run_agent(since_hours: int = 24) -> list:
    query = gmail_query_last_n_hours(since_hours)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(gmail_query=query)
    run_ts = datetime.now(timezone.utc)
    print(f"[{run_ts.isoformat()}] Connecting to Zapier MCP …")
    print(f"Gmail query: {query}")

    async with streamablehttp_client(
        ZAPIER_MCP_URL, headers={"Authorization": f"Bearer {ZAPIER_API_KEY}"}
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools_response = await session.list_tools()
            tools = tools_response.tools
            print(f"Available Zapier tools ({len(tools)}):")
            for t in tools:
                print(f"  • {t.name}: {t.description[:80]}")

            # Convert MCP tool schemas → OpenAI function-calling format
            openai_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.inputSchema,
                    },
                }
                for t in tools
            ]

            client   = OpenAI(api_key=OPENAI_API_KEY)
            messages = [
                {"role": "system",  "content": system_prompt},
                {"role": "user",    "content": "Please find and parse all invoice emails in my Gmail inbox."},
            ]

            print("\nStarting agent loop …\n")

            while True:
                response = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto",
                )

                choice  = response.choices[0]
                message = choice.message

                # ── Serialize message back to a plain dict for openai v2 compatibility ──
                # Appending the raw Pydantic object causes serialization errors in v2.
                msg_dict: dict = {"role": message.role, "content": message.content}
                if message.tool_calls:
                    msg_dict["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ]
                messages.append(msg_dict)

                if not message.tool_calls:
                    print("=== Agent final answer ===")
                    content = message.content or ""
                    invoices = []
                    # Try direct parse first, then extract JSON array embedded in prose
                    for candidate in [content, _extract_json_array(content)]:
                        try:
                            parsed = json.loads(candidate)
                            if isinstance(parsed, list):
                                invoices = parsed
                                break
                        except (json.JSONDecodeError, TypeError):
                            pass
                    print(json.dumps(invoices, indent=2) if invoices else content)

                    # Persist results
                    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                    out_file = OUTPUT_DIR / f"invoices_{run_ts.strftime('%Y%m%d_%H%M%S')}.json"
                    out_file.write_text(json.dumps(invoices, indent=2))
                    print(f"Saved {len(invoices)} invoice(s) → {out_file}")
                    return invoices

                # ── Execute every tool call via MCP ────────────────────────
                for tc in message.tool_calls:
                    fn_name = tc.function.name
                    raw_args = tc.function.arguments
                    fn_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args

                    print(f"→ Calling tool: {fn_name}")
                    print(f"  args: {json.dumps(fn_args, indent=2)}")

                    try:
                        result = await session.call_tool(fn_name, fn_args)
                    except Exception as tool_err:
                        print(f"  ✗ Tool error: {tool_err}")
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": f"Error calling {fn_name}: {tool_err}",
                        })
                        continue

                    # MCP 1.x content blocks — handle both object (.text) and dict ["text"] forms
                    def _block_text(block) -> str:
                        if hasattr(block, "text"):
                            return block.text
                        if isinstance(block, dict):
                            return block.get("text", "")
                        return str(block)

                    tool_output = "\n".join(
                        extract_text_from_tool_result(_block_text(block))
                        for block in result.content
                    )

                    print(f"  result (truncated): {tool_output[:300]}\n")

                    messages.append({
                        "role":         "tool",
                        "tool_call_id": tc.id,
                        "content":      tool_output,
                    })


def post_to_ingest(invoices: list) -> bool:
    """POST parsed invoices to the Next.js ingest endpoint and update the dashboard."""
    if not INGEST_USER_ID:
        print("[HELM] INGEST_USER_ID not set — skipping dashboard push.")
        return False
    if not invoices:
        return False

    payload = json.dumps({"user_id": INGEST_USER_ID, "invoices": invoices}).encode()
    req = urllib.request.Request(
        INGEST_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read())
            count = body.get("inserted", 0)
            print(f"[HELM] Dashboard updated — {count} invoice(s) added to approval queue.")
            return True
    except Exception as e:
        print(f"[HELM] Warning: could not reach ingest endpoint ({e}). Invoice saved locally only.")
        return False


async def watch_inbox(duration_seconds: int = 300, poll_interval: int = 5):
    """
    Poll Gmail every poll_interval seconds for up to duration_seconds.

    Once started, send an email with a PDF invoice attachment and the dashboard
    will update automatically within one polling cycle (~5s + agent parse time).

    Deduplication: invoices are tracked by (vendor_name, invoice_number) so the
    same email is never posted twice even across multiple polling iterations.
    """
    seen: set[str] = set()
    deadline = time.monotonic() + duration_seconds
    iteration = 0

    mins = duration_seconds // 60
    secs = duration_seconds % 60
    print(f"\n[HELM] Inbox watch started — running for {mins}m {secs}s")
    print(f"[HELM] Polling every {poll_interval}s after each agent cycle completes.")
    print(f"[HELM] Send an invoice email now — the dashboard will update automatically.\n")

    while time.monotonic() < deadline:
        iteration += 1
        remaining = int(deadline - time.monotonic())
        print(f"── Poll #{iteration} ({remaining}s remaining) ──────────────────────")

        try:
            invoices = await run_agent(since_hours=2)
        except Exception as e:
            print(f"[Poll #{iteration}] Agent error: {e}")
            traceback.print_exc()
            await asyncio.sleep(poll_interval)
            continue

        new_invoices = []
        for inv in invoices:
            key = "{}|{}".format(
                inv.get("vendor_name", "").lower().strip(),
                inv.get("invoice_number") or inv.get("invoice_date") or "",
            )
            if key not in seen:
                seen.add(key)
                new_invoices.append(inv)

        if new_invoices:
            vendors = [i.get("vendor_name", "unknown") for i in new_invoices]
            print(f"[HELM] New invoice(s) detected: {vendors}")
            post_to_ingest(new_invoices)
        else:
            print(f"[Poll #{iteration}] No new invoices.")

        remaining = int(deadline - time.monotonic())
        if remaining > 0:
            sleep_for = min(poll_interval, remaining)
            print(f"[Poll #{iteration}] Next check in {sleep_for}s…\n")
            await asyncio.sleep(sleep_for)

    print(f"\n[HELM] Watch window closed after {duration_seconds}s.")


def main(since_hours: int = 24):
    asyncio.run(run_agent(since_hours=since_hours))


def main_watch(duration: int = 300, interval: int = 5):
    asyncio.run(watch_inbox(duration_seconds=duration, poll_interval=interval))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Gmail invoice agent")
    subparsers = parser.add_subparsers(dest="command")

    # Default: single run
    run_parser = subparsers.add_parser("run", help="Single scan (default)")
    run_parser.add_argument("--hours", type=int, default=24,
                            help="Look back this many hours (default: 24)")

    # Watch mode: continuous polling
    watch_parser = subparsers.add_parser("watch", help="Poll inbox continuously")
    watch_parser.add_argument("--duration", type=int, default=300,
                              help="Watch window in seconds (default: 300 = 5 min)")
    watch_parser.add_argument("--interval", type=int, default=5,
                              help="Pause between polls in seconds (default: 5)")

    args = parser.parse_args()

    if args.command == "watch":
        main_watch(duration=args.duration, interval=args.interval)
    else:
        hours = getattr(args, "hours", 24)
        main(since_hours=hours)

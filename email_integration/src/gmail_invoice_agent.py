
import os
import io
import json
import base64
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from mcp import ClientSession
from mcp.client.sse import sse_client
import pdfplumber

load_dotenv()

ZAPIER_API_KEY = os.environ["ZAPIER_API_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o")

ZAPIER_MCP_URL = f"https://actions.zapier.com/mcp/{ZAPIER_API_KEY}/sse"

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


def extract_text_from_tool_result(raw: str) -> str:
    stripped = raw.strip()

    if stripped.startswith(_PDF_B64_PREFIX):
        try:
            pdf_bytes = base64.b64decode(stripped)
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
     - line_items     (list of {description, quantity, unit_price, total})
     - payment_status (paid / unpaid / unknown)
5. Return a JSON array of invoice objects.  Nothing else.

If a field cannot be determined, use null.
"""


async def run_agent(since_hours: int = 24) -> list:
    query = gmail_query_last_n_hours(since_hours)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(gmail_query=query)
    run_ts = datetime.now(timezone.utc)
    print(f"[{run_ts.isoformat()}] Connecting to Zapier MCP …")
    print(f"Gmail query: {query}")

    async with sse_client(url=ZAPIER_MCP_URL) as (read, write):
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
                messages.append(message)

                if not message.tool_calls:
                    print("=== Agent final answer ===")
                    try:
                        invoices = json.loads(message.content)
                        print(json.dumps(invoices, indent=2))
                    except json.JSONDecodeError:
                        invoices = []
                        print(message.content)

                    # Persist results
                    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                    out_file = OUTPUT_DIR / f"invoices_{run_ts.strftime('%Y%m%d_%H%M%S')}.json"
                    out_file.write_text(json.dumps(invoices, indent=2))
                    print(f"Saved {len(invoices)} invoice(s) → {out_file}")
                    return invoices

                # ── Execute every tool call via MCP ────────────────────────
                for tc in message.tool_calls:
                    fn_name = tc.function.name
                    fn_args = json.loads(tc.function.arguments)

                    print(f"→ Calling tool: {fn_name}")
                    print(f"  args: {json.dumps(fn_args, indent=2)}")

                    result = await session.call_tool(fn_name, fn_args)

                    # MCP returns a list of content blocks; join text ones
                    tool_output = "\n".join(
                        extract_text_from_tool_result(block.text)
                        for block in result.content
                        if hasattr(block, "text")
                    )

                    print(f"  result (truncated): {tool_output[:300]}\n")

                    messages.append({
                        "role":         "tool",
                        "tool_call_id": tc.id,
                        "content":      tool_output,
                    })


def main(since_hours: int = 24):
    asyncio.run(run_agent(since_hours=since_hours))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Gmail invoice agent")
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Look back this many hours for invoice emails (default: 24)",
    )
    args = parser.parse_args()
    main(since_hours=args.hours)

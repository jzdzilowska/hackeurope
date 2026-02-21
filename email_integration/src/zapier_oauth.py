import asyncio
import base64
import hashlib
import json
import os
import secrets
import socket
import threading
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

ZAPIER_AUTH_URL  = "https://mcp.zapier.com/authorize"
ZAPIER_TOKEN_URL = "https://mcp.zapier.com/token"
ZAPIER_REG_URL   = "https://mcp.zapier.com/register"
REDIRECT_URI     = "http://localhost:9999/callback"  
TOKENS_FILE  = Path(__file__).parent.parent.parent / ".zapier_tokens.json"
CLIENT_FILE  = Path(__file__).parent.parent.parent / ".zapier_client.json"

SCOPES = "profile email"


# ── Dynamic client registration ───────────────────────────────────────────────

def get_or_register_client() -> dict:
    """Register a public OAuth client with Zapier (once) and cache it."""
    if CLIENT_FILE.exists():
        return json.loads(CLIENT_FILE.read_text())

    print("Registering OAuth client with Zapier (one-time)…")
    resp = httpx.post(ZAPIER_REG_URL, json={
        "client_name":   "hackeurope-invoice-agent",
        "redirect_uris": [REDIRECT_URI],
        "grant_types":   ["authorization_code", "refresh_token"],
        "token_endpoint_auth_method": "none",  
    })
    resp.raise_for_status()
    data = resp.json()
    CLIENT_FILE.write_text(json.dumps(data, indent=2))
    print(f"Client registered: {data.get('client_id')}")
    return data


# ── PKCE helpers ──────────────────────────────────────────────────────────────

def pkce_pair() -> tuple[str, str]:
    verifier  = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


# ── Token persistence ─────────────────────────────────────────────────────────

def save_tokens(tokens: dict) -> None:
    TOKENS_FILE.write_text(json.dumps(tokens, indent=2))
    print(f"Tokens saved to {TOKENS_FILE}")
    env_file = Path(__file__).parent.parent.parent / ".env"
    if env_file.exists():
        lines = env_file.read_text().splitlines()
        key = "ZAPIER_ACCESS_TOKEN"
        new_line = f"{key}={tokens['access_token']}"
        updated = [l for l in lines if not l.startswith(f"{key}=")]
        updated.append(new_line)
        env_file.write_text("\n".join(updated) + "\n")


def load_tokens() -> dict | None:
    if not TOKENS_FILE.exists():
        return None
    return json.loads(TOKENS_FILE.read_text())


# ── Refresh ───────────────────────────────────────────────────────────────────

def refresh_access_token(client_id: str) -> dict:
    tokens = load_tokens()
    if not tokens or "refresh_token" not in tokens:
        raise RuntimeError("No refresh token available — run zapier_oauth.py again.")

    resp = httpx.post(ZAPIER_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": tokens["refresh_token"],
        "client_id":     client_id,
    })
    resp.raise_for_status()
    new_tokens = {**tokens, **resp.json()}
    save_tokens(new_tokens)
    return new_tokens


# ── Local callback server ─────────────────────────────────────────────────────

class _CallbackHandler(BaseHTTPRequestHandler):
    captured_url = None

    def do_GET(self):
        _CallbackHandler.captured_url = f"http://localhost:9999{self.path}"
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"""
            <html><body style="font-family:sans-serif;padding:2em">
            <h2>&#10003; Authenticated!</h2>
            <p>You can close this tab and return to the terminal.</p>
            </body></html>
        """)

    def log_message(self, *args):
        pass  # silence request logs


def _wait_for_callback() -> str:
    server = HTTPServer(("localhost", 9999), _CallbackHandler)
    server.timeout = 120
    print("Waiting for Zapier to redirect back (up to 2 minutes)…")
    while _CallbackHandler.captured_url is None:
        server.handle_request()
    server.server_close()
    return _CallbackHandler.captured_url


# ── Main authorization flow ───────────────────────────────────────────────────

def run_auth_flow() -> None:
    client   = get_or_register_client()
    client_id = client["client_id"]

    verifier, challenge = pkce_pair()
    state = secrets.token_urlsafe(16)

    params = {
        "response_type":         "code",
        "client_id":             client_id,
        "redirect_uri":          REDIRECT_URI,
        "scope":                 SCOPES,
        "state":                 state,
        "code_challenge":        challenge,
        "code_challenge_method": "S256",
    }

    auth_url = ZAPIER_AUTH_URL + "?" + urllib.parse.urlencode(params)
    print(f"\nOpening browser to Zapier…\n")
    webbrowser.open(auth_url)

    redirect_url = _wait_for_callback()
    print(f"\nCallback received.")

    parsed = urllib.parse.urlparse(redirect_url)
    qs     = urllib.parse.parse_qs(parsed.query)

    if "error" in qs:
        raise RuntimeError(f"OAuth error: {qs['error']}")
    if qs.get("state", [None])[0] != state:
        raise RuntimeError("State mismatch — possible CSRF")

    code = qs["code"][0]
    print("Exchanging code for tokens…")

    resp = httpx.post(ZAPIER_TOKEN_URL, data={
        "grant_type":    "authorization_code",
        "code":          code,
        "redirect_uri":  REDIRECT_URI,
        "client_id":     client_id,
        "code_verifier": verifier,
    })
    resp.raise_for_status()
    tokens = resp.json()
    save_tokens({**tokens, "client_id": client_id})
    print("\n✅ Authentication successful!  You can now run the agent.")


if __name__ == "__main__":
    existing = load_tokens()
    if existing:
        print("Tokens already exist.  Delete .zapier_tokens.json to re-authenticate.")
    else:
        run_auth_flow()

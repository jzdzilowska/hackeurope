#!/bin/bash
# run_invoice_agent.sh
# Wrapper script called by launchd.  Activates the venv and runs the agent.
# launchd does not source shell profiles, so paths must be explicit.

set -euo pipefail

REPO="/Users/gretasikora/code/hackeurope"
VENV="$REPO/.venv"
SCRIPT="$REPO/email_integration/src/gmail_invoice_agent.py"
LOG_DIR="$REPO/email_integration/logs"

mkdir -p "$LOG_DIR"

# Load secrets from .env (launchd doesn't read .env automatically)
set -a
# shellcheck source=/dev/null
source "$REPO/.env"
set +a

exec "$VENV/bin/python" "$SCRIPT" --hours 24 \
    >> "$LOG_DIR/invoice_agent.log" 2>&1

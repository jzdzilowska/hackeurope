"""
scheduler.py
============
Runs the Gmail invoice agent every day at 08:00 local time using APScheduler.
This is the Python-side scheduler — keep this process running (e.g. in a
screen/tmux session, or managed by launchd via the plist in email_integration/launchd/).

Usage:
    python email_integration/src/scheduler.py

The timezone defaults to your local machine time.  Override with:
    SCHEDULER_TIMEZONE=Europe/Warsaw python email_integration/src/scheduler.py
"""

import asyncio
import logging
import os
from dotenv import load_dotenv
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from gmail_invoice_agent import run_agent

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

TIMEZONE = os.getenv("SCHEDULER_TIMEZONE", "local")


def job():
    log.info("Starting daily invoice pull (last 24 hours) …")
    try:
        invoices = asyncio.run(run_agent(since_hours=24))
        log.info("Done — %d invoice(s) found.", len(invoices))
    except Exception:
        log.exception("Invoice agent failed")


if __name__ == "__main__":
    scheduler = BlockingScheduler(timezone=TIMEZONE)
    scheduler.add_job(
        job,
        trigger=CronTrigger(hour=8, minute=0, timezone=TIMEZONE),
        name="daily_invoice_pull",
        misfire_grace_time=60 * 10,  # allow up to 10 min late start (e.g. after wake)
    )

    log.info("Scheduler started — invoice agent will run daily at 08:00 (%s).", TIMEZONE)
    log.info("Press Ctrl+C to stop.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped.")

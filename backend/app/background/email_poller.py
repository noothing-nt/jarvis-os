# backend/app/background/email_poller.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — APScheduler Email Polling Background Worker
#
#  Uses AsyncIOScheduler to run the IMAP poll job on an interval.
#  Integrates with the FastAPI lifespan — starts on app boot,
#  shuts down cleanly when the app stops.
#
#  Flow:
#    App startup
#      → start_email_poller() called in lifespan
#        → AsyncIOScheduler created
#          → _poll_job() runs every EMAIL_POLL_INTERVAL_MINUTES
#            → IMAPEmailService.poll_all_accounts()
#              → AI summarize each email
#                → Save to Supabase
# ══════════════════════════════════════════════════════════════

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval  import IntervalTrigger
from apscheduler.events             import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from app.core.config import settings

logger = logging.getLogger("jarvis-os.email_poller")

# ── Scheduler singleton ───────────────────────────────────────
_scheduler: Optional[AsyncIOScheduler] = None

# ── Poll metadata — shared state for /comms/stats ────────────
_poll_state = {
    "last_polled_at":   None,
    "last_result":      None,
    "is_polling":       False,
    "total_polls":      0,
    "total_new_emails": 0,
}


def get_poll_state() -> dict:
    """Returns the current poller state dict. Used by /comms/stats."""
    return _poll_state.copy()


# ──────────────────────────────────────────────────────────────
# CORE POLL JOB — Runs on every scheduler tick
# ──────────────────────────────────────────────────────────────
async def _poll_job():
    """
    The actual job function executed by APScheduler.
    Fetches the user list from Supabase and polls emails for each.
    """
    global _poll_state

    if _poll_state["is_polling"]:
        logger.warning("⏭️  Poll job skipped — previous poll still running")
        return

    _poll_state["is_polling"] = True
    start_time = datetime.now(timezone.utc)

    logger.info(
        f"⏰ Email poll started at "
        f"{start_time.strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )

    try:
        # ── Lazy-import to avoid circular deps ───────────────
        from app.core.database        import get_supabase
        from app.services.ai_service  import get_ai_service
        from app.services.email_service import get_email_service

        db  = get_supabase()
        ai  = get_ai_service()

        # ── Get all user IDs from profiles ───────────────────
        # In a multi-user setup, poll for all users.
        # For single-user (personal dashboard), this returns 1 row.
        try:
            users_result = db.table("profiles").select("id").execute()
            user_ids     = [row["id"] for row in (users_result.data or [])]
        except Exception as e:
            logger.error(f"💥 Failed to fetch user list: {e}")
            return

        if not user_ids:
            logger.info("📭 No users found — skipping email poll")
            return

        # ── Initialize email service ──────────────────────────
        email_service = get_email_service(db=db, ai=ai)

        total_new = 0
        all_errors = []

        # ── Poll for each user ────────────────────────────────
        for user_id in user_ids:
            try:
                result   = await email_service.poll_all_accounts(
                    user_id=user_id
                )
                total_new += result.get("new_emails_found", 0)
                all_errors.extend(result.get("errors", []))

            except Exception as e:
                error_msg = f"Poll failed for user {user_id}: {e}"
                logger.error(f"💥 {error_msg}")
                all_errors.append(error_msg)

        # ── Update poll state ─────────────────────────────────
        _poll_state["last_polled_at"]   = datetime.now(timezone.utc)
        _poll_state["last_result"]      = {
            "new_emails":  total_new,
            "errors":      all_errors,
        }
        _poll_state["total_polls"]      += 1
        _poll_state["total_new_emails"] += total_new

        duration_s = (datetime.now(timezone.utc) - start_time).total_seconds()

        if all_errors:
            logger.warning(
                f"⚠️  Poll completed with {len(all_errors)} error(s): "
                f"{total_new} new emails | {duration_s:.1f}s"
            )
        else:
            logger.info(
                f"✅ Poll complete: {total_new} new email(s) | "
                f"{duration_s:.1f}s | "
                f"Total polls: {_poll_state['total_polls']}"
            )

    except Exception as e:
        logger.error(f"💥 Unexpected poll job error: {type(e).__name__}: {e}")

    finally:
        _poll_state["is_polling"] = False


# ──────────────────────────────────────────────────────────────
# SCHEDULER EVENT LISTENERS
# ──────────────────────────────────────────────────────────────
def _on_job_executed(event):
    """Log when scheduler job completes successfully."""
    logger.debug(f"📅 Scheduler: job '{event.job_id}' executed")


def _on_job_error(event):
    """Log scheduler-level errors (different from poll errors)."""
    logger.error(
        f"💥 Scheduler error in job '{event.job_id}': "
        f"{event.exception}"
    )


# ──────────────────────────────────────────────────────────────
# PUBLIC: START POLLER — Called from main.py lifespan
# ──────────────────────────────────────────────────────────────
async def start_email_poller():
    """
    Starts the APScheduler email polling background job.
    Call this from FastAPI's lifespan startup section.

    The job runs immediately on start (run_immediately=True in config),
    then on the configured interval thereafter.
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning("⚠️  Email poller already running — skipping start")
        return

    interval_minutes = settings.EMAIL_POLL_INTERVAL_MINUTES

    _scheduler = AsyncIOScheduler(
        timezone="UTC",
        job_defaults={
            "coalesce":       True,   # Merge missed jobs (e.g. after sleep)
            "max_instances":  1,      # Only 1 instance of poll_job at a time
            "misfire_grace_time": 60, # Tolerate 60s late execution
        },
    )

    # ── Register event listeners ──────────────────────────────
    _scheduler.add_listener(_on_job_executed, EVENT_JOB_EXECUTED)
    _scheduler.add_listener(_on_job_error,    EVENT_JOB_ERROR)

    # ── Add the poll job ──────────────────────────────────────
    _scheduler.add_job(
        func=_poll_job,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="email_poll_job",
        name=f"JARVIS Email Poller (every {interval_minutes} min)",
        replace_existing=True,
    )

    # ── Start the scheduler ───────────────────────────────────
    _scheduler.start()

    logger.info(
        f"✅ Email poller started — "
        f"interval: every {interval_minutes} minute(s)"
    )

    # ── Run first poll immediately on startup ─────────────────
    # Don't wait interval_minutes for first data
    logger.info("⚡ Running initial email poll on startup...")
    asyncio.create_task(_poll_job())


# ──────────────────────────────────────────────────────────────
# PUBLIC: STOP POLLER — Called from main.py lifespan shutdown
# ──────────────────────────────────────────────────────────────
async def stop_email_poller():
    """
    Gracefully shuts down the APScheduler.
    Call from FastAPI lifespan shutdown section.
    """
    global _scheduler

    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("✅ Email poller stopped gracefully")
    else:
        logger.debug("Email poller was not running — nothing to stop")


# ──────────────────────────────────────────────────────────────
# PUBLIC: MANUAL TRIGGER — Called by POST /comms/refresh
# ──────────────────────────────────────────────────────────────
async def trigger_manual_poll(user_id: str) -> dict:
    """
    Manually triggers one poll cycle for a specific user.
    Used by the frontend "Refresh" button.

    Returns the poll result dict.
    """
    from app.core.database          import get_supabase
    from app.services.ai_service    import get_ai_service
    from app.services.email_service import get_email_service

    if _poll_state["is_polling"]:
        return {
            "accounts_polled":   0,
            "new_emails_found":  0,
            "emails_summarized": 0,
            "errors":            ["A poll is already in progress. Please wait."],
        }

    db            = get_supabase()
    ai            = get_ai_service()
    email_service = get_email_service(db=db, ai=ai)

    logger.info(f"🔄 Manual poll triggered by user {user_id}")

    _poll_state["is_polling"] = True
    start_time = datetime.now(timezone.utc)

    try:
        result = await email_service.poll_all_accounts(user_id=user_id)

        _poll_state["last_polled_at"]   = datetime.now(timezone.utc)
        _poll_state["last_result"]      = result
        _poll_state["total_polls"]      += 1
        _poll_state["total_new_emails"] += result.get("new_emails_found", 0)

        duration_ms = (
            datetime.now(timezone.utc) - start_time
        ).total_seconds() * 1000

        result["duration_ms"] = round(duration_ms, 2)

        logger.info(
            f"✅ Manual poll done: "
            f"{result.get('new_emails_found', 0)} new | "
            f"{duration_ms:.0f}ms"
        )
        return result

    finally:
        _poll_state["is_polling"] = False

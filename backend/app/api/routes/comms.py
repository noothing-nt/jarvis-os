# backend/app/api/routes/comms.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Unified Comms API Routes (Phase 4)
#
#  Endpoints:
#    GET   /api/v1/comms/emails           → List emails (filtered)
#    GET   /api/v1/comms/emails/{id}      → Get one + mark read
#    PATCH /api/v1/comms/emails/{id}      → Toggle flags
#    GET   /api/v1/comms/stats            → Unread counts + summary
#    POST  /api/v1/comms/refresh          → Manual poll trigger
#    DELETE /api/v1/comms/emails/{id}     → Delete one email record
#    POST  /api/v1/comms/emails/{id}/summarize → Re-summarize with AI
# ══════════════════════════════════════════════════════════════

import logging
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.database    import get_supabase
from app.core.security    import get_current_user
from app.core.dependencies import (
    PaginationParams,
    verify_ownership,
    handle_db_error,
)
from app.services.ai_service import AIService, get_ai_service
from app.background.email_poller import (
    trigger_manual_poll,
    get_poll_state,
)
from app.schemas.comms import (
    EmailSummaryResponse,
    EmailListResponse,
    EmailUpdateRequest,
    CommsStatsResponse,
    AccountStats,
    RefreshResponse,
)

logger = logging.getLogger("jarvis-os.routes.comms")

router = APIRouter()


# ══════════════════════════════════════════════════════════════
# LIST EMAILS — GET /api/v1/comms/emails
# ══════════════════════════════════════════════════════════════
@router.get(
    "/emails",
    response_model=EmailListResponse,
    summary="List AI-summarized emails",
    description=(
        "Returns paginated, filtered email summaries. "
        "Filter by account, read status, starred, or action hint. "
        "Sorted by received_at descending (newest first) by default."
    ),
)
async def list_emails(
    # ── Filters ───────────────────────────────────────────────
    account:     Optional[str]  = Query(
        None,
        description="Filter by account label: personal | college | work"
    ),
    unread_only: bool           = Query(
        default=False,
        description="True = show only unread emails"
    ),
    starred:     Optional[bool] = Query(
        None,
        description="Filter starred emails"
    ),
    actioned:    Optional[bool] = Query(
        None,
        description="Filter actioned emails"
    ),
    action_hint: Optional[str]  = Query(
        None,
        description="Filter by AI action hint: 'Reply needed' | 'FYI only' | etc."
    ),
    search:      Optional[str]  = Query(
        None,
        min_length=2,
        description="Search in subject or sender_email"
    ),

    # ── Sorting ───────────────────────────────────────────────
    sort_by:   str  = Query(
        default="received_at",
        description="Sort by: received_at | created_at"
    ),
    sort_desc: bool = Query(
        default=True,
        description="True = newest first"
    ),

    # ── Deps ──────────────────────────────────────────────────
    pagination:   PaginationParams = Depends(),
    current_user: dict             = Depends(get_current_user),
    db:           Client           = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        query = (
            db.table("email_summaries")
            .select("*", count="exact")
            .eq("user_id", user_id)
        )

        # ── Apply filters ─────────────────────────────────────
        if account:
            query = query.eq("account_label", account)
        if unread_only:
            query = query.eq("is_read", False)
        if starred is not None:
            query = query.eq("is_starred", starred)
        if actioned is not None:
            query = query.eq("is_actioned", actioned)
        if action_hint:
            query = query.eq("ai_action_hint", action_hint)
        if search:
            query = query.or_(
                f"subject.ilike.%{search}%,"
                f"sender_email.ilike.%{search}%,"
                f"sender_name.ilike.%{search}%"
            )

        # ── Sorting ───────────────────────────────────────────
        valid_sorts = {"received_at", "created_at"}
        sort_field  = sort_by if sort_by in valid_sorts else "received_at"
        query       = query.order(sort_field, desc=sort_desc)

        # ── Pagination ────────────────────────────────────────
        query = query.range(
            pagination.offset,
            pagination.offset + pagination.per_page - 1
        )

        result      = query.execute()
        total_count = result.count or 0
        total_pages = max(1, -(-total_count // pagination.per_page))

        # ── Get total unread for badge ────────────────────────
        unread_result = (
            db.table("email_summaries")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        unread_count = unread_result.count or 0

        return EmailListResponse(
            data=[EmailSummaryResponse(**e) for e in (result.data or [])],
            count=total_count,
            page=pagination.page,
            per_page=pagination.per_page,
            total_pages=total_pages,
            unread_count=unread_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "listing emails")


# ══════════════════════════════════════════════════════════════
# COMMS STATS — GET /api/v1/comms/stats
# MUST be defined before /{email_id} to avoid UUID parse error
# ══════════════════════════════════════════════════════════════
@router.get(
    "/stats",
    response_model=CommsStatsResponse,
    summary="Get email inbox statistics",
    description=(
        "Returns total/unread/starred counts per account, "
        "action hint breakdown, and last poll timestamp. "
        "Used for the HUD top-bar notification badge."
    ),
)
async def get_comms_stats(
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # ── Fetch all emails for stats (no pagination) ────────
        result = (
            db.table("email_summaries")
            .select(
                "account_label, account_email, "
                "is_read, is_starred, is_actioned, ai_action_hint"
            )
            .eq("user_id", user_id)
            .execute()
        )
        emails = result.data or []

        if not emails:
            poll_state = get_poll_state()
            return CommsStatsResponse(
                total_emails=0,
                total_unread=0,
                total_starred=0,
                total_needs_action=0,
                by_account=[],
                by_action_hint={},
                last_polled_at=poll_state.get("last_polled_at"),
            )

        # ── Aggregate stats ───────────────────────────────────
        from collections import Counter, defaultdict

        total_unread       = sum(1 for e in emails if not e.get("is_read"))
        total_starred      = sum(1 for e in emails if e.get("is_starred"))
        total_needs_action = sum(
            1 for e in emails
            if e.get("ai_action_hint") in (
                "Reply needed", "Action required", "Deadline alert"
            )
        )

        # ── Build per-account stats ───────────────────────────
        account_map = defaultdict(lambda: {
            "total": 0, "unread": 0, "starred": 0,
            "actioned": 0, "needs_reply": 0, "email": ""
        })

        action_hint_counter = Counter()

        for email in emails:
            label = email.get("account_label", "unknown")
            account_map[label]["total"]     += 1
            account_map[label]["email"]      = email.get("account_email", "")
            if not email.get("is_read"):
                account_map[label]["unread"]     += 1
            if email.get("is_starred"):
                account_map[label]["starred"]    += 1
            if email.get("is_actioned"):
                account_map[label]["actioned"]   += 1
            if email.get("ai_action_hint") == "Reply needed":
                account_map[label]["needs_reply"] += 1

            hint = email.get("ai_action_hint")
            if hint:
                action_hint_counter[hint] += 1

        by_account = [
            AccountStats(
                label=label,
                email=stats["email"],
                total=stats["total"],
                unread=stats["unread"],
                starred=stats["starred"],
                actioned=stats["actioned"],
                needs_reply=stats["needs_reply"],
            )
            for label, stats in account_map.items()
        ]

        poll_state = get_poll_state()

        return CommsStatsResponse(
            total_emails=len(emails),
            total_unread=total_unread,
            total_starred=total_starred,
            total_needs_action=total_needs_action,
            by_account=by_account,
            by_action_hint=dict(action_hint_counter),
            last_polled_at=poll_state.get("last_polled_at"),
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching comms stats")


# ══════════════════════════════════════════════════════════════
# MANUAL REFRESH — POST /api/v1/comms/refresh
# ══════════════════════════════════════════════════════════════
@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Manually trigger an email poll",
    description=(
        "Triggers an immediate IMAP poll across all configured accounts. "
        "New emails are AI-summarized and saved to the database. "
        "Returns poll results including counts and any errors."
    ),
)
async def refresh_emails(
    current_user: dict = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    user_id    = current_user["id"]
    start_time = time.perf_counter()

    logger.info(f"🔄 Manual email refresh triggered by user {user_id}")

    try:
        result = await trigger_manual_poll(user_id=user_id)

        duration_ms = (time.perf_counter() - start_time) * 1000
        new_found   = result.get("new_emails_found", 0)
        summarized  = result.get("emails_summarized", new_found)
        errors      = result.get("errors", [])

        return RefreshResponse(
            triggered=True,
            accounts_polled=result.get("accounts_polled", 0),
            new_emails_found=new_found,
            emails_summarized=summarized,
            errors=errors,
            duration_ms=round(duration_ms, 2),
            message=(
                f"✅ Poll complete! {new_found} new email(s) found "
                f"and summarized by JARVIS."
                if not errors else
                f"⚠️ Poll completed with {len(errors)} error(s). "
                f"{new_found} new email(s) processed."
            ),
        )

    except Exception as e:
        logger.error(f"💥 Manual refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Email refresh failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# GET ONE EMAIL — GET /api/v1/comms/emails/{email_id}
# ══════════════════════════════════════════════════════════════
@router.get(
    "/emails/{email_id}",
    response_model=EmailSummaryResponse,
    summary="Get a single email summary",
    description="Fetches one email record and automatically marks it as read.",
)
async def get_email(
    email_id:     UUID,
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("email_summaries")
            .select("*")
            .eq("id", str(email_id))
            .eq("user_id", user_id)
            .execute()
        )
        email = verify_ownership(result.data, "Email")

        # ── Auto-mark as read on open ─────────────────────────
        if not email.get("is_read"):
            try:
                db.table("email_summaries").update({
                    "is_read": True
                }).eq("id", str(email_id)).eq("user_id", user_id).execute()
                email["is_read"] = True
                logger.debug(f"📖 Email {email_id} marked as read")
            except Exception as e:
                logger.warning(f"⚠️  Failed to mark email as read: {e}")

        return EmailSummaryResponse(**email)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching email")


# ══════════════════════════════════════════════════════════════
# UPDATE EMAIL FLAGS — PATCH /api/v1/comms/emails/{email_id}
# ══════════════════════════════════════════════════════════════
@router.patch(
    "/emails/{email_id}",
    response_model=EmailSummaryResponse,
    summary="Update email flags (read, starred, actioned)",
)
async def update_email_flags(
    email_id:     UUID,
    payload:      EmailUpdateRequest,
    current_user: dict               = Depends(get_current_user),
    db:           Client             = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("email_summaries")
            .select("id, subject")
            .eq("id", str(email_id))
            .eq("user_id", user_id)
            .execute()
        )
        verify_ownership(existing.data, "Email")

        update_data = payload.to_db_dict()
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No flags provided for update."
            )

        result = (
            db.table("email_summaries")
            .update(update_data)
            .eq("id", str(email_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Email")
        logger.debug(f"✏️  Email flags updated: {email_id} → {update_data}")
        return EmailSummaryResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "updating email flags")


# ══════════════════════════════════════════════════════════════
# RE-SUMMARIZE EMAIL — POST /api/v1/comms/emails/{email_id}/summarize
# Triggers a fresh AI summarization using stored raw_snippet
# ══════════════════════════════════════════════════════════════
@router.post(
    "/emails/{email_id}/summarize",
    response_model=EmailSummaryResponse,
    summary="Re-summarize an email with AI",
    description=(
        "Re-runs AI summarization on this email using the stored raw_snippet. "
        "Useful if the initial AI call failed or produced a poor summary."
    ),
)
async def re_summarize_email(
    email_id:     UUID,
    current_user: dict      = Depends(get_current_user),
    db:           Client    = Depends(get_supabase),
    ai:           AIService = Depends(get_ai_service),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("email_summaries")
            .select("*")
            .eq("id", str(email_id))
            .eq("user_id", user_id)
            .execute()
        )
        email = verify_ownership(result.data, "Email")

        body = email.get("raw_snippet", "")
        if not body:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "No raw_snippet stored for this email. "
                    "Cannot re-summarize without email body content."
                )
            )

        # ── Call AI ───────────────────────────────────────────
        try:
            ai_result = await ai.summarize_email(
                email_body=body,
                subject=email.get("subject"),
                sender=email.get("sender_email"),
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI summarization failed: {str(e)}"
            )

        # ── Save updated summary ──────────────────────────────
        update_result = (
            db.table("email_summaries")
            .update({
                "ai_summary":    ai_result["summary"],
                "ai_action_hint": ai_result["action_hint"],
            })
            .eq("id", str(email_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(update_result.data, "Email")
        logger.info(f"🧠 Email re-summarized: {email_id}")
        return EmailSummaryResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "re-summarizing email")


# ══════════════════════════════════════════════════════════════
# DELETE EMAIL — DELETE /api/v1/comms/emails/{email_id}
# Removes the local record (does NOT delete from mail server)
# ══════════════════════════════════════════════════════════════
@router.delete(
    "/emails/{email_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an email summary record",
    description=(
        "Removes the email record from JARVIS database only. "
        "Does NOT delete from your actual email inbox."
    ),
)
async def delete_email(
    email_id:     UUID,
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("email_summaries")
            .select("id, subject, account_label")
            .eq("id", str(email_id))
            .eq("user_id", user_id)
            .execute()
        )
        email = verify_ownership(existing.data, "Email")

        db.table("email_summaries") \
          .delete() \
          .eq("id", str(email_id)) \
          .eq("user_id", user_id) \
          .execute()

        logger.info(f"🗑️  Email record deleted: {email_id}")
        return {
            "status":  "deleted",
            "id":      str(email_id),
            "subject": email.get("subject"),
            "message": (
                f"Email record deleted from JARVIS. "
                f"Original email in '{email.get('account_label')}' inbox is unchanged."
            ),
        }

    # ── Continuing delete_email() from where it was cut off ───────

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "deleting email record")


# ══════════════════════════════════════════════════════════════
# MARK ALL READ — POST /api/v1/comms/emails/mark-all-read
# One-tap "clear inbox" for the HUD
# ══════════════════════════════════════════════════════════════
@router.post(
    "/emails/mark-all-read",
    summary="Mark all emails as read",
    description=(
        "Marks all unread emails as read. "
        "Optionally filter by account label. "
        "Perfect for the HUD 'clear notifications' button."
    ),
)
async def mark_all_read(
    account:      Optional[str] = Query(
        None,
        description="Only mark read for this account label"
    ),
    current_user: dict          = Depends(get_current_user),
    db:           Client        = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        query = (
            db.table("email_summaries")
            .update({"is_read": True})
            .eq("user_id", user_id)
            .eq("is_read", False)
        )

        if account:
            query = query.eq("account_label", account)

        result = query.execute()
        count  = len(result.data) if result.data else 0

        logger.info(
            f"📖 Marked {count} email(s) as read "
            f"for user {user_id}"
            + (f" [account: {account}]" if account else "")
        )

        return {
            "status":        "ok",
            "emails_updated": count,
            "account":       account or "all",
            "message":       f"✅ {count} email(s) marked as read.",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "marking all emails as read")


# ══════════════════════════════════════════════════════════════
# POLLER STATUS — GET /api/v1/comms/poller-status
# Shows background poller health — useful for HUD status bar
# ══════════════════════════════════════════════════════════════
@router.get(
    "/poller-status",
    summary="Get background email poller status",
    description=(
        "Returns the current state of the APScheduler email poller: "
        "last poll time, total polls run, total new emails found, "
        "and whether a poll is currently in progress."
    ),
)
async def get_poller_status(
    current_user: dict = Depends(get_current_user),
):
    poll_state = get_poll_state()

    from app.core.config import settings

    return {
        "is_polling":         poll_state.get("is_polling", False),
        "last_polled_at":     poll_state.get("last_polled_at"),
        "last_result":        poll_state.get("last_result"),
        "total_polls_run":    poll_state.get("total_polls", 0),
        "total_new_emails":   poll_state.get("total_new_emails", 0),
        "poll_interval_min":  settings.EMAIL_POLL_INTERVAL_MINUTES,
        "status": (
            "polling"  if poll_state.get("is_polling")  else
            "idle"     if poll_state.get("last_polled_at") else
            "never_run"
        ),
    }

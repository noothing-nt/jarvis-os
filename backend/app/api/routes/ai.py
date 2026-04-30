# backend/app/api/routes/ai.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — AI Integration Routes  (Phase 3)
#
#  Endpoints:
#    POST /api/v1/ai/brainstorm       → Expand idea with LLM
#    POST /api/v1/ai/summarize        → Summarize project
#    POST /api/v1/ai/next-steps       → Suggest action steps
#    POST /api/v1/ai/chat             → JARVIS free-form chat
#    POST /api/v1/ai/summarize-email  → Summarize email body
#    GET  /api/v1/ai/status           → AI provider status check
# ══════════════════════════════════════════════════════════════

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.database import get_supabase
from app.core.security import get_current_user
from app.core.dependencies import handle_db_error, verify_ownership
from app.services.ai_service import AIService, get_ai_service
from app.schemas.ai import (
    BrainstormRequest,   BrainstormResponse,
    SummarizeRequest,    SummarizeResponse,
    NextStepsRequest,    NextStepsResponse,
    ChatRequest,         ChatResponse,
    EmailSummarizeRequest, EmailSummarizeResponse,
    AIUsageStats,
)

logger = logging.getLogger("jarvis-os.routes.ai")

router = APIRouter()


# ══════════════════════════════════════════════════════════════
# AI STATUS — GET /api/v1/ai/status
# Quick check — no actual LLM call, just config validation
# ══════════════════════════════════════════════════════════════
@router.get(
    "/status",
    summary="Check AI provider configuration status",
    description="Returns which AI provider is active and whether keys are loaded. No API call made.",
)
async def get_ai_status(
    current_user: dict      = Depends(get_current_user),
    ai:           AIService = Depends(get_ai_service),
):
    from app.core.config import settings

    gemini_ready = bool(settings.GEMINI_API_KEY)
    openai_ready = bool(settings.OPENAI_API_KEY)
    primary      = settings.AI_PROVIDER

    return {
        "primary_provider": primary,
        "primary_ready":    gemini_ready if primary == "gemini" else openai_ready,
        "fallback_provider":   "openai" if primary == "gemini" else "gemini",
        "fallback_ready":   openai_ready if primary == "gemini" else gemini_ready,
        "providers": {
            "gemini": {
                "configured": gemini_ready,
                "model":      "gemini-1.5-flash",
            },
            "openai": {
                "configured": openai_ready,
                "model":      "gpt-4o-mini",
            },
        },
        "endpoints": [
            "POST /api/v1/ai/brainstorm",
            "POST /api/v1/ai/summarize",
            "POST /api/v1/ai/next-steps",
            "POST /api/v1/ai/chat",
            "POST /api/v1/ai/summarize-email",
        ],
        "status": "ready" if (gemini_ready or openai_ready) else "no_keys_configured",
    }


# ══════════════════════════════════════════════════════════════
# BRAINSTORM — POST /api/v1/ai/brainstorm
# ══════════════════════════════════════════════════════════════
@router.post(
    "/brainstorm",
    response_model=BrainstormResponse,
    summary="Expand a raw idea using AI",
    description=(
        "Send either an `idea_id` (existing DB record) or `raw_idea` text. "
        "The LLM returns an expanded idea, feasibility assessment, and tag suggestions. "
        "If `idea_id` is provided, the result is written back to the ideas table automatically."
    ),
)
async def brainstorm_idea(
    payload:      BrainstormRequest,
    current_user: dict              = Depends(get_current_user),
    db:           Client            = Depends(get_supabase),
    ai:           AIService         = Depends(get_ai_service),
):
    user_id = current_user["id"]

    # ── Resolve the raw idea text ─────────────────────────────
    raw_idea_text = payload.raw_idea
    idea_record   = None

    if payload.idea_id:
        # Fetch existing idea from DB
        result = (
            db.table("ideas")
            .select("*")
            .eq("id", str(payload.idea_id))
            .eq("user_id", user_id)
            .execute()
        )
        idea_record = verify_ownership(result.data, "Idea")
        raw_idea_text = idea_record.get("raw_idea", "")

        if not raw_idea_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Idea record has no raw_idea text to brainstorm from."
            )

    elif not raw_idea_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either idea_id or raw_idea text."
        )

    # ── Call AI service ───────────────────────────────────────
    logger.info(
        f"🧠 Brainstorming idea for user {user_id}: "
        f"'{raw_idea_text[:60]}...'"
    )

    try:
        ai_result = await ai.brainstorm_idea(
            raw_idea=raw_idea_text,
            context=payload.context,
        )
    except Exception as e:
        logger.error(f"💥 AI brainstorm failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    expanded    = ai_result["expanded"]
    feasibility = ai_result["feasibility"]
    ai_tags     = ai_result["tags"]
    saved       = False

    # ── Write results back to DB if idea_id was provided ─────
    if payload.idea_id and idea_record:
        try:
            # Merge AI-suggested tags with existing tags
            existing_tags = idea_record.get("tags", []) or []
            merged_tags   = list(set(existing_tags + ai_tags))[:15]

            db.table("ideas").update({
                "ai_expanded":    expanded,
                "ai_feasibility": feasibility,
                "tags":           merged_tags,
                "status":         "evaluated",
            }).eq("id", str(payload.idea_id)).eq("user_id", user_id).execute()

            saved = True
            logger.info(
                f"✅ AI brainstorm saved to idea {payload.idea_id}"
            )
        except Exception as e:
            logger.warning(f"⚠️  Failed to save brainstorm to DB: {e}")
            # Don't raise — still return the AI result to the user

    return BrainstormResponse(
        idea_id=payload.idea_id,
        original_idea=raw_idea_text,
        ai_expanded=expanded,
        ai_feasibility=feasibility,
        ai_tags=ai_tags,
        saved_to_db=saved,
        usage=AIUsageStats(**ai_result["usage"]),
    )


# ══════════════════════════════════════════════════════════════
# SUMMARIZE PROJECT — POST /api/v1/ai/summarize
# ══════════════════════════════════════════════════════════════
@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    summary="Generate an AI summary of a project",
    description=(
        "Fetches the project + its tasks, sends them to the LLM, "
        "and returns a 2-3 sentence summary. "
        "Result is saved to projects.ai_summary automatically."
    ),
)
async def summarize_project(
    payload:      SummarizeRequest,
    current_user: dict             = Depends(get_current_user),
    db:           Client           = Depends(get_supabase),
    ai:           AIService        = Depends(get_ai_service),
):
    user_id = current_user["id"]

    # ── Fetch project ─────────────────────────────────────────
    proj_result = (
        db.table("projects")
        .select("*")
        .eq("id", str(payload.project_id))
        .eq("user_id", user_id)
        .execute()
    )
    project = verify_ownership(proj_result.data, "Project")

    # ── Fetch project's tasks ─────────────────────────────────
    tasks_result = (
        db.table("tasks")
        .select("title, status, priority")
        .eq("project_id", str(payload.project_id))
        .eq("user_id", user_id)
        .execute()
    )
    tasks = tasks_result.data or []

    logger.info(
        f"🧠 Summarizing project '{project['title']}' "
        f"({len(tasks)} tasks) for user {user_id}"
    )

    # ── Call AI service ───────────────────────────────────────
    try:
        ai_result = await ai.summarize_project(
            project_title=project["title"],
            project_description=project.get("description"),
            project_status=project["status"],
            project_category=project.get("category"),
            tasks=tasks,
            extra_notes=payload.extra_notes,
        )
    except Exception as e:
        logger.error(f"💥 AI summarize failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    summary = ai_result["summary"]
    saved   = False

    # ── Save to DB ────────────────────────────────────────────
    try:
        db.table("projects").update({
            "ai_summary": summary
        }).eq("id", str(payload.project_id)).eq("user_id", user_id).execute()
        saved = True
        logger.info(f"✅ AI summary saved to project {payload.project_id}")
    except Exception as e:
        logger.warning(f"⚠️  Failed to save summary to DB: {e}")

    return SummarizeResponse(
        project_id=payload.project_id,
        project_title=project["title"],
        ai_summary=summary,
        saved_to_db=saved,
        usage=AIUsageStats(**ai_result["usage"]),
    )


# ══════════════════════════════════════════════════════════════
# NEXT STEPS — POST /api/v1/ai/next-steps
# ══════════════════════════════════════════════════════════════
@router.post(
    "/next-steps",
    response_model=NextStepsResponse,
    summary="Generate next action steps for a project",
    description=(
        "Analyzes the project state and pending tasks, "
        "then suggests 3-5 concrete next steps. "
        "Result saved to projects.ai_next_steps."
    ),
)
async def suggest_next_steps(
    payload:      NextStepsRequest,
    current_user: dict             = Depends(get_current_user),
    db:           Client           = Depends(get_supabase),
    ai:           AIService        = Depends(get_ai_service),
):
    user_id = current_user["id"]

    # ── Fetch project ─────────────────────────────────────────
    proj_result = (
        db.table("projects")
        .select("*")
        .eq("id", str(payload.project_id))
        .eq("user_id", user_id)
        .execute()
    )
    project = verify_ownership(proj_result.data, "Project")

    # ── Fetch pending tasks ───────────────────────────────────
    tasks_result = (
        db.table("tasks")
        .select("title, status, priority")
        .eq("project_id", str(payload.project_id))
        .eq("user_id", user_id)
        .not_.in_("status", ["done", "cancelled"])
        .execute()
    )
    pending_tasks = tasks_result.data or []

    logger.info(
        f"🧠 Generating next steps for project "
        f"'{project['title']}' for user {user_id}"
    )

    # ── Call AI service ───────────────────────────────────────
    try:
        ai_result = await ai.suggest_next_steps(
            project_title=project["title"],
            project_description=project.get("description"),
            project_status=project["status"],
            progress_percent=project.get("progress_percent", 0),
            pending_tasks=pending_tasks,
            ai_summary=project.get("ai_summary"),
        )
    except Exception as e:
        logger.error(f"💥 AI next-steps failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    next_steps_text = ai_result["next_steps"]
    steps_list      = ai_result["steps_list"]
    saved           = False

    # ── Save to DB ────────────────────────────────────────────
    try:
        db.table("projects").update({
            "ai_next_steps": next_steps_text
        }).eq("id", str(payload.project_id)).eq("user_id", user_id).execute()
        saved = True
        logger.info(f"✅ Next steps saved to project {payload.project_id}")
    except Exception as e:
        logger.warning(f"⚠️  Failed to save next steps to DB: {e}")

    return NextStepsResponse(
        project_id=payload.project_id,
        project_title=project["title"],
        ai_next_steps=next_steps_text,
        steps_list=steps_list,
        saved_to_db=saved,
        usage=AIUsageStats(**ai_result["usage"]),
    )


# ══════════════════════════════════════════════════════════════
# JARVIS CHAT — POST /api/v1/ai/chat
# ══════════════════════════════════════════════════════════════
@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Free-form JARVIS AI conversation",
    description=(
        "Context-aware chat with JARVIS. "
        "Set `include_projects`, `include_tasks`, or `include_schedule` to True "
        "to inject your live data into the AI context. "
        "Pass `conversation_history` for multi-turn conversations."
    ),
)
async def jarvis_chat(
    payload:      ChatRequest,
    current_user: dict        = Depends(get_current_user),
    db:           Client      = Depends(get_supabase),
    ai:           AIService   = Depends(get_ai_service),
):
    user_id      = current_user["id"]
    context_data = {}

    # ── Fetch requested context ───────────────────────────────

    if payload.include_projects:
        try:
            proj_result = (
                db.table("projects")
                .select("title, status, progress_percent, priority")
                .eq("user_id", user_id)
                .not_.in_("status", ["archived"])
                .order("updated_at", desc=True)
                .limit(10)
                .execute()
            )
            context_data["projects"] = proj_result.data or []
        except Exception as e:
            logger.warning(f"⚠️  Failed to fetch projects for chat context: {e}")

    if payload.include_tasks:
        try:
            from datetime import date
            today = date.today().isoformat()
            tasks_result = (
                db.table("tasks")
                .select("title, status, priority, due_date")
                .eq("user_id", user_id)
                .not_.in_("status", ["done", "cancelled"])
                .lte("due_date", f"{today}T23:59:59+00:00")
                .order("priority", desc=True)
                .limit(10)
                .execute()
            )
            context_data["tasks"] = tasks_result.data or []
        except Exception as e:
            logger.warning(f"⚠️  Failed to fetch tasks for chat context: {e}")

    if payload.include_schedule:
        try:
            from datetime import date, datetime
            today_dow = (datetime.today().weekday() + 1) % 7  # Convert to Mon=1
            sched_result = (
                db.table("daily_schedule")
                .select("title, start_time, end_time, event_type, location")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .contains("day_of_week", [today_dow])
                .order("start_time", desc=False)
                .execute()
            )
            context_data["schedule"] = sched_result.data or []
        except Exception as e:
            logger.warning(f"⚠️  Failed to fetch schedule for chat context: {e}")

    logger.info(
        f"💬 JARVIS chat for user {user_id}: "
        f"'{payload.message[:60]}' | "
        f"context: {list(context_data.keys())}"
    )

    # ── Call AI service ───────────────────────────────────────
    try:
        ai_result = await ai.chat(
            message=payload.message,
            context_data=context_data if context_data else None,
            history=payload.conversation_history,
        )
    except Exception as e:
        logger.error(f"💥 JARVIS chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    return ChatResponse(
        reply=ai_result["reply"],
        context_used=ai_result["context_used"],
        usage=AIUsageStats(**ai_result["usage"]),
    )


# ══════════════════════════════════════════════════════════════
# EMAIL SUMMARIZE — POST /api/v1/ai/summarize-email
# ══════════════════════════════════════════════════════════════
@router.post(
    "/summarize-email",
    response_model=EmailSummarizeResponse,
    summary="Summarize a raw email body with AI",
    description=(
        "Generates a 1-sentence summary and an action hint for an email. "
        "If `email_id` is provided, the result is written back to "
        "the email_summaries table. This is also called internally by "
        "the Phase 4 IMAP poller."
    ),
)
async def summarize_email(
    payload:      EmailSummarizeRequest,
    current_user: dict                  = Depends(get_current_user),
    db:           Client                = Depends(get_supabase),
    ai:           AIService             = Depends(get_ai_service),
):
    user_id = current_user["id"]

    logger.info(
        f"📧 Summarizing email for user {user_id}: "
        f"subject='{payload.subject}'"
    )

    # ── Call AI service ───────────────────────────────────────
    try:
        ai_result = await ai.summarize_email(
            email_body=payload.email_body,
            subject=payload.subject,
            sender=payload.sender,
        )
    except Exception as e:
        logger.error(f"💥 Email summarize failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    summary     = ai_result["summary"]
    action_hint = ai_result["action_hint"]
    saved       = False

    # ── Write back to email_summaries if email_id provided ────
    if payload.email_id:
        try:
            # Verify this email belongs to the user
            email_check = (
                db.table("email_summaries")
                .select("id")
                .eq("id", str(payload.email_id))
                .eq("user_id", user_id)
                .execute()
            )
            if email_check.data:
                db.table("email_summaries").update({
                    "ai_summary":    summary,
                    "ai_action_hint": action_hint,
                }).eq("id", str(payload.email_id)).eq("user_id", user_id).execute()
                saved = True
                logger.info(f"✅ Email summary saved to {payload.email_id}")
            else:
                logger.warning(
                    f"⚠️  Email {payload.email_id} not found for user {user_id}"
                )
        except Exception as e:
            logger.warning(f"⚠️  Failed to save email summary to DB: {e}")

    return EmailSummarizeResponse(
        subject=payload.subject,
        sender=payload.sender,
        ai_summary=summary,
        ai_action_hint=action_hint,
        saved_to_db=saved,
        usage=AIUsageStats(**ai_result["usage"]),
    )# Jarvis OS Backend Module

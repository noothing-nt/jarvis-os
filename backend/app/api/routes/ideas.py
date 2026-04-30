# backend/app/api/routes/ideas.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Ideas CRUD Routes
#  Quick capture → AI expansion (Phase 3) → promote to Project
#
#  Endpoints:
#    GET    /api/v1/ideas                 → List ideas
#    POST   /api/v1/ideas                 → Capture new idea
#    GET    /api/v1/ideas/{id}            → Get one
#    PATCH  /api/v1/ideas/{id}            → Update
#    DELETE /api/v1/ideas/{id}            → Delete
#    POST   /api/v1/ideas/{id}/promote    → Convert to Project
#    POST   /api/v1/ideas/{id}/discard    → Mark as discarded
# ══════════════════════════════════════════════════════════════

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.database import get_supabase
from app.core.security import get_current_user
from app.core.dependencies import (
    PaginationParams, log_activity,
    verify_ownership, handle_db_error
)
from app.schemas.idea import (
    IdeaCreate, IdeaUpdate, IdeaResponse,
    IdeaListResponse, IdeaPromoteRequest
)

logger = logging.getLogger("jarvis-os.routes.ideas")

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# LIST IDEAS — GET /api/v1/ideas
# ──────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=IdeaListResponse,
    summary="List all captured ideas",
)
async def list_ideas(
    idea_status: Optional[str] = Query(None, alias="status",
                                       description="raw/evaluated/promoted/discarded"),
    search:      Optional[str] = Query(None, description="Search in title or raw_idea"),

    sort_by:   str  = Query(default="created_at"),
    sort_desc: bool = Query(default=True),

    pagination:   PaginationParams = Depends(),
    current_user: dict             = Depends(get_current_user),
    db: Client                     = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        query = (
            db.table("ideas")
            .select("*", count="exact")
            .eq("user_id", user_id)
        )

        if idea_status:
            query = query.eq("status", idea_status)
        if search and len(search) >= 2:
            query = query.or_(
                f"title.ilike.%{search}%,raw_idea.ilike.%{search}%"
            )

        valid_sorts = {"created_at", "updated_at", "title", "status"}
        sort_field  = sort_by if sort_by in valid_sorts else "created_at"
        query = query.order(sort_field, desc=sort_desc)
        query = query.range(
            pagination.offset,
            pagination.offset + pagination.per_page - 1
        )

        result      = query.execute()
        total_count = result.count or 0

        return IdeaListResponse(
            data=[IdeaResponse(**i) for i in result.data],
            count=total_count,
            page=pagination.page,
            per_page=pagination.per_page,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "listing ideas")


# ──────────────────────────────────────────────────────────────
# CAPTURE IDEA — POST /api/v1/ideas
# ──────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=IdeaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Capture a new idea quickly",
    description=(
        "Fast capture endpoint. "
        "After creation, call POST /api/v1/ai/brainstorm/{idea_id} "
        "in Phase 3 to get the AI expansion."
    ),
)
async def create_idea(
    payload:      IdeaCreate,
    current_user: dict       = Depends(get_current_user),
    db: Client               = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        insert_data = {
            **payload.model_dump(),
            "user_id": user_id,
            "status":  "raw",
        }

        result = db.table("ideas").insert(insert_data).execute()
        idea   = verify_ownership(result.data, "Idea")

        await log_activity(
            db=db,
            user_id=user_id,
            action_type="idea_captured",
            entity_type="idea",
            entity_id=idea["id"],
            entity_title=idea["title"],
        )

        logger.info(f"💡 Idea captured: '{idea['title']}' by {user_id}")
        return IdeaResponse(**idea)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "capturing idea")


# ──────────────────────────────────────────────────────────────
# GET ONE IDEA — GET /api/v1/ideas/{idea_id}
# ──────────────────────────────────────────────────────────────
@router.get(
    "/{idea_id}",
    response_model=IdeaResponse,
    summary="Get a single idea by ID",
)
async def get_idea(
    idea_id:      UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("ideas")
            .select("*")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )

        idea = verify_ownership(result.data, "Idea")
        return IdeaResponse(**idea)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching idea")


# ──────────────────────────────────────────────────────────────
# UPDATE IDEA — PATCH /api/v1/ideas/{idea_id}
# ──────────────────────────────────────────────────────────────
@router.patch(
    "/{idea_id}",
    response_model=IdeaResponse,
    summary="Update an idea (or write back AI expansion from Phase 3)",
)
async def update_idea(
    idea_id:      UUID,
    payload:      IdeaUpdate,
    current_user: dict       = Depends(get_current_user),
    db: Client               = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("ideas")
            .select("id, title")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )
        verify_ownership(existing.data, "Idea")

        update_data = payload.to_db_dict()
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No fields provided for update."
            )

        result = (
            db.table("ideas")
            .update(update_data)
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Idea")
        return IdeaResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "updating idea")


# ──────────────────────────────────────────────────────────────
# PROMOTE IDEA → PROJECT — POST /api/v1/ideas/{idea_id}/promote
# ──────────────────────────────────────────────────────────────
@router.post(
    "/{idea_id}/promote",
    status_code=status.HTTP_201_CREATED,
    summary="Promote an idea into a full Project",
    description=(
        "Creates a new Project from the idea's content "
        "and links them together. Also sets the idea status to 'promoted'."
    ),
)
async def promote_idea_to_project(
    idea_id:      UUID,
    payload:      IdeaPromoteRequest,
    current_user: dict               = Depends(get_current_user),
    db: Client                       = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # Fetch the idea
        idea_result = (
            db.table("ideas")
            .select("*")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )
        idea = verify_ownership(idea_result.data, "Idea")

        if idea["status"] == "promoted":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This idea has already been promoted to a project."
            )

        # Create the new Project
        project_insert = {
            "user_id":     user_id,
            "title":       payload.project_title or idea["title"],
            "description": idea["raw_idea"],
            "category":    payload.project_category,
            "priority":    payload.project_priority,
            "status":      "idea",
            "ai_summary":  idea.get("ai_expanded"),
            "tags":        idea.get("tags", []),
            "start_date":  payload.start_date,
            "due_date":    payload.due_date,
        }

        proj_result = db.table("projects").insert(project_insert).execute()
        project     = verify_ownership(proj_result.data, "Project")

        # Mark idea as promoted and link to new project
        db.table("ideas").update({
            "status":               "promoted",
            "promoted_project_id":  project["id"],
        }).eq("id", str(idea_id)).execute()

        await log_activity(
            db=db,
            user_id=user_id,
            action_type="idea_promoted",
            entity_type="idea",
            entity_id=str(idea_id),
            entity_title=idea["title"],
            metadata={"project_id": project["id"], "project_title": project["title"]},
        )

        logger.info(f"🚀 Idea '{idea['title']}' promoted to project '{project['title']}'")

        return {
            "status":           "promoted",
            "idea_id":          str(idea_id),
            "idea_title":       idea["title"],
            "project_id":       project["id"],
            "project_title":    project["title"],
            "message":          f"💡 Idea successfully promoted to project '{project['title']}'!",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "promoting idea to project")


# ──────────────────────────────────────────────────────────────
# DISCARD IDEA — POST /api/v1/ideas/{idea_id}/discard
# ──────────────────────────────────────────────────────────────
@router.post(
    "/{idea_id}/discard",
    summary="Mark an idea as discarded",
)
async def discard_idea(
    idea_id:      UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("ideas")
            .select("id, title, status")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )
        idea = verify_ownership(existing.data, "Idea")

        if idea["status"] == "promoted":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot discard an idea that has already been promoted."
            )

        result = (
            db.table("ideas")
            .update({"status": "discarded"})
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Idea")
        return {
            "status":  "discarded",
            "id":      str(idea_id),
            "title":   updated["title"],
            "message": f"Idea '{updated['title']}' marked as discarded.",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "discarding idea")


# ──────────────────────────────────────────────────────────────
# DELETE IDEA — DELETE /api/v1/ideas/{idea_id}
# ──────────────────────────────────────────────────────────────
@router.delete(
    "/{idea_id}",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete an idea",
)
async def delete_idea(
    idea_id:      UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("ideas")
            .select("id, title")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .execute()
        )
        idea = verify_ownership(existing.data, "Idea")

        db.table("ideas") \
          .delete() \
          .eq("id", str(idea_id)) \
          .eq("user_id", user_id) \
          .execute()

        logger.info(f"🗑️  Idea deleted: {idea_id}")
        return {
            "status":  "deleted",
            "id":      str(idea_id),
            "title":   idea["title"],
            "message": f"Idea '{idea['title']}' permanently deleted.",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "deleting idea")
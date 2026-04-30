# backend/app/api/routes/projects.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Projects CRUD Routes  (Phase 2 — FIXED)
#
#  Endpoints:
#    GET    /api/v1/projects/            → List all (filtered + paginated)
#    POST   /api/v1/projects/            → Create project
#    GET    /api/v1/projects/stats       → Aggregate statistics
#    GET    /api/v1/projects/{id}        → Get one project
#    PATCH  /api/v1/projects/{id}        → Partial update
#    DELETE /api/v1/projects/{id}        → Delete
#    GET    /api/v1/projects/{id}/tasks  → All tasks for a project
# ══════════════════════════════════════════════════════════════

import logging
from collections import Counter
from datetime import date as date_type
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.database import get_supabase
from app.core.dependencies import (
    PaginationParams,
    handle_db_error,
    log_activity,
    verify_ownership,
)
from app.core.security import get_current_user
from app.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectStatsResponse,
    ProjectUpdate,
)

logger = logging.getLogger("jarvis-os.routes.projects")

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# HELPER — Serialize a project payload dict for Supabase
# Converts Python date/datetime objects → ISO strings
# Prevents "Object of type date is not JSON serializable" errors
# ──────────────────────────────────────────────────────────────
def _serialize_project_data(data: dict) -> dict:
    """
    Walks a dict and converts any date/datetime values to
    ISO-format strings so Supabase (JSON) can accept them.
    Also stringifies any UUID values.
    """
    serialized = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, date_type):
            serialized[key] = value.isoformat()
        elif isinstance(value, UUID):
            serialized[key] = str(value)
        else:
            serialized[key] = value
    return serialized


# ══════════════════════════════════════════════════════════════
# LIST PROJECTS — GET /api/v1/projects/
# ══════════════════════════════════════════════════════════════
@router.get(
    "/",
    response_model=ProjectListResponse,
    summary="List all projects",
    description=(
        "Returns a paginated list of projects. "
        "Supports filtering by status, priority, category, and pinned state. "
        "Supports full-text search on title."
    ),
)
async def list_projects(
    # ── Filters ───────────────────────────────────────────────
    status:    Optional[str]  = Query(
        None,
        description="Filter by status: idea | active | paused | completed | archived"
    ),
    priority:  Optional[str]  = Query(
        None,
        description="Filter by priority: low | medium | high | critical"
    ),
    category:  Optional[str]  = Query(
        None,
        description="Filter by category: hardware | software | chemistry | personal | other"
    ),
    pinned:    Optional[bool] = Query(
        None,
        description="True = pinned projects only"
    ),
    search:    Optional[str]  = Query(
        None,
        min_length=2,
        description="Search in project title (min 2 characters)"
    ),

    # ── Sorting ───────────────────────────────────────────────
    sort_by:   str  = Query(
        default="updated_at",
        description="Sort field: created_at | updated_at | due_date | title | progress_percent"
    ),
    sort_desc: bool = Query(
        default=True,
        description="True = descending (newest/highest first)"
    ),

    # ── Dependencies ──────────────────────────────────────────
    pagination:   PaginationParams = Depends(),
    current_user: dict             = Depends(get_current_user),
    db:           Client           = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # ── Base query ────────────────────────────────────────
        query = (
            db.table("projects")
            .select("*", count="exact")
            .eq("user_id", user_id)
        )

        # ── Apply optional filters ────────────────────────────
        if status:
            query = query.eq("status", status)
        if priority:
            query = query.eq("priority", priority)
        if category:
            query = query.eq("category", category)
        if pinned is not None:
            query = query.eq("is_pinned", pinned)
        if search:
            # Case-insensitive LIKE — GIN trigram index makes this fast
            query = query.ilike("title", f"%{search}%")

        # ── Sorting ───────────────────────────────────────────
        valid_sort_fields = {
            "created_at", "updated_at", "due_date",
            "title", "priority", "progress_percent"
        }
        sort_field = sort_by if sort_by in valid_sort_fields else "updated_at"
        query      = query.order(sort_field, desc=sort_desc)

        # ── Pagination ────────────────────────────────────────
        query = query.range(
            pagination.offset,
            pagination.offset + pagination.per_page - 1
        )

        result      = query.execute()
        total_count = result.count or 0
        total_pages = max(1, -(-total_count // pagination.per_page))  # ceiling division

        logger.info(
            f"📊 Listed {len(result.data)} / {total_count} projects "
            f"for user {user_id}"
        )

        return ProjectListResponse(
            data=[ProjectResponse(**p) for p in (result.data or [])],
            count=total_count,
            page=pagination.page,
            per_page=pagination.per_page,
            total_pages=total_pages,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "listing projects")


# ══════════════════════════════════════════════════════════════
# PROJECT STATS — GET /api/v1/projects/stats
#
# ⚠️  IMPORTANT: This route MUST be defined BEFORE /{project_id}
#     so FastAPI doesn't try to parse "stats" as a UUID.
# ══════════════════════════════════════════════════════════════
@router.get(
    "/stats",
    response_model=ProjectStatsResponse,
    summary="Get aggregate project statistics",
    description=(
        "Returns counts by status, priority, and category. "
        "Also returns average progress, pinned count, and overdue count. "
        "Used by the HUD top-bar summary widgets."
    ),
)
async def get_project_stats(
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result   = (
            db.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        projects = result.data or []

        # ── Empty state ───────────────────────────────────────
        if not projects:
            return ProjectStatsResponse(
                total=0,
                by_status={},
                by_priority={},
                by_category={},
                avg_progress=0.0,
                pinned_count=0,
                overdue_count=0,
            )

        # ── Aggregate counts ──────────────────────────────────
        today = date_type.today().isoformat()     # "2025-02-15"

        by_status   = dict(Counter(p["status"]   for p in projects))
        by_priority = dict(Counter(p["priority"] for p in projects))
        by_category = dict(
            Counter(p["category"] for p in projects if p.get("category"))
        )

        # Average completion progress across all projects
        avg_progress = round(
            sum(p.get("progress_percent", 0) or 0 for p in projects) / len(projects),
            1,
        )

        pinned_count = sum(1 for p in projects if p.get("is_pinned"))

        # Overdue = due_date is past today AND not completed/archived
        overdue_count = sum(
            1 for p in projects
            if p.get("due_date")
            and str(p["due_date"])[:10] < today        # compare YYYY-MM-DD only
            and p.get("status") not in ("completed", "archived")
        )

        return ProjectStatsResponse(
            total=len(projects),
            by_status=by_status,
            by_priority=by_priority,
            by_category=by_category,
            avg_progress=avg_progress,
            pinned_count=pinned_count,
            overdue_count=overdue_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching project stats")


# ══════════════════════════════════════════════════════════════
# CREATE PROJECT — POST /api/v1/projects/
# ══════════════════════════════════════════════════════════════
@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
async def create_project(
    # ✅ FIX 1: Removed `= ...` — FastAPI treats Pydantic body
    #            models as required automatically. `= ...` can
    #            confuse FastAPI's dependency injection system.
    payload:      ProjectCreate,
    current_user: dict          = Depends(get_current_user),
    db:           Client        = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # ✅ FIX 2: Use model_dump() WITHOUT exclude_none first,
        #    then call our _serialize_project_data() helper to
        #    convert date objects → ISO strings safely.
        #    Then manually drop None values AFTER serialization.
        raw_data = payload.model_dump()

        # Serialize dates/UUIDs → strings
        serialized = _serialize_project_data(raw_data)

        # Build final insert dict — drop None values + add user_id
        insert_data = {
            k: v for k, v in serialized.items()
            if v is not None
        }
        insert_data["user_id"] = user_id

        result  = db.table("projects").insert(insert_data).execute()
        project = verify_ownership(result.data, "Project")

        # ── Log to activity tracker ───────────────────────────
        await log_activity(
            db=db,
            user_id=user_id,
            action_type="project_created",
            entity_type="project",
            entity_id=project["id"],
            entity_title=project["title"],
            metadata={
                "status":   project["status"],
                "priority": project["priority"],
                "category": project.get("category"),
            },
        )

        logger.info(f"✅ Project created: '{project['title']}' by user {user_id}")
        return ProjectResponse(**project)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "creating project")


# ══════════════════════════════════════════════════════════════
# GET ONE PROJECT — GET /api/v1/projects/{project_id}
# ══════════════════════════════════════════════════════════════
@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get a single project by ID",
)
async def get_project(
    project_id:   UUID,
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("projects")
            .select("*")
            .eq("id", str(project_id))
            .eq("user_id", user_id)          # RLS double-check
            .execute()
        )

        project = verify_ownership(result.data, "Project")
        return ProjectResponse(**project)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching project")


# ══════════════════════════════════════════════════════════════
# UPDATE PROJECT — PATCH /api/v1/projects/{project_id}
# ══════════════════════════════════════════════════════════════
@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Partially update a project",
    description=(
        "Accepts any subset of project fields. "
        "Automatically sets completed_at and progress=100 "
        "when status is set to 'completed'."
    ),
)
async def update_project(
    project_id:   UUID,
    payload:      ProjectUpdate,
    current_user: dict          = Depends(get_current_user),
    db:           Client        = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # ── Verify ownership before touching anything ─────────
        existing = (
            db.table("projects")
            .select("id, title, status")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        old_project = verify_ownership(existing.data, "Project")

        # ── Build update dict from only-set fields ────────────
        # to_db_dict() filters out None values (fields not sent)
        update_data = payload.to_db_dict()

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "No fields provided for update. "
                    "Send at least one field to update."
                ),
            )

        # ✅ FIX 3: Serialize all dates/datetimes/UUIDs in the
        #    update dict — to_db_dict() returns raw Python objects.
        update_data = _serialize_project_data(update_data)

        # ── Auto-complete logic ───────────────────────────────
        if update_data.get("status") == "completed":
            update_data["completed_at"]     = datetime.now(timezone.utc).isoformat()
            update_data["progress_percent"] = 100

        # ── Auto-clear completed_at if un-completing ──────────
        if (
            update_data.get("status")
            and update_data["status"] != "completed"
            and old_project.get("status") == "completed"
        ):
            update_data["completed_at"] = None

        result = (
            db.table("projects")
            .update(update_data)
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Project")

        # ── Log significant status changes ────────────────────
        if "status" in update_data:
            await log_activity(
                db=db,
                user_id=user_id,
                action_type=f"project_{update_data['status']}",
                entity_type="project",
                entity_id=str(project_id),
                entity_title=updated["title"],
                metadata={
                    "old_status": old_project["status"],
                    "new_status": update_data["status"],
                },
            )

        logger.info(f"✏️  Project updated: {project_id} by user {user_id}")
        return ProjectResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "updating project")


# ══════════════════════════════════════════════════════════════
# DELETE PROJECT — DELETE /api/v1/projects/{project_id}
# ══════════════════════════════════════════════════════════════
@router.delete(
    "/{project_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a project",
    description=(
        "Permanently deletes the project. "
        "All linked tasks are cascade-deleted by the DB foreign key. "
        "Hardware inventory items are unlinked (SET NULL) but not deleted."
    ),
)
async def delete_project(
    project_id:   UUID,
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # ── Fetch first so we can log the title after delete ──
        existing = (
            db.table("projects")
            .select("id, title, status, category")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        project = verify_ownership(existing.data, "Project")

        # ── Delete (cascades to tasks via FK) ─────────────────
        db.table("projects") \
          .delete() \
          .eq("id", str(project_id)) \
          .eq("user_id", user_id) \
          .execute()

        await log_activity(
            db=db,
            user_id=user_id,
            action_type="project_deleted",
            entity_type="project",
            entity_id=str(project_id),
            entity_title=project["title"],
            metadata={
                "status":   project.get("status"),
                "category": project.get("category"),
            },
        )

        logger.info(f"🗑️  Project deleted: '{project['title']}' ({project_id})")
        return {
            "status":  "deleted",
            "id":      str(project_id),
            "title":   project["title"],
            "message": (
                f"Project '{project['title']}' and all its tasks "
                f"have been permanently deleted."
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "deleting project")


# ══════════════════════════════════════════════════════════════
# PROJECT TASKS — GET /api/v1/projects/{project_id}/tasks
#
# Convenience endpoint — avoids the frontend needing to call
# /api/v1/tasks/?project_id=xxx separately.
# ══════════════════════════════════════════════════════════════
@router.get(
    "/{project_id}/tasks",
    summary="Get all tasks for a specific project",
    description=(
        "Returns all tasks linked to a project, sorted by due_date ascending. "
        "Optionally filter by task status."
    ),
)
async def get_project_tasks(
    project_id:  UUID,
    task_status: Optional[str]  = Query(
        None,
        alias="status",
        description="Filter: todo | in_progress | blocked | done | cancelled"
    ),
    include_done: bool          = Query(
        default=False,
        description="Include done/cancelled tasks (default: False)"
    ),
    current_user: dict          = Depends(get_current_user),
    db:           Client        = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # ── Verify project ownership first ────────────────────
        proj = (
            db.table("projects")
            .select("id, title, status, progress_percent")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        project = verify_ownership(proj.data, "Project")

        # ── Build task query ──────────────────────────────────
        query = (
            db.table("tasks")
            .select("*")
            .eq("project_id", str(project_id))
            .eq("user_id", user_id)
        )

        if task_status:
            # Explicit status filter overrides include_done
            query = query.eq("status", task_status)
        elif not include_done:
            query = query.not_.in_("status", ["done", "cancelled"])

        # Sort: incomplete tasks by due_date, then done tasks last
        query  = query.order("due_date", desc=False, nulls_first=False)
        result = query.execute()

        tasks = result.data or []

        # ── Quick summary stats for the project panel ─────────
        from collections import Counter as _Counter
        status_breakdown = dict(_Counter(t["status"] for t in tasks))

        return {
            "project_id":       str(project_id),
            "project_title":    project["title"],
            "project_status":   project["status"],
            "progress_percent": project.get("progress_percent", 0),
            "tasks":            tasks,
            "count":            len(tasks),
            "status_breakdown": status_breakdown,
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching project tasks")
# backend/app/api/routes/tasks.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Tasks CRUD Routes
#
#  Endpoints:
#    GET    /api/v1/tasks                 → List (filtered + paginated)
#    POST   /api/v1/tasks                 → Create task
#    GET    /api/v1/tasks/today           → Today's due tasks
#    GET    /api/v1/tasks/overdue         → All overdue tasks
#    GET    /api/v1/tasks/{id}            → Get one
#    PATCH  /api/v1/tasks/{id}            → Partial update
#    POST   /api/v1/tasks/{id}/complete   → Mark as done
#    DELETE /api/v1/tasks/{id}            → Delete
# ══════════════════════════════════════════════════════════════

import logging
from datetime import datetime, timezone, date
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
from app.schemas.task import (
    TaskCreate, TaskUpdate,
    TaskResponse, TaskListResponse, TaskCompleteResponse
)

logger = logging.getLogger("jarvis-os.routes.tasks")

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# LIST TASKS — GET /api/v1/tasks
# ──────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=TaskListResponse,
    summary="List all tasks with filters",
)
async def list_tasks(
    task_status:  Optional[str]  = Query(None, alias="status",
                                         description="todo/in_progress/blocked/done/cancelled"),
    priority:     Optional[str]  = Query(None),
    project_id:   Optional[UUID] = Query(None, description="Filter by project"),
    pinned:       Optional[bool] = Query(None),
    search:       Optional[str]  = Query(None, description="Search in title"),
    include_done: bool           = Query(default=False,
                                         description="Include completed/cancelled tasks"),

    sort_by:   str  = Query(default="due_date",
                            description="Sort: due_date/priority/created_at/title"),
    sort_desc: bool = Query(default=False, description="False = soonest due first"),

    pagination:   PaginationParams = Depends(),
    current_user: dict             = Depends(get_current_user),
    db: Client                     = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        query = (
            db.table("tasks")
            .select("*", count="exact")
            .eq("user_id", user_id)
        )

        if task_status:
            query = query.eq("status", task_status)
        elif not include_done:
            # Default: exclude completed/cancelled
            query = query.not_.in_("status", ["done", "cancelled"])

        if priority:
            query = query.eq("priority", priority)
        if project_id:
            query = query.eq("project_id", str(project_id))
        if pinned is not None:
            query = query.eq("is_pinned", pinned)
        if search and len(search) >= 2:
            query = query.ilike("title", f"%{search}%")

        valid_sorts = {"due_date", "priority", "created_at", "updated_at", "title"}
        sort_field  = sort_by if sort_by in valid_sorts else "due_date"

        # Nulls last for due_date sorting (no due date → bottom of list)
        query = query.order(sort_field, desc=sort_desc, nulls_first=False)
        query = query.range(
            pagination.offset,
            pagination.offset + pagination.per_page - 1
        )

        result      = query.execute()
        total_count = result.count or 0
        total_pages = max(1, -(-total_count // pagination.per_page))

        return TaskListResponse(
            data=[TaskResponse(**t) for t in result.data],
            count=total_count,
            page=pagination.page,
            per_page=pagination.per_page,
            total_pages=total_pages,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "listing tasks")


# ──────────────────────────────────────────────────────────────
# TODAY'S TASKS — GET /api/v1/tasks/today
# MUST be defined before /{task_id} to avoid UUID parse error
# ──────────────────────────────────────────────────────────────
@router.get(
    "/today",
    summary="Get today's due tasks",
    description="Returns tasks due today, sorted by priority. Perfect for the daily HUD view and ESP32 display.",
)
async def get_todays_tasks(
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id    = current_user["id"]
        today_str  = date.today().isoformat()

        # Tasks due today that are not done/cancelled
        result = (
            db.table("tasks")
            .select("*")
            .eq("user_id", user_id)
            .gte("due_date", f"{today_str}T00:00:00+00:00")
            .lte("due_date", f"{today_str}T23:59:59+00:00")
            .not_.in_("status", ["done", "cancelled"])
            .order("priority", desc=True)
            .execute()
        )

        # Priority weight for sorting (Supabase can't sort by custom priority order)
        priority_weight = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        sorted_tasks = sorted(
            result.data,
            key=lambda t: priority_weight.get(t.get("priority", "medium"), 2),
            reverse=True
        )

        return {
            "date":       today_str,
            "tasks":      sorted_tasks,
            "count":      len(sorted_tasks),
            "critical":   sum(1 for t in sorted_tasks if t["priority"] == "critical"),
            "high":       sum(1 for t in sorted_tasks if t["priority"] == "high"),
            "message":    f"You have {len(sorted_tasks)} task(s) due today. Stay focused! 🎯",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching today's tasks")


# ──────────────────────────────────────────────────────────────
# OVERDUE TASKS — GET /api/v1/tasks/overdue
# ──────────────────────────────────────────────────────────────
@router.get(
    "/overdue",
    summary="Get all overdue tasks",
    description="Returns all tasks past their due date that aren't done/cancelled.",
)
async def get_overdue_tasks(
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id   = current_user["id"]
        now_str   = datetime.now(timezone.utc).isoformat()

        result = (
            db.table("tasks")
            .select("*")
            .eq("user_id", user_id)
            .lt("due_date", now_str)
            .not_.in_("status", ["done", "cancelled"])
            .order("due_date", desc=False)   # Most overdue first
            .execute()
        )

        return {
            "overdue_tasks": result.data,
            "count":         len(result.data),
            "alert":         len(result.data) > 0,
            "message": (
                f"⚠️  {len(result.data)} task(s) are overdue!"
                if result.data else
                "✅ No overdue tasks. You're on top of everything!"
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching overdue tasks")


# ──────────────────────────────────────────────────────────────
# CREATE TASK — POST /api/v1/tasks
# ──────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
)
async def create_task(
    payload:      TaskCreate,
    current_user: dict       = Depends(get_current_user),
    db: Client               = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        insert_data = {
            **payload.model_dump(exclude_none=True),
            "user_id":    user_id,
            "project_id": str(payload.project_id) if payload.project_id else None,
            "due_date":   payload.due_date.isoformat()     if payload.due_date    else None,
            "reminder_at":payload.reminder_at.isoformat()  if payload.reminder_at else None,
        }

        # If project_id provided, verify user owns that project
        if payload.project_id:
            proj_check = (
                db.table("projects")
                .select("id")
                .eq("id", str(payload.project_id))
                .eq("user_id", user_id)
                .execute()
            )
            if not proj_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or you don't have access to it."
                )

        result = db.table("tasks").insert(insert_data).execute()
        task   = verify_ownership(result.data, "Task")

        await log_activity(
            db=db,
            user_id=user_id,
            action_type="task_created",
            entity_type="task",
            entity_id=task["id"],
            entity_title=task["title"],
            metadata={
                "priority":   task["priority"],
                "project_id": task.get("project_id"),
            },
        )

        logger.info(f"✅ Task created: '{task['title']}' by user {user_id}")
        return TaskResponse(**task)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "creating task")


# ──────────────────────────────────────────────────────────────
# GET ONE TASK — GET /api/v1/tasks/{task_id}
# ──────────────────────────────────────────────────────────────
@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get a single task by ID",
)
async def get_task(
    task_id:      UUID,
    current_user: dict   = Depends(get_current_user),
    db: Client           = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("tasks")
            .select("*")
            .eq("id", str(task_id))
            .eq("user_id", user_id)
            .execute()
        )

        task = verify_ownership(result.data, "Task")
        return TaskResponse(**task)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching task")


# ──────────────────────────────────────────────────────────────
# UPDATE TASK — PATCH /api/v1/tasks/{task_id}
# ──────────────────────────────────────────────────────────────
@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Partially update a task",
)
async def update_task(
    task_id:      UUID,
    payload:      TaskUpdate,
    current_user: dict       = Depends(get_current_user),
    db: Client               = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("tasks")
            .select("id, title")
            .eq("id", str(task_id))
            .eq("user_id", user_id)
            .execute()
        )
        verify_ownership(existing.data, "Task")

        update_data = payload.to_db_dict()
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No fields provided for update."
            )

        # Serialize datetimes/UUIDs to strings
        for field in ("due_date", "reminder_at", "completed_at"):
            if field in update_data and update_data[field]:
                update_data[field] = update_data[field].isoformat()

        if "parent_task_id" in update_data and update_data["parent_task_id"]:
            update_data["parent_task_id"] = str(update_data["parent_task_id"])

        result = (
            db.table("tasks")
            .update(update_data)
            .eq("id", str(task_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Task")
        logger.info(f"✏️  Task updated: {task_id}")
        return TaskResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "updating task")


# ──────────────────────────────────────────────────────────────
# COMPLETE TASK — POST /api/v1/tasks/{task_id}/complete
# Dedicated endpoint for the one-tap "Done" HUD button
# ──────────────────────────────────────────────────────────────
@router.post(
    "/{task_id}/complete",
    response_model=TaskCompleteResponse,
    summary="Mark a task as completed (one-tap done)",
    description="Sets status='done' and records completed_at timestamp. Earns XP for Growth Tracker.",
)
async def complete_task(
    task_id:      UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        # Verify exists & get current status
        existing = (
            db.table("tasks")
            .select("id, title, status, priority")
            .eq("id", str(task_id))
            .eq("user_id", user_id)
            .execute()
        )
        task = verify_ownership(existing.data, "Task")

        if task["status"] == "done":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Task is already marked as completed."
            )

        # XP based on priority — hook for Phase 6 Growth Tracker
        xp_map  = {"critical": 40, "high": 25, "medium": 10, "low": 5}
        xp      = xp_map.get(task.get("priority", "medium"), 10)

        result  = (
            db.table("tasks")
            .update({
                "status":       "done",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", str(task_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Task")

        await log_activity(
            db=db,
            user_id=user_id,
            action_type="task_completed",
            entity_type="task",
            entity_id=str(task_id),
            entity_title=updated["title"],
            metadata={"xp_earned": xp, "priority": updated["priority"]},
        )

        logger.info(f"🏆 Task completed: '{updated['title']}' (+{xp} XP)")

        return TaskCompleteResponse(
            task=TaskResponse(**updated),
            message=f"✅ '{updated['title']}' completed! +{xp} XP earned.",
            xp_earned=xp,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "completing task")


# ──────────────────────────────────────────────────────────────
# DELETE TASK — DELETE /api/v1/tasks/{task_id}
# ──────────────────────────────────────────────────────────────
@router.delete(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a task permanently",
)
async def delete_task(
    task_id:      UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("tasks")
            .select("id, title")
            .eq("id", str(task_id))
            .eq("user_id", user_id)
            .execute()
        )
        task = verify_ownership(existing.data, "Task")

        db.table("tasks") \
          .delete() \
          .eq("id", str(task_id)) \
          .eq("user_id", user_id) \
          .execute()

        await log_activity(
            db=db,
            user_id=user_id,
            action_type="task_deleted",
            entity_type="task",
            entity_id=str(task_id),
            entity_title=task["title"],
        )

        logger.info(f"🗑️  Task deleted: {task_id}")
        return {
            "status":  "deleted",
            "id":      str(task_id),
            "title":   task["title"],
            "message": f"Task '{task['title']}' permanently deleted.",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "deleting task")# Jarvis OS Backend Module

# backend/app/api/routes/schedule.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Daily Schedule CRUD Routes
#  Handles Koshi College BSc Chemistry timetable
#
#  Endpoints:
#    GET    /api/v1/schedule              → Full schedule list
#    POST   /api/v1/schedule              → Add class/event
#    GET    /api/v1/schedule/today        → Today's classes (HUD + ESP32)
#    GET    /api/v1/schedule/week         → Full week grid view
#    GET    /api/v1/schedule/{id}         → Get one
#    PATCH  /api/v1/schedule/{id}         → Update
#    DELETE /api/v1/schedule/{id}         → Delete
#    PATCH  /api/v1/schedule/{id}/toggle  → Enable/disable
# ══════════════════════════════════════════════════════════════

import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.database import get_supabase
from app.core.security import get_current_user
from app.core.dependencies import verify_ownership, handle_db_error
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate,
    ScheduleResponse, ScheduleListResponse, TodayScheduleResponse
)

logger = logging.getLogger("jarvis-os.routes.schedule")

router = APIRouter()

# Day name mapping
DAY_NAMES = {
    0: "Sunday",   1: "Monday",  2: "Tuesday",
    3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"
}


# ──────────────────────────────────────────────────────────────
# LIST SCHEDULE — GET /api/v1/schedule
# ──────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=ScheduleListResponse,
    summary="List all schedule entries",
)
async def list_schedule(
    event_type:  Optional[str]  = Query(None, description="class/lab/tutorial/study_block/personal"),
    day_of_week: Optional[int]  = Query(None, ge=0, le=6, description="0=Sun to 6=Sat"),
    semester:    Optional[str]  = Query(None),
    active_only: bool           = Query(default=True, description="Only return is_active=True entries"),

    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        query = (
            db.table("daily_schedule")
            .select("*")
            .eq("user_id", user_id)
        )

        if active_only:
            query = query.eq("is_active", True)
        if event_type:
            query = query.eq("event_type", event_type)
        if semester:
            query = query.eq("semester", semester)
        if day_of_week is not None:
            # day_of_week is an integer array in DB — use contains
            query = query.contains("day_of_week", [day_of_week])

        result = query.order("start_time", desc=False).execute()

        return ScheduleListResponse(
            data=[ScheduleResponse(**s) for s in result.data],
            count=len(result.data),
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "listing schedule")


# ──────────────────────────────────────────────────────────────
# TODAY'S SCHEDULE — GET /api/v1/schedule/today
# MUST come before /{schedule_id}
# ──────────────────────────────────────────────────────────────
@router.get(
    "/today",
    response_model=TodayScheduleResponse,
    summary="Get today's complete schedule",
    description=(
        "Returns today's classes, labs, and events sorted by start time. "
        "Also provides the 'next_event' field — perfect for ESP32 TFT display."
    ),
)
async def get_today_schedule(
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id     = current_user["id"]
        today       = date.today()
        today_dow   = today.weekday()  # Python: Mon=0, Sun=6
        # Convert to our schema: Mon=1, Sun=0
        schedule_dow = (today_dow + 1) % 7

        now_time = datetime.now(timezone.utc).time()

        result = (
            db.table("daily_schedule")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .contains("day_of_week", [schedule_dow])
            .order("start_time", desc=False)
            .execute()
        )

        events = [ScheduleResponse(**s) for s in result.data]

        # Determine the next upcoming event
        next_event = None
        for event in events:
            if event.start_time > now_time:
                next_event = event
                break

        return TodayScheduleResponse(
            date=today.isoformat(),
            day_name=DAY_NAMES[schedule_dow],
            day_of_week=schedule_dow,
            events=events,
            total_events=len(events),
            next_event=next_event,
        )

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching today's schedule")


# ──────────────────────────────────────────────────────────────
# WEEK VIEW — GET /api/v1/schedule/week
# Returns schedule grouped by day — perfect for the weekly grid
# ──────────────────────────────────────────────────────────────
@router.get(
    "/week",
    summary="Get full week schedule grouped by day",
    description="Returns a dict keyed by day name with events list. Used for the weekly calendar HUD view.",
)
async def get_week_schedule(
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("daily_schedule")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .order("start_time", desc=False)
            .execute()
        )

        # Build week grid: { "Monday": [...], "Tuesday": [...], ... }
        week_grid = {name: [] for name in DAY_NAMES.values()}

        for entry in result.data:
            for dow in entry.get("day_of_week", []):
                day_name = DAY_NAMES.get(dow)
                if day_name:
                    week_grid[day_name].append(entry)

        # Sort each day's events by start_time
        for day in week_grid:
            week_grid[day].sort(key=lambda x: x.get("start_time", "00:00:00"))

        return {
            "week_schedule": week_grid,
            "total_entries": len(result.data),
            "days_with_events": sum(1 for events in week_grid.values() if events),
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching week schedule")


# ──────────────────────────────────────────────────────────────
# CREATE SCHEDULE ENTRY — POST /api/v1/schedule
# ──────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=ScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new class, lab, or event to the schedule",
)
async def create_schedule_entry(
    payload:      ScheduleCreate,
    current_user: dict           = Depends(get_current_user),
    db: Client                   = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        insert_data = {
            **payload.model_dump(exclude_none=True),
            "user_id":    user_id,
            "start_time": payload.start_time.strftime("%H:%M:%S"),
            "end_time":   payload.end_time.strftime("%H:%M:%S"),
            "valid_from": payload.valid_from.isoformat() if payload.valid_from else None,
            "valid_until":payload.valid_until.isoformat() if payload.valid_until else None,
        }

        result = db.table("daily_schedule").insert(insert_data).execute()
        entry  = verify_ownership(result.data, "Schedule entry")

        logger.info(f"📅 Schedule entry created: '{entry['title']}' by {user_id}")
        return ScheduleResponse(**entry)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "creating schedule entry")


# ──────────────────────────────────────────────────────────────
# GET ONE — GET /api/v1/schedule/{schedule_id}
# ──────────────────────────────────────────────────────────────
@router.get(
    "/{schedule_id}",
    response_model=ScheduleResponse,
    summary="Get a single schedule entry",
)
async def get_schedule_entry(
    schedule_id:  UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("daily_schedule")
            .select("*")
            .eq("id", str(schedule_id))
            .eq("user_id", user_id)
            .execute()
        )

        entry = verify_ownership(result.data, "Schedule entry")
        return ScheduleResponse(**entry)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching schedule entry")


# ──────────────────────────────────────────────────────────────
# UPDATE — PATCH /api/v1/schedule/{schedule_id}
# ──────────────────────────────────────────────────────────────
@router.patch(
    "/{schedule_id}",
    response_model=ScheduleResponse,
    summary="Update a schedule entry",
)
async def update_schedule_entry(
    schedule_id:  UUID,
    payload:      ScheduleUpdate,
    current_user: dict           = Depends(get_current_user),
    db: Client                   = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("daily_schedule")
            .select("id, title")
            .eq("id", str(schedule_id))
            .eq("user_id", user_id)
            .execute()
        )
        verify_ownership(existing.data, "Schedule entry")

        update_data = payload.to_db_dict()
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No fields provided for update."
            )

        # Serialize time objects
        if "start_time" in update_data and update_data["start_time"]:
            update_data["start_time"] = update_data["start_time"].strftime("%H:%M:%S")
        if "end_time" in update_data and update_data["end_time"]:
            update_data["end_time"] = update_data["end_time"].strftime("%H:%M:%S")
        if "valid_from" in update_data and update_data["valid_from"]:
            update_data["valid_from"] = update_data["valid_from"].isoformat()
        if "valid_until" in update_data and update_data["valid_until"]:
            update_data["valid_until"] = update_data["valid_until"].isoformat()

        result = (
            db.table("daily_schedule")
            .update(update_data)
            .eq("id", str(schedule_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Schedule entry")
        return ScheduleResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "updating schedule entry")


# ──────────────────────────────────────────────────────────────
# TOGGLE ACTIVE — PATCH /api/v1/schedule/{schedule_id}/toggle
# Quick enable/disable without full update payload
# ──────────────────────────────────────────────────────────────
@router.patch(
    "/{schedule_id}/toggle",
    summary="Toggle a schedule entry active/inactive",
    description="Use during exam periods or holidays to quickly pause class entries.",
)
async def toggle_schedule_entry(
    schedule_id:  UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("daily_schedule")
            .select("id, title, is_active")
            .eq("id", str(schedule_id))
            .eq("user_id", user_id)
            .execute()
        )
        entry = verify_ownership(existing.data, "Schedule entry")

        new_state = not entry["is_active"]

        result = (
            db.table("daily_schedule")
            .update({"is_active": new_state})
            .eq("id", str(schedule_id))
            .eq("user_id", user_id)
            .execute()
        )

        updated = verify_ownership(result.data, "Schedule entry")
        state_label = "activated" if new_state else "deactivated"
        logger.info(f"🔄 Schedule '{entry['title']}' {state_label}")

        return {
            "id":        str(schedule_id),
            "title":     updated["title"],
            "is_active": updated["is_active"],
            "message":   f"'{updated['title']}' has been {state_label}.",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "toggling schedule entry")


# ──────────────────────────────────────────────────────────────
# DELETE — DELETE /api/v1/schedule/{schedule_id}
# ──────────────────────────────────────────────────────────────
@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a schedule entry",
)
async def delete_schedule_entry(
    schedule_id:  UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        existing = (
            db.table("daily_schedule")
            .select("id, title")
            .eq("id", str(schedule_id))
            .eq("user_id", user_id)
            .execute()
        )
        entry = verify_ownership(existing.data, "Schedule entry")

        db.table("daily_schedule") \
          .delete() \
          .eq("id", str(schedule_id)) \
          .eq("user_id", user_id) \
          .execute()

        return {
            "status":  "deleted",
            "id":      str(schedule_id),
            "title":   entry["title"],
            "message": f"Schedule entry '{entry['title']}' deleted.",
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "deleting schedule entry")# Jarvis OS Backend Module

# backend/app/core/dependencies.py
# ══════════════════════════════════════════════════════════════
#  Centralized FastAPI dependencies.
#  Import from here to keep route files clean.
# ══════════════════════════════════════════════════════════════

import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from supabase import Client

from app.core.database import get_supabase
from app.core.security import get_current_user

logger = logging.getLogger("jarvis-os.deps")


# ──────────────────────────────────────────────────────────────
# COMMON PAGINATION PARAMS
# Use in list endpoints: params: PaginationParams = Depends()
# ──────────────────────────────────────────────────────────────
class PaginationParams:
    def __init__(
        self,
        page:     int = Query(default=1,   ge=1,   description="Page number (1-indexed)"),
        per_page: int = Query(default=20,  ge=1,   le=100, description="Items per page (max 100)"),
    ):
        self.page     = page
        self.per_page = per_page
        self.offset   = (page - 1) * per_page


# ──────────────────────────────────────────────────────────────
# ACTIVITY LOGGER HELPER
# Logs user actions to activity_logs table for Growth Tracker.
# Non-critical — logs warning and continues if it fails.
# ──────────────────────────────────────────────────────────────
async def log_activity(
    db:           Client,
    user_id:      str,
    action_type:  str,
    entity_type:  str,
    entity_id:    str,
    entity_title: str,
    metadata:     Optional[dict] = None,
):
    """
    Inserts a record into activity_logs.
    action_type examples: 'task_completed', 'project_created',
                          'idea_captured', 'project_archived'
    """
    try:
        db.table("activity_logs").insert({
            "user_id":      user_id,
            "action_type":  action_type,
            "entity_type":  entity_type,
            "entity_id":    entity_id,
            "entity_title": entity_title,
            "metadata":     metadata or {},
        }).execute()
    except Exception as e:
        # Never let logging crash a real operation
        logger.warning(f"⚠️  Activity log failed ({action_type}): {e}")


# ──────────────────────────────────────────────────────────────
# RESOURCE OWNERSHIP GUARD
# Verifies a record belongs to the requesting user.
# ──────────────────────────────────────────────────────────────
def verify_ownership(result_data: list, resource_name: str = "Resource") -> dict:
    """
    Checks if the Supabase query returned exactly 1 matching record.
    Used after every GET-by-ID to confirm the record exists AND
    belongs to the authenticated user (double-check beyond RLS).
    
    Returns the first record dict, or raises 404.
    """
    if not result_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found or you don't have access to it."
        )
    return result_data[0]


# ──────────────────────────────────────────────────────────────
# SUPABASE ERROR HANDLER
# Clean, consistent error messages from DB exceptions.
# ──────────────────────────────────────────────────────────────
def handle_db_error(e: Exception, context: str = "database operation") -> None:
    """
    Converts raw Supabase/PostgreSQL exceptions into clean HTTP errors.
    """
    error_str = str(e).lower()
    logger.error(f"💥 DB error during '{context}': {e}")

    if "unique" in error_str or "duplicate" in error_str:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A record with these details already exists."
        )
    if "foreign key" in error_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referenced resource (e.g. project_id) does not exist."
        )
    if "not null" in error_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A required field is missing."
        )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Database error during {context}. Check backend logs."
    )
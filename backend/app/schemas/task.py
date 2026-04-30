# backend/app/schemas/task.py
# ══════════════════════════════════════════════════════════════
#  Pydantic v2 Schemas — Tasks
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_STATUSES   = ("todo", "in_progress", "blocked", "done", "cancelled")
VALID_PRIORITIES = ("low", "medium", "high", "critical")


class TaskCreate(BaseModel):
    title:           str              = Field(..., min_length=1, max_length=255)
    description:     Optional[str]   = Field(None, max_length=3000)
    project_id:      Optional[UUID]  = None        # None = personal/standalone task
    tags:            List[str]       = Field(default_factory=list)

    status:          str             = Field(default="todo")
    priority:        str             = Field(default="medium")

    due_date:        Optional[datetime] = None
    reminder_at:     Optional[datetime] = None

    is_recurring:    bool            = False
    recurrence_rule: Optional[str]   = Field(
        None,
        description="RFC 5545 RRULE string e.g. 'FREQ=WEEKLY;BYDAY=MO,WE,FR'"
    )
    parent_task_id:  Optional[UUID]  = None        # For subtasks

    is_pinned:       bool            = False
    color_hex:       str             = Field(default="#00F5FF",
                                            pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {VALID_STATUSES}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of: {VALID_PRIORITIES}")
        return v

    @field_validator("recurrence_rule")
    @classmethod
    def validate_rrule(cls, v: Optional[str], info) -> Optional[str]:
        is_recurring = info.data.get("is_recurring", False)
        if is_recurring and not v:
            raise ValueError("recurrence_rule is required when is_recurring=True")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title":      "Complete Organic Chemistry Lab Report",
                "project_id": None,
                "priority":   "high",
                "due_date":   "2025-02-15T18:00:00Z",
                "reminder_at":"2025-02-15T09:00:00Z",
                "tags":       ["chemistry", "college", "lab"],
            }
        }
    )


class TaskUpdate(BaseModel):
    title:           Optional[str]      = Field(None, min_length=1, max_length=255)
    description:     Optional[str]      = Field(None, max_length=3000)
    project_id:      Optional[UUID]     = None
    tags:            Optional[List[str]] = None

    status:          Optional[str]      = None
    priority:        Optional[str]      = None

    due_date:        Optional[datetime] = None
    reminder_at:     Optional[datetime] = None
    completed_at:    Optional[datetime] = None

    is_recurring:    Optional[bool]     = None
    recurrence_rule: Optional[str]      = None
    parent_task_id:  Optional[UUID]     = None

    is_pinned:       Optional[bool]     = None
    color_hex:       Optional[str]      = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {VALID_STATUSES}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of: {VALID_PRIORITIES}")
        return v

    def to_db_dict(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class TaskResponse(BaseModel):
    id:              UUID
    user_id:         UUID
    project_id:      Optional[UUID]
    title:           str
    description:     Optional[str]
    tags:            List[str]
    status:          str
    priority:        str
    due_date:        Optional[datetime]
    reminder_at:     Optional[datetime]
    completed_at:    Optional[datetime]
    is_recurring:    bool
    recurrence_rule: Optional[str]
    parent_task_id:  Optional[UUID]
    is_pinned:       bool
    color_hex:       str
    created_at:      datetime
    updated_at:      datetime

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    data:       List[TaskResponse]
    count:      int
    page:       int
    per_page:   int
    total_pages: int


class TaskCompleteResponse(BaseModel):
    """Returned when a task is marked as done."""
    task:       TaskResponse
    message:    str
    xp_earned:  int = 10   # Gamification hook for Growth Tracker (Phase 6)# Jarvis OS Backend Module

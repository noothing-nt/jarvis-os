# backend/app/schemas/project.py
# ══════════════════════════════════════════════════════════════
#  Pydantic v2 Schemas — Projects
#  Separate schemas for Create, Update, and Response to follow
#  the CQRS-lite pattern: input ≠ output.
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ──────────────────────────────────────────────────────────────
# ENUMS (as Literal strings — avoids import overhead)
# ──────────────────────────────────────────────────────────────
VALID_STATUSES   = ("idea", "active", "paused", "completed", "archived")
VALID_PRIORITIES = ("low", "medium", "high", "critical")
VALID_CATEGORIES = ("hardware", "software", "chemistry", "research", "personal", "other")


# ──────────────────────────────────────────────────────────────
# CREATE SCHEMA — What the frontend sends on POST
# ──────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    title:              str             = Field(...,  min_length=1, max_length=255,
                                                description="Project title")
    description:        Optional[str]   = Field(None, max_length=5000)
    category:           Optional[str]   = Field(None, description="hardware/software/chemistry/personal")
    tags:               List[str]       = Field(default_factory=list)

    status:             str             = Field(default="active")
    priority:           str             = Field(default="medium")
    progress_percent:   int             = Field(default=0, ge=0, le=100)

    start_date:         Optional[date]  = None
    due_date:           Optional[date]  = None

    gdrive_folder_id:   Optional[str]   = None
    color_hex:          str             = Field(default="#00F5FF",
                                                pattern=r"^#[0-9A-Fa-f]{6}$")
    is_pinned:          bool            = False

    # AI fields — optionally pre-filled, usually set by Phase 3 AI routes
    ai_summary:         Optional[str]   = None
    ai_next_steps:      Optional[str]   = None

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

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of: {VALID_CATEGORIES}")
        return v

    @field_validator("due_date")
    @classmethod
    def due_after_start(cls, v: Optional[date], info) -> Optional[date]:
        start = info.data.get("start_date")
        if v and start and v < start:
            raise ValueError("due_date cannot be before start_date")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title":            "JARVIS ESP32 TFT Display",
                "description":      "Build a Tony Stark HUD on 2.8 inch TFT display",
                "category":         "hardware",
                "tags":             ["esp32", "display", "iot"],
                "status":           "active",
                "priority":         "high",
                "progress_percent": 25,
                "start_date":       "2025-01-01",
                "due_date":         "2025-03-31",
                "color_hex":        "#00F5FF",
                "is_pinned":        True,
            }
        }
    )


# ──────────────────────────────────────────────────────────────
# UPDATE SCHEMA — PATCH request (all fields optional)
# ──────────────────────────────────────────────────────────────
class ProjectUpdate(BaseModel):
    title:              Optional[str]   = Field(None, min_length=1, max_length=255)
    description:        Optional[str]   = Field(None, max_length=5000)
    category:           Optional[str]   = None
    tags:               Optional[List[str]] = None

    status:             Optional[str]   = None
    priority:           Optional[str]   = None
    progress_percent:   Optional[int]   = Field(None, ge=0, le=100)

    start_date:         Optional[date]  = None
    due_date:           Optional[date]  = None
    completed_at:       Optional[datetime] = None

    gdrive_folder_id:   Optional[str]   = None
    color_hex:          Optional[str]   = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_pinned:          Optional[bool]  = None

    ai_summary:         Optional[str]   = None
    ai_next_steps:      Optional[str]   = None

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
        """Returns only the fields that were explicitly set (not None defaults)."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


# ──────────────────────────────────────────────────────────────
# RESPONSE SCHEMA — What the API returns
# ──────────────────────────────────────────────────────────────
class ProjectResponse(BaseModel):
    id:                 UUID
    user_id:            UUID
    title:              str
    description:        Optional[str]
    category:           Optional[str]
    tags:               List[str]
    status:             str
    priority:           str
    progress_percent:   int
    start_date:         Optional[date]
    due_date:           Optional[date]
    completed_at:       Optional[datetime]
    gdrive_folder_id:   Optional[str]
    ai_summary:         Optional[str]
    ai_next_steps:      Optional[str]
    color_hex:          str
    is_pinned:          bool
    created_at:         datetime
    updated_at:         datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    data:       List[ProjectResponse]
    count:      int
    page:       int
    per_page:   int
    total_pages: int


class ProjectStatsResponse(BaseModel):
    total:          int
    by_status:      dict   # {"active": 3, "completed": 2, ...}
    by_priority:    dict   # {"high": 2, "medium": 4, ...}
    by_category:    dict   # {"hardware": 3, "software": 2, ...}
    avg_progress:   float
    pinned_count:   int
    overdue_count:  int# Jarvis OS Backend Module

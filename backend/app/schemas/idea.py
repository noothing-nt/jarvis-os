# backend/app/schemas/idea.py
# ══════════════════════════════════════════════════════════════
#  Pydantic v2 Schemas — Ideas
#  Quick-capture ideas → AI expansion → promote to Projects
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_STATUSES = ("raw", "evaluated", "promoted", "discarded")


class IdeaCreate(BaseModel):
    title:    str          = Field(..., min_length=1, max_length=255)
    raw_idea: str          = Field(..., min_length=1, max_length=5000,
                                   description="Your raw idea — write freely!")
    tags:     List[str]   = Field(default_factory=list)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title":    "AI-powered lab report generator",
                "raw_idea": "What if I built a Python script that uses Gemini to auto-generate BSc Chemistry lab reports from my raw notes and observations?",
                "tags":     ["ai", "chemistry", "automation"],
            }
        }
    )


class IdeaUpdate(BaseModel):
    title:           Optional[str]      = Field(None, min_length=1, max_length=255)
    raw_idea:        Optional[str]      = Field(None, max_length=5000)
    tags:            Optional[List[str]] = None
    status:          Optional[str]      = None
    ai_expanded:     Optional[str]      = None    # Set by AI route in Phase 3
    ai_feasibility:  Optional[str]      = None    # Set by AI route in Phase 3

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {VALID_STATUSES}")
        return v

    def to_db_dict(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class IdeaResponse(BaseModel):
    id:                 UUID
    user_id:            UUID
    title:              str
    raw_idea:           str
    ai_expanded:        Optional[str]
    ai_feasibility:     Optional[str]
    tags:               List[str]
    status:             str
    promoted_project_id: Optional[UUID]
    created_at:         datetime
    updated_at:         datetime

    model_config = ConfigDict(from_attributes=True)


class IdeaListResponse(BaseModel):
    data:    List[IdeaResponse]
    count:   int
    page:    int
    per_page: int


class IdeaPromoteRequest(BaseModel):
    """
    Body for POST /api/v1/ideas/{id}/promote
    Converts an idea into a full Project.
    """
    project_title:    Optional[str]  = None   # Defaults to idea title
    project_category: Optional[str]  = None
    project_priority: str            = "medium"
    start_date:       Optional[str]  = None
    due_date:         Optional[str]  = None
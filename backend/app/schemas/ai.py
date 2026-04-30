# backend/app/schemas/ai.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Pydantic Schemas for AI endpoints
#  All request bodies and response shapes for /api/v1/ai/*
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ──────────────────────────────────────────────────────────────
# REQUEST SCHEMAS
# ──────────────────────────────────────────────────────────────

class BrainstormRequest(BaseModel):
    """
    POST /api/v1/ai/brainstorm
    Expand a raw idea using the LLM.
    Either idea_id (existing DB record) or raw_idea (freeform)
    must be provided.
    """
    idea_id:  Optional[UUID] = Field(
        None,
        description="UUID of an existing idea in the DB. "
                    "AI result will be written back to ideas.ai_expanded"
    )
    raw_idea: Optional[str]  = Field(
        None,
        min_length=5,
        max_length=3000,
        description="Freeform idea text if no idea_id provided"
    )
    context:  Optional[str]  = Field(
        None,
        max_length=500,
        description="Optional extra context e.g. 'BSc Chemistry project'"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "idea_id": "3f8a1b2c-...",
                "context": "BSc Chemistry final year project"
            }
        }
    )


class SummarizeRequest(BaseModel):
    """
    POST /api/v1/ai/summarize
    Summarize a project's description + tasks.
    AI result written back to projects.ai_summary
    """
    project_id:  UUID         = Field(..., description="Project to summarize")
    extra_notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional extra context to include in the summary"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "abc123-...",
                "extra_notes": "Focus on hardware components used"
            }
        }
    )


class NextStepsRequest(BaseModel):
    """
    POST /api/v1/ai/next-steps
    Generate next action steps for a project.
    Result written to projects.ai_next_steps
    """
    project_id: UUID = Field(..., description="Project to generate next steps for")

    model_config = ConfigDict(
        json_schema_extra={"example": {"project_id": "abc123-..."}}
    )


class ChatRequest(BaseModel):
    """
    POST /api/v1/ai/chat
    Free-form conversational AI with optional context injection.
    Context can be user's current projects, today's schedule, etc.
    """
    message:          str           = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="The user's message to JARVIS"
    )
    include_projects: bool          = Field(
        default=False,
        description="Inject user's active project list into context"
    )
    include_schedule: bool          = Field(
        default=False,
        description="Inject today's schedule into context"
    )
    include_tasks:    bool          = Field(
        default=False,
        description="Inject today's pending tasks into context"
    )
    conversation_history: Optional[List[dict]] = Field(
        default=None,
        max_length=20,
        description=(
            "Previous turns for multi-turn conversation. "
            "Format: [{'role': 'user'|'model', 'text': '...'}]"
        )
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message":          "What should I focus on today?",
                "include_tasks":    True,
                "include_schedule": True,
            }
        }
    )


class EmailSummarizeRequest(BaseModel):
    """
    POST /api/v1/ai/summarize-email
    Summarize a single raw email body.
    Internal — also called by the IMAP poller in Phase 4.
    """
    email_body:    str           = Field(
        ...,
        min_length=1,
        max_length=8000,
        description="Raw email body text to summarize"
    )
    sender:        Optional[str] = Field(None, description="Sender name/email")
    subject:       Optional[str] = Field(None, description="Email subject line")
    email_id:      Optional[UUID] = Field(
        None,
        description="If provided, writes ai_summary back to email_summaries table"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "subject":    "Semester exam schedule update",
                "sender":     "admin@koshicollege.edu.np",
                "email_body": "Dear students, the exam schedule has been updated..."
            }
        }
    )


# ──────────────────────────────────────────────────────────────
# RESPONSE SCHEMAS
# ──────────────────────────────────────────────────────────────

class AIUsageStats(BaseModel):
    """Token usage info returned with every AI response."""
    provider:         str
    model:            str
    prompt_tokens:    Optional[int] = None
    response_tokens:  Optional[int] = None
    total_tokens:     Optional[int] = None
    latency_ms:       Optional[float] = None


class BrainstormResponse(BaseModel):
    idea_id:          Optional[UUID]
    original_idea:    str
    ai_expanded:      str           # Detailed expansion
    ai_feasibility:   str           # Feasibility assessment
    ai_tags:          List[str]     # Suggested tags
    saved_to_db:      bool
    usage:            AIUsageStats


class SummarizeResponse(BaseModel):
    project_id:       UUID
    project_title:    str
    ai_summary:       str
    saved_to_db:      bool
    usage:            AIUsageStats


class NextStepsResponse(BaseModel):
    project_id:       UUID
    project_title:    str
    ai_next_steps:    str           # Formatted list of steps
    steps_list:       List[str]     # Parsed as clean list for frontend
    saved_to_db:      bool
    usage:            AIUsageStats


class ChatResponse(BaseModel):
    reply:            str
    context_used:     List[str]     # Which context was injected
    usage:            AIUsageStats


class EmailSummarizeResponse(BaseModel):
    subject:          Optional[str]
    sender:           Optional[str]
    ai_summary:       str           # 1-sentence summary
    ai_action_hint:   str           # "Reply needed" / "FYI only" etc.
    saved_to_db:      bool
    usage:            AIUsageStats
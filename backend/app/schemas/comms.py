# backend/app/schemas/comms.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Pydantic Schemas for Unified Comms (Phase 4)
#  Request bodies and response shapes for /api/v1/comms/*
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────
# EMAIL SUMMARY RESPONSE
# Matches the email_summaries table schema exactly
# ──────────────────────────────────────────────────────────────
class EmailSummaryResponse(BaseModel):
    id:               UUID
    user_id:          UUID

    # Account info
    account_label:    str            # "personal" | "college" | "work"
    account_email:    str

    # Email metadata
    sender_name:      Optional[str]
    sender_email:     str
    subject:          str
    raw_snippet:      Optional[str]  # First ~300 chars of body
    received_at:      datetime

    # AI-processed fields
    ai_summary:       Optional[str]  # 1-sentence LLM summary
    ai_action_hint:   Optional[str]  # "Reply needed" | "FYI only" | etc.

    # State flags
    is_read:          bool
    is_actioned:      bool
    is_starred:       bool

    # Dedup key
    message_id:       str

    created_at:       datetime

    model_config = ConfigDict(from_attributes=True)


class EmailListResponse(BaseModel):
    data:         List[EmailSummaryResponse]
    count:        int
    page:         int
    per_page:     int
    total_pages:  int
    unread_count: int


# ──────────────────────────────────────────────────────────────
# EMAIL UPDATE REQUEST — PATCH /api/v1/comms/emails/{id}
# Toggle read/starred/actioned flags
# ──────────────────────────────────────────────────────────────
class EmailUpdateRequest(BaseModel):
    is_read:      Optional[bool] = Field(
        None,
        description="Mark as read or unread"
    )
    is_starred:   Optional[bool] = Field(
        None,
        description="Star or unstar the email"
    )
    is_actioned:  Optional[bool] = Field(
        None,
        description="Mark as actioned (replied / dealt with)"
    )

    def to_db_dict(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_read":    True,
                "is_starred": True,
            }
        }
    )


# ──────────────────────────────────────────────────────────────
# COMMS STATS RESPONSE — GET /api/v1/comms/stats
# Unread counts per account + action hints breakdown
# ──────────────────────────────────────────────────────────────
class AccountStats(BaseModel):
    label:          str
    email:          str
    total:          int
    unread:         int
    starred:        int
    actioned:       int
    needs_reply:    int   # ai_action_hint = "Reply needed"


class CommsStatsResponse(BaseModel):
    total_emails:       int
    total_unread:       int
    total_starred:      int
    total_needs_action: int
    by_account:         List[AccountStats]
    by_action_hint:     dict   # {"Reply needed": 3, "FYI only": 12, ...}
    last_polled_at:     Optional[datetime]


# ──────────────────────────────────────────────────────────────
# REFRESH RESPONSE — POST /api/v1/comms/refresh
# Returns result of manual email poll trigger
# ──────────────────────────────────────────────────────────────
class RefreshResponse(BaseModel):
    triggered:          bool
    accounts_polled:    int
    new_emails_found:   int
    emails_summarized:  int
    errors:             List[str]
    duration_ms:        float
    message:            str


# ──────────────────────────────────────────────────────────────
# IMAP ACCOUNT CONFIG (internal, not exposed in API)
# Used by email_service.py to represent one email account
# ──────────────────────────────────────────────────────────────
class IMAPAccountConfig:
    """
    Represents one IMAP email account.
    Built from .env settings — never serialized to JSON.
    """
    def __init__(
        self,
        label:     str,
        address:   str,
        password:  str,
        imap_host: str = "imap.gmail.com",
        imap_port: int = 993,
    ):
        self.label     = label
        self.address   = address
        self.password  = password
        self.imap_host = imap_host
        self.imap_port = imap_port

    def __repr__(self):
        return f"IMAPAccount(label={self.label}, address={self.address})"# Jarvis OS Backend Module

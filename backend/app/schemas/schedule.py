# backend/app/schemas/schedule.py
# ══════════════════════════════════════════════════════════════
#  Pydantic v2 Schemas — Daily Schedule
#  Handles Koshi College BSc Chemistry class timetable.
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_EVENT_TYPES = (
    "class", "lab", "tutorial",
    "study_block", "break",
    "meeting", "personal", "reminder"
)

DAY_NAMES = {0:"Sun", 1:"Mon", 2:"Tue", 3:"Wed", 4:"Thu", 5:"Fri", 6:"Sat"}


class ScheduleCreate(BaseModel):
    title:        str             = Field(..., min_length=1, max_length=255,
                                         description="e.g. 'Organic Chemistry Lecture'")
    description:  Optional[str]  = Field(None, max_length=2000)
    subject:      Optional[str]  = Field(None, description="Course code e.g. CHE-301")

    event_type:   str             = Field(default="class")

    # Which days of the week this event repeats
    # 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    day_of_week:  List[int]       = Field(..., description="List of day numbers [0-6]")

    start_time:   time            = Field(..., description="e.g. '09:00:00'")
    end_time:     time            = Field(..., description="e.g. '10:30:00'")

    location:     Optional[str]  = Field(None, description="e.g. 'Lab 3', 'Hall B'")
    instructor:   Optional[str]  = None
    semester:     str             = Field(default="Sem-I 2025")

    color_hex:    str             = Field(default="#00F5FF",
                                         pattern=r"^#[0-9A-Fa-f]{6}$")
    is_active:    bool            = True

    valid_from:   Optional[date] = None
    valid_until:  Optional[date] = None

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in VALID_EVENT_TYPES:
            raise ValueError(f"event_type must be one of: {VALID_EVENT_TYPES}")
        return v

    @field_validator("day_of_week")
    @classmethod
    def validate_days(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("day_of_week must contain at least one day")
        for d in v:
            if d not in range(7):
                raise ValueError(f"Day values must be 0-6. Got: {d}")
        return sorted(list(set(v)))  # Dedupe and sort

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: time, info) -> time:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title":       "Organic Chemistry",
                "subject":     "CHE-301",
                "event_type":  "class",
                "day_of_week": [1, 3, 5],
                "start_time":  "09:00:00",
                "end_time":    "10:30:00",
                "location":    "Hall B",
                "instructor":  "Dr. Sharma",
                "semester":    "Sem-I 2025",
                "color_hex":   "#FF6B35",
            }
        }
    )


class ScheduleUpdate(BaseModel):
    title:        Optional[str]       = Field(None, min_length=1, max_length=255)
    description:  Optional[str]       = Field(None, max_length=2000)
    subject:      Optional[str]       = None
    event_type:   Optional[str]       = None
    day_of_week:  Optional[List[int]] = None
    start_time:   Optional[time]      = None
    end_time:     Optional[time]      = None
    location:     Optional[str]       = None
    instructor:   Optional[str]       = None
    semester:     Optional[str]       = None
    color_hex:    Optional[str]       = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_active:    Optional[bool]      = None
    valid_from:   Optional[date]      = None
    valid_until:  Optional[date]      = None

    def to_db_dict(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class ScheduleResponse(BaseModel):
    id:           UUID
    user_id:      UUID
    title:        str
    description:  Optional[str]
    subject:      Optional[str]
    event_type:   str
    day_of_week:  List[int]
    start_time:   time
    end_time:     time
    location:     Optional[str]
    instructor:   Optional[str]
    semester:     str
    color_hex:    str
    is_active:    bool
    valid_from:   Optional[date]
    valid_until:  Optional[date]
    created_at:   datetime
    updated_at:   datetime

    # Computed field — human-readable day names
    @property
    def day_names(self) -> List[str]:
        return [DAY_NAMES[d] for d in self.day_of_week]

    model_config = ConfigDict(from_attributes=True)


class ScheduleListResponse(BaseModel):
    data:     List[ScheduleResponse]
    count:    int


class TodayScheduleResponse(BaseModel):
    """
    Returned by GET /api/v1/schedule/today
    Shows today's classes/events sorted by start time.
    Perfect for the ESP32 TFT display payload.
    """
    date:          str                  # "2025-02-10"
    day_name:      str                  # "Monday"
    day_of_week:   int                  # 1
    events:        List[ScheduleResponse]
    total_events:  int
    next_event:    Optional[ScheduleResponse]  # The very next upcoming event# Jarvis OS Backend Module

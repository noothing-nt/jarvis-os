# backend/app/schemas/hardware.py
# ══════════════════════════════════════════════════════════════
#  Pydantic v2 Schemas — Hardware Inventory
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_STATUSES = ("available", "in_use", "ordered", "broken", "depleted")
VALID_UNITS    = ("pcs", "meters", "grams", "liters", "kg", "ml", "rolls", "sets", "other")


class HardwareCreate(BaseModel):
    component_name: str             = Field(..., min_length=1, max_length=255)
    model_number:   Optional[str]  = None
    project_id:     Optional[UUID] = None

    quantity:       int             = Field(default=1, ge=0)
    unit:           str             = Field(default="pcs")

    status:         str             = Field(default="available")
    location:       Optional[str]  = Field(None, description="e.g. 'Shelf A', 'Drawer 2'")

    purchase_url:   Optional[str]  = None
    price_inr:      Optional[Decimal] = Field(None, ge=0)
    datasheet_url:  Optional[str]  = None
    notes:          Optional[str]  = Field(None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {VALID_STATUSES}")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "component_name": "ESP32-WROOM-32",
                "model_number":   "ESP32-WROOM-32D",
                "quantity":       3,
                "unit":           "pcs",
                "status":         "available",
                "location":       "Drawer B2",
                "price_inr":      450.00,
            }
        }
    )


class HardwareUpdate(BaseModel):
    component_name: Optional[str]     = Field(None, min_length=1, max_length=255)
    model_number:   Optional[str]     = None
    project_id:     Optional[UUID]    = None
    quantity:       Optional[int]     = Field(None, ge=0)
    unit:           Optional[str]     = None
    status:         Optional[str]     = None
    location:       Optional[str]     = None
    purchase_url:   Optional[str]     = None
    price_inr:      Optional[Decimal] = Field(None, ge=0)
    datasheet_url:  Optional[str]     = None
    notes:          Optional[str]     = None

    def to_db_dict(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class HardwareResponse(BaseModel):
    id:             UUID
    user_id:        UUID
    project_id:     Optional[UUID]
    component_name: str
    model_number:   Optional[str]
    quantity:       int
    unit:           str
    status:         str
    location:       Optional[str]
    purchase_url:   Optional[str]
    price_inr:      Optional[Decimal]
    datasheet_url:  Optional[str]
    notes:          Optional[str]
    created_at:     datetime
    updated_at:     datetime

    model_config = ConfigDict(from_attributes=True)


class HardwareListResponse(BaseModel):
    data:              List[HardwareResponse]
    count:             int
    total_value_inr:   Optional[float]
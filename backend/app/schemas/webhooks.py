# backend/app/schemas/webhooks.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — ESP32 Webhook Schemas (Phase 5)
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────
# ESP32 PING PAYLOAD — What the Arduino sends on each poll
# ──────────────────────────────────────────────────────────────
class ESP32PingRequest(BaseModel):
    """
    Payload sent by the ESP32 Arduino sketch every N seconds.
    The device identifies itself and reports its current state.
    """
    device_id:      str   = Field(
        ...,
        description="Unique device identifier matching esp32_devices.device_id"
    )
    firmware_ver:   Optional[str]   = Field(None, description="Current firmware version")
    display_mode:   Optional[str]   = Field(
        "clock",
        description="Current display mode: clock | tasks | email_count | weather | custom"
    )
    free_heap_kb:   Optional[int]   = Field(None, description="Free heap memory in KB")
    wifi_rssi:      Optional[int]   = Field(None, description="WiFi signal strength dBm")
    uptime_seconds: Optional[int]   = Field(None, description="Seconds since last boot")
    ip_address:     Optional[str]   = Field(None, description="Device local IP")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id":      "esp32-tft-01",
                "firmware_ver":   "1.0.0",
                "display_mode":   "tasks",
                "free_heap_kb":   180,
                "wifi_rssi":      -65,
                "uptime_seconds": 3600,
                "ip_address":     "192.168.1.42",
            }
        }
    )


# ──────────────────────────────────────────────────────────────
# TFT DISPLAY PAYLOAD — What JARVIS sends BACK to the ESP32
# Fits on a 2.8" TFT display (320x240px, ~4-6 lines of text)
# ──────────────────────────────────────────────────────────────
class TFTDisplayPayload(BaseModel):
    """
    The structured payload returned to the ESP32.
    Each line maps to a rendered row on the TFT display.
    """
    # ── Header line ───────────────────────────────────────────
    line1:      str = Field(..., description="Header — e.g. 'JARVIS OS'")
    line2:      str = Field(..., description="Date  — e.g. 'Mon 15 Feb 2025'")
    line3:      str = Field(..., description="Time  — e.g. '14:32'")

    # ── Status lines ──────────────────────────────────────────
    line4:      str = Field(..., description="Tasks — e.g. '3 tasks due today'")
    line5:      str = Field(..., description="Email — e.g. '5 unread emails'")
    line6:      str = Field(..., description="Next  — e.g. 'Organic Chem 15:00'")

    # ── Alert ─────────────────────────────────────────────────
    alert:      Optional[str] = Field(
        None,
        description="Optional alert string shown in red — e.g. '2 OVERDUE!'"
    )

    # ── Display control ───────────────────────────────────────
    refresh_interval_sec: int = Field(
        default=30,
        description="How often ESP32 should poll for new data (seconds)"
    )
    backlight_brightness: int = Field(
        default=200,
        ge=0, le=255,
        description="TFT backlight PWM value (0=off, 255=max)"
    )
    text_color_hex:  str = Field(default="#00F5FF", description="Main text color")
    alert_color_hex: str = Field(default="#FF4444", description="Alert text color")


# ──────────────────────────────────────────────────────────────
# ESP32 WEBHOOK RESPONSE — Returned on every ping
# ──────────────────────────────────────────────────────────────
class ESP32WebhookResponse(BaseModel):
    status:          str              # "ok" | "error"
    device_id:       str
    server_time_utc: str              # ISO datetime
    display:         TFTDisplayPayload
    device_record:   Optional[dict]   = None   # Updated DB record (debug)
    message:         str


# ──────────────────────────────────────────────────────────────
# ESP32 DEVICE STATUS
# ──────────────────────────────────────────────────────────────
class ESP32DeviceResponse(BaseModel):
    id:              UUID
    user_id:         UUID
    device_id:       str
    device_name:     str
    firmware_ver:    Optional[str]
    is_online:       bool
    last_ping:       Optional[datetime]
    display_mode:    str
    current_payload: Optional[Dict[str, Any]]
    created_at:      datetime
    updated_at:      datetime

    model_config = ConfigDict(from_attributes=True)


class ESP32DeviceListResponse(BaseModel):
    devices: List[ESP32DeviceResponse]
    count:   int
    online:  int
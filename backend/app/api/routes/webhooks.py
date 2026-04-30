# backend/app/api/routes/webhooks.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — ESP32 Webhook Routes (Phase 5)
#
#  Endpoints:
#    POST /api/v1/webhooks/esp32          → ESP32 ping + get payload
#    GET  /api/v1/webhooks/esp32/payload  → Lightweight payload poll
#    GET  /api/v1/webhooks/esp32/devices  → List all ESP32 devices
#    GET  /api/v1/webhooks/esp32/devices/{device_id} → One device
# ══════════════════════════════════════════════════════════════

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from supabase import Client

from app.core.config      import settings
from app.core.database    import get_supabase
from app.core.security    import get_current_user, verify_esp32_secret
from app.services.esp32_service import get_esp32_service
from app.schemas.webhooks import (
    ESP32PingRequest,
    ESP32WebhookResponse,
    TFTDisplayPayload,
    ESP32DeviceResponse,
    ESP32DeviceListResponse,
)

logger = logging.getLogger("jarvis-os.routes.webhooks")

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# HELPER — Upsert device record in esp32_devices table
# ──────────────────────────────────────────────────────────────
def _upsert_device(
    db:           Client,
    user_id:      str,
    device_id:    str,
    ping_data:    ESP32PingRequest,
    payload_dict: dict,
) -> dict:
    """
    Creates or updates an ESP32 device record in Supabase.
    Uses upsert on the UNIQUE device_id constraint.
    """
    now = datetime.now(timezone.utc).isoformat()

    upsert_data = {
        "user_id":         user_id,
        "device_id":       device_id,
        "is_online":       True,
        "last_ping":       now,
        "current_payload": payload_dict,
    }

    if ping_data.firmware_ver:
        upsert_data["firmware_ver"] = ping_data.firmware_ver
    if ping_data.display_mode:
        upsert_data["display_mode"] = ping_data.display_mode

    try:
        result = (
            db.table("esp32_devices")
            .upsert(upsert_data, on_conflict="device_id")
            .execute()
        )
        return result.data[0] if result.data else {}
    except Exception as e:
        logger.warning(f"⚠️  Device upsert failed: {e}")
        return {}


# ══════════════════════════════════════════════════════════════
# ESP32 MAIN WEBHOOK — POST /api/v1/webhooks/esp32
#
# Called by the Arduino sketch every 30 seconds.
# Validates the shared secret, builds display payload,
# updates device record, returns data to ESP32.
#
# AUTH: X-ESP32-Secret header (NOT JWT — ESP32 has no browser)
# ══════════════════════════════════════════════════════════════
@router.post(
    "/esp32",
    response_model=ESP32WebhookResponse,
    summary="ESP32 main webhook — ping and receive display payload",
    description=(
        "Called by the ESP32 Arduino sketch on every poll cycle. "
        "Validates X-ESP32-Secret header, fetches live data from Supabase, "
        "builds the 6-line TFT display payload, and returns it. "
        "Also upserts the device record in esp32_devices table."
    ),
)
async def esp32_webhook(
    payload:    ESP32PingRequest,
    request:    Request,
    db:         Client = Depends(get_supabase),
    _verified:  bool   = Depends(verify_esp32_secret),
):
    device_id = payload.device_id

    logger.info(
        f"📡 ESP32 ping: device='{device_id}' | "
        f"FW={payload.firmware_ver} | "
        f"RSSI={payload.wifi_rssi}dBm | "
        f"heap={payload.free_heap_kb}KB"
    )

    # ── Get user_id from device record ────────────────────────
    # ESP32 doesn't send a JWT — we look up the user by device_id
    try:
        device_result = (
            db.table("esp32_devices")
            .select("user_id")
            .eq("device_id", device_id)
            .execute()
        )

        if device_result.data:
            user_id = device_result.data[0]["user_id"]
        else:
            # First-time device — get the first (only) user
            # For single-user personal dashboard this is fine
            user_result = (
                db.table("profiles")
                .select("id")
                .limit(1)
                .execute()
            )
            if not user_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No user found in database."
                )
            user_id = user_result.data[0]["id"]
            logger.info(f"🆕 New ESP32 device '{device_id}' — assigned to user {user_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 User lookup failed for device '{device_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not resolve user for this device."
        )

    # ── Build display payload ─────────────────────────────────
    esp32_svc = get_esp32_service(db=db)

    try:
        display = await esp32_svc.build_display_payload(user_id=user_id)
    except Exception as e:
        logger.error(f"💥 Display payload build failed: {e}")
        # Fallback payload — always return something to ESP32
        display = TFTDisplayPayload(
            line1="JARVIS OS",
            line2=datetime.now(timezone.utc).strftime("%a %d %b %Y"),
            line3=datetime.now(timezone.utc).strftime("%H:%M"),
            line4="Data unavailable",
            line5="Check backend logs",
            line6="",
            alert=None,
        )

    # ── Upsert device record ──────────────────────────────────
    display_dict  = display.model_dump()
    device_record = _upsert_device(
        db=db,
        user_id=user_id,
        device_id=device_id,
        ping_data=payload,
        payload_dict=display_dict,
    )

    return ESP32WebhookResponse(
        status="ok",
        device_id=device_id,
        server_time_utc=datetime.now(timezone.utc).isoformat(),
        display=display,
        device_record=device_record if settings.DEBUG else None,
        message=f"✅ Payload ready for '{device_id}'",
    )


# ══════════════════════════════════════════════════════════════
# LIGHTWEIGHT PAYLOAD POLL — GET /api/v1/webhooks/esp32/payload
#
# Alternative to POST webhook — for ESP32 devices that prefer
# GET requests. Returns the last cached payload instantly.
# ══════════════════════════════════════════════════════════════
# ── Continuing GET /api/v1/webhooks/esp32/payload ─────────────

@router.get(
    "/esp32/payload",
    response_model=TFTDisplayPayload,
    summary="Get latest display payload (lightweight GET poll)",
    description=(
        "Returns the most recently built TFT display payload "
        "from the esp32_devices.current_payload column. "
        "Faster than POST webhook — no DB writes. "
        "Requires X-ESP32-Secret + X-ESP32-Device-ID headers."
    ),
)
async def get_esp32_payload(
    x_esp32_device_id: Optional[str] = Header(
        None,
        alias="X-ESP32-Device-ID",
        description="Device ID from config.h"
    ),
    db:        Client = Depends(get_supabase),
    _verified: bool   = Depends(verify_esp32_secret),
):
    if not x_esp32_device_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-ESP32-Device-ID header is required."
        )

    try:
        # ── Look up cached payload from last POST ping ────────
        result = (
            db.table("esp32_devices")
            .select("current_payload, user_id, last_ping")
            .eq("device_id", x_esp32_device_id)
            .execute()
        )

        if result.data and result.data[0].get("current_payload"):
            cached   = result.data[0]["current_payload"]
            user_id  = result.data[0]["user_id"]

            logger.debug(
                f"📺 GET payload for '{x_esp32_device_id}' "
                f"(cached, user={user_id})"
            )

            # Return cached payload — no DB writes, very fast
            return TFTDisplayPayload(**cached)

        else:
            # ── No cached payload — build fresh ───────────────
            logger.info(
                f"⚡ No cached payload for '{x_esp32_device_id}' "
                f"— building fresh"
            )

            # Get user_id
            user_result = (
                db.table("profiles")
                .select("id")
                .limit(1)
                .execute()
            )
            if not user_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No user found."
                )

            user_id   = user_result.data[0]["id"]
            esp32_svc = get_esp32_service(db=db)
            display   = await esp32_svc.build_display_payload(user_id=user_id)
            return display

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 GET payload failed for '{x_esp32_device_id}': {e}")
        # Always return SOMETHING to the ESP32
        return TFTDisplayPayload(
            line1="JARVIS OS",
            line2=datetime.now(timezone.utc).strftime("%a %d %b %Y"),
            line3=datetime.now(timezone.utc).strftime("%H:%M"),
            line4="Server error",
            line5="Check logs",
            line6="",
            alert=None,
        )


# ══════════════════════════════════════════════════════════════
# LIST DEVICES — GET /api/v1/webhooks/esp32/devices
# Requires user JWT — this is a frontend-facing endpoint
# ══════════════════════════════════════════════════════════════
@router.get(
    "/esp32/devices",
    response_model=ESP32DeviceListResponse,
    summary="List all registered ESP32 devices",
    description=(
        "Returns all ESP32 devices registered to the authenticated user. "
        "Shows online/offline status based on last_ping timestamp."
    ),
)
async def list_esp32_devices(
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("esp32_devices")
            .select("*")
            .eq("user_id", user_id)
            .order("last_ping", desc=True)
            .execute()
        )

        devices = result.data or []

        # ── Mark devices offline if ping > 5 min ago ─────────
        from datetime import timedelta
        now = datetime.now(timezone.utc)

        updated_devices = []
        for device in devices:
            last_ping_str = device.get("last_ping")
            if last_ping_str:
                try:
                    from dateutil import parser as dateutil_parser
                    last_ping = dateutil_parser.isoparse(last_ping_str)
                    if last_ping.tzinfo is None:
                        last_ping = last_ping.replace(tzinfo=timezone.utc)
                    is_online = (now - last_ping).total_seconds() < 300  # 5 min
                    if device.get("is_online") != is_online:
                        # Update stale online status
                        db.table("esp32_devices").update({
                            "is_online": is_online
                        }).eq("id", device["id"]).execute()
                        device["is_online"] = is_online
                except Exception:
                    pass
            updated_devices.append(device)

        online_count = sum(1 for d in updated_devices if d.get("is_online"))

        return ESP32DeviceListResponse(
            devices=[ESP32DeviceResponse(**d) for d in updated_devices],
            count=len(updated_devices),
            online=online_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 List devices failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list devices: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# GET ONE DEVICE — GET /api/v1/webhooks/esp32/devices/{device_id}
# ══════════════════════════════════════════════════════════════
@router.get(
    "/esp32/devices/{device_id}",
    response_model=ESP32DeviceResponse,
    summary="Get a single ESP32 device status",
)
async def get_esp32_device(
    device_id:    str,
    current_user: dict   = Depends(get_current_user),
    db:           Client = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]

        result = (
            db.table("esp32_devices")
            .select("*")
            .eq("device_id", device_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{device_id}' not found."
            )

        return ESP32DeviceResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Device lookup failed: {str(e)}"
        )

# backend/app/core/security.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Auth & JWT Security
#
#  Flow:
#  1. React frontend logs in via Supabase Auth (client-side)
#  2. Supabase returns a JWT access token
#  3. Frontend sends: Authorization: Bearer <token>
#  4. This module verifies that token on every protected request
#  5. Extracts the user's UUID → passed to every route handler
# ══════════════════════════════════════════════════════════════

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client

from app.core.database import get_supabase
from app.core.config import settings

logger = logging.getLogger("jarvis-os.security")

# FastAPI's built-in Bearer token extractor
# auto_error=False lets us return custom 401 messages
bearer_scheme = HTTPBearer(auto_error=False)


# ──────────────────────────────────────────────────────────────
# AUTHENTICATED USER DEPENDENCY
# Use this in any route that requires login:
#   current_user: dict = Depends(get_current_user)
# ──────────────────────────────────────────────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Client = Depends(get_supabase),
) -> dict:
    """
    FastAPI dependency — validates Supabase JWT and returns user dict.

    Returns a dict with at minimum:
        {
            "id":    "uuid-string",
            "email": "user@example.com",
            ...    (full Supabase User object as dict)
        }

    Raises HTTP 401 if token is missing, expired, or invalid.
    """

    # ── Check token was provided ──────────────────────────────
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # ── Validate token with Supabase Auth ─────────────────────
    # This makes a lightweight call to Supabase's /auth/v1/user endpoint.
    # It validates the JWT signature AND checks if it's been revoked.
    try:
        user_response = db.auth.get_user(jwt=token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = user_response.user
        logger.debug(f"✅ Auth OK — user: {user.id} ({user.email})")

        # Return as a plain dict for easy access in routes
        return {
            "id":         str(user.id),
            "email":      user.email,
            "phone":      user.phone,
            "metadata":   user.user_metadata or {},
            "created_at": str(user.created_at),
        }

    except HTTPException:
        raise  # Re-raise our own exceptions

    except Exception as e:
        logger.warning(f"⚠️  Auth failed — {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Token may be expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ──────────────────────────────────────────────────────────────
# OPTIONAL AUTH — For public endpoints that ALSO work logged in
# Returns user dict if token provided, None if not.
# ──────────────────────────────────────────────────────────────
async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Client = Depends(get_supabase),
) -> Optional[dict]:
    """
    Like get_current_user but doesn't raise if no token.
    Use for semi-public endpoints.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None


# ──────────────────────────────────────────────────────────────
# ESP32 WEBHOOK AUTH — Validates shared secret from hardware
# ESP32 sends: X-ESP32-Secret: <secret_from_config_h>
# ──────────────────────────────────────────────────────────────
async def verify_esp32_secret(request: Request) -> bool:
    """
    Validates the ESP32 shared secret header.
    Use in webhook routes: Depends(verify_esp32_secret)
    """
    provided_secret = request.headers.get("X-ESP32-Secret")

    if not settings.ESP32_WEBHOOK_SECRET:
        logger.warning("⚠️  ESP32_WEBHOOK_SECRET not set — rejecting all ESP32 requests")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ESP32 webhook secret not configured on server."
        )

    if provided_secret != settings.ESP32_WEBHOOK_SECRET:
        logger.warning(f"🚨 Invalid ESP32 secret from {request.client.host}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ESP32 webhook secret."
        )

    return True# Jarvis OS Backend Module

# backend/app/core/database.py
# ──────────────────────────────────────────────────────────────
# Supabase client singleton.
# Uses the service key (admin) for backend operations.
# ──────────────────────────────────────────────────────────────

from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger("jarvis-os.database")

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """
    Returns the Supabase client singleton.
    Call this as a FastAPI dependency: db: Client = Depends(get_supabase)
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,  # Service key for full backend access
        )
        logger.info("✅ Supabase client initialized.")
    return _supabase_client# Jarvis OS Backend Module

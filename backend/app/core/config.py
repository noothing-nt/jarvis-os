# backend/app/core/config.py
# ──────────────────────────────────────────────────────────────
# Pydantic Settings — reads ALL configuration from .env file.
# Access anywhere: from app.core.config import settings
# ──────────────────────────────────────────────────────────────

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):

    # ── Application ─────────────────────────────────────────
    APP_NAME:    str = "JARVIS OS"
    VERSION:     str = "1.0.0"
    DEBUG:       bool = False
    PORT:        int = 8000

    # ── Supabase ─────────────────────────────────────────────
    SUPABASE_URL:          str
    SUPABASE_ANON_KEY:     str
    SUPABASE_SERVICE_KEY:  str           # Admin key — never expose to frontend

    # ── AI Provider ──────────────────────────────────────────
    AI_PROVIDER:       str = "gemini"    # "gemini" or "openai"
    GEMINI_API_KEY:    Optional[str] = None
    OPENAI_API_KEY:    Optional[str] = None

    # ── Email Accounts (up to 3) ──────────────────────────────
    EMAIL_1_LABEL:     str = "personal"
    EMAIL_1_ADDRESS:   Optional[str] = None
    EMAIL_1_PASSWORD:  Optional[str] = None  # Use App Password for Gmail
    EMAIL_1_IMAP_HOST: str = "imap.gmail.com"
    EMAIL_1_IMAP_PORT: int = 993

    EMAIL_2_LABEL:     str = "college"
    EMAIL_2_ADDRESS:   Optional[str] = None
    EMAIL_2_PASSWORD:  Optional[str] = None
    EMAIL_2_IMAP_HOST: str = "imap.gmail.com"
    EMAIL_2_IMAP_PORT: int = 993

    EMAIL_3_LABEL:     str = "work"
    EMAIL_3_ADDRESS:   Optional[str] = None
    EMAIL_3_PASSWORD:  Optional[str] = None
    EMAIL_3_IMAP_HOST: str = "imap.gmail.com"
    EMAIL_3_IMAP_PORT: int = 993

    # How often to poll emails (minutes)
    EMAIL_POLL_INTERVAL_MINUTES: int = 5

    # ── Google Drive ─────────────────────────────────────────
    GDRIVE_CREDENTIALS_PATH:  str = "gdrive_credentials.json"
    GDRIVE_ROOT_FOLDER_ID:    Optional[str] = None

    # ── Frontend ─────────────────────────────────────────────
    NETLIFY_URL:    Optional[str] = None   # e.g., https://jarvis-os.netlify.app
    CUSTOM_DOMAIN:  Optional[str] = None   # e.g., https://jarvis.yourdomain.com

    # ── ESP32 ────────────────────────────────────────────────
    ESP32_WEBHOOK_SECRET: Optional[str] = None  # Shared secret for request validation

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton instance — import this everywhere
settings = Settings()# Jarvis OS Backend Module

# backend/app/services/email_service.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — IMAP Email Service (Phase 4)
#
#  Responsibilities:
#    1. Connect to up to 3 IMAP accounts (Gmail or any IMAP)
#    2. Fetch UNSEEN emails from INBOX
#    3. Parse raw RFC 2822 email → structured fields
#    4. Deduplicate by Message-ID header (prevents re-processing)
#    5. Pass each email body to AIService.summarize_email()
#    6. Save structured + AI-summarized record to Supabase
#
#  Gmail setup required:
#    - Enable "IMAP" in Gmail Settings → Forwarding and POP/IMAP
#    - Use App Passwords (not your real password):
#      Google Account → Security → 2FA → App Passwords
#      Generate one for "JARVIS OS"
#
#  Called by:
#    - email_poller.py  (APScheduler background job)
#    - comms.py route   (POST /api/v1/comms/refresh — manual trigger)
# ══════════════════════════════════════════════════════════════

import logging
import ssl
import time
from datetime import datetime, timezone
from typing import Optional

import chardet
import html2text
import mailparser
from imapclient import IMAPClient

from app.core.config import settings
from app.schemas.comms import IMAPAccountConfig

logger = logging.getLogger("jarvis-os.email_service")


# ──────────────────────────────────────────────────────────────
# HTML → PLAIN TEXT CONVERTER
# Strips HTML tags from email bodies cleanly
# ──────────────────────────────────────────────────────────────
_html_converter = html2text.HTML2Text()
_html_converter.ignore_links      = True
_html_converter.ignore_images     = True
_html_converter.ignore_emphasis   = True
_html_converter.body_width        = 0        # No line wrapping


def html_to_text(html: str) -> str:
    """Convert HTML email body to clean plain text."""
    try:
        return _html_converter.handle(html).strip()
    except Exception:
        return html   # Return raw HTML if conversion fails


# ══════════════════════════════════════════════════════════════
# IMAP EMAIL SERVICE CLASS
# ══════════════════════════════════════════════════════════════
class IMAPEmailService:
    """
    Multi-account IMAP email fetcher and AI summarizer.

    Usage:
        service = IMAPEmailService(db=supabase_client, ai=ai_service)
        result  = await service.poll_all_accounts(user_id="uuid-string")
    """

    # Max emails to fetch per account per poll cycle
    # Prevents hammering AI API on first run with huge inbox
    MAX_EMAILS_PER_POLL = 10

    # Max characters of email body to send to AI
    # Balances context vs token cost
    MAX_BODY_CHARS = 2500

    # Max characters to store as raw_snippet in DB
    SNIPPET_LENGTH = 300

    def __init__(self, db, ai):
        """
        Args:
            db: Supabase client (from get_supabase())
            ai: AIService instance (from get_ai_service())
        """
        self.db  = db
        self.ai  = ai
        self._accounts: list[IMAPAccountConfig] = []
        self._build_accounts()

    # ──────────────────────────────────────────────────────────
    # BUILD ACCOUNT LIST FROM .env
    # ──────────────────────────────────────────────────────────
    def _build_accounts(self):
        """
        Reads up to 3 email accounts from settings.
        Skips accounts with missing address or password.
        """
        raw_accounts = [
            (
                settings.EMAIL_1_LABEL,
                settings.EMAIL_1_ADDRESS,
                settings.EMAIL_1_PASSWORD,
                settings.EMAIL_1_IMAP_HOST,
                settings.EMAIL_1_IMAP_PORT,
            ),
            (
                settings.EMAIL_2_LABEL,
                settings.EMAIL_2_ADDRESS,
                settings.EMAIL_2_PASSWORD,
                settings.EMAIL_2_IMAP_HOST,
                settings.EMAIL_2_IMAP_PORT,
            ),
            (
                settings.EMAIL_3_LABEL,
                settings.EMAIL_3_ADDRESS,
                settings.EMAIL_3_PASSWORD,
                settings.EMAIL_3_IMAP_HOST,
                settings.EMAIL_3_IMAP_PORT,
            ),
        ]

        self._accounts = []
        for label, address, password, host, port in raw_accounts:
            if address and password:
                self._accounts.append(
                    IMAPAccountConfig(
                        label=label,
                        address=address,
                        password=password,
                        imap_host=host,
                        imap_port=port,
                    )
                )
                logger.info(f"📧 IMAP account loaded: '{label}' ({address})")
            else:
                logger.debug(f"⏭️  Skipping account '{label}' — not configured")

        logger.info(f"✅ IMAPEmailService: {len(self._accounts)} account(s) configured")

    # ──────────────────────────────────────────────────────────
    # PUBLIC: POLL ALL ACCOUNTS
    # Main entry point called by the scheduler and manual refresh
    # ──────────────────────────────────────────────────────────
    async def poll_all_accounts(self, user_id: str) -> dict:
        """
        Polls all configured IMAP accounts for new emails.
        Processes each one through AI and saves to Supabase.

        Returns a summary dict:
        {
            "accounts_polled":    int,
            "new_emails_found":   int,
            "emails_summarized":  int,
            "errors":             list[str],
        }
        """
        if not self._accounts:
            logger.warning("⚠️  No IMAP accounts configured. Skipping poll.")
            return {
                "accounts_polled":   0,
                "new_emails_found":  0,
                "emails_summarized": 0,
                "errors":            ["No email accounts configured in .env"],
            }

        total_found      = 0
        total_summarized = 0
        errors           = []

        for account in self._accounts:
            try:
                logger.info(f"📬 Polling '{account.label}' ({account.address})...")
                result = await self._poll_single_account(
                    account=account,
                    user_id=user_id,
                )
                total_found      += result["found"]
                total_summarized += result["summarized"]

                logger.info(
                    f"✅ '{account.label}': "
                    f"{result['found']} new, "
                    f"{result['summarized']} summarized, "
                    f"{result['skipped']} skipped (duplicates)"
                )

            except Exception as e:
                error_msg = f"Account '{account.label}' failed: {type(e).__name__}: {e}"
                logger.error(f"💥 {error_msg}")
                errors.append(error_msg)

        return {
            "accounts_polled":   len(self._accounts),
            "new_emails_found":  total_found,
            "emails_summarized": total_summarized,
            "errors":            errors,
        }

    # ──────────────────────────────────────────────────────────
    # PRIVATE: POLL ONE ACCOUNT
    # ──────────────────────────────────────────────────────────
    async def _poll_single_account(
        self,
        account: IMAPAccountConfig,
        user_id: str,
    ) -> dict:
        """
        Connects to one IMAP account, fetches UNSEEN emails,
        deduplicates, summarizes, and saves to Supabase.
        """
        found      = 0
        summarized = 0
        skipped    = 0

        # ── Connect to IMAP server ────────────────────────────
        ssl_context = ssl.create_default_context()

        with IMAPClient(
            host=account.imap_host,
            port=account.imap_port,
            ssl=True,
            ssl_context=ssl_context,
        ) as client:

            # ── Login ─────────────────────────────────────────
            try:
                client.login(account.address, account.password)
                logger.debug(f"🔑 Logged in to {account.address}")
            except Exception as e:
                raise ConnectionError(
                    f"IMAP login failed for {account.address}: {e}. "
                    f"Ensure App Password is set correctly."
                )

            # ── Select INBOX ──────────────────────────────────
            client.select_folder("INBOX", readonly=True)

            # ── Search for UNSEEN emails ──────────────────────
            # readonly=True means we don't mark them as read on server
            message_ids = client.search(["UNSEEN"])

            if not message_ids:
                logger.debug(f"📭 No new emails in '{account.label}'")
                return {"found": 0, "summarized": 0, "skipped": 0}

            # ── Limit to most recent N emails ─────────────────
            # Take the LAST N (most recent) if more than limit
            if len(message_ids) > self.MAX_EMAILS_PER_POLL:
                message_ids = message_ids[-self.MAX_EMAILS_PER_POLL:]
                logger.info(
                    f"⚡ Capped to last {self.MAX_EMAILS_PER_POLL} emails "
                    f"for '{account.label}'"
                )

            found = len(message_ids)

            # ── Fetch raw email data ──────────────────────────
            # RFC822 = full raw email message
            messages = client.fetch(message_ids, ["RFC822", "INTERNALDATE"])

            for uid, data in messages.items():
                try:
                    result = await self._process_single_email(
                        raw_email=data[b"RFC822"],
                        internal_date=data.get(b"INTERNALDATE"),
                        account=account,
                        user_id=user_id,
                    )

                    if result == "skipped":
                        skipped += 1
                    elif result == "saved":
                        summarized += 1

                except Exception as e:
                    logger.warning(
                        f"⚠️  Failed to process email UID {uid} "
                        f"in '{account.label}': {e}"
                    )

        return {"found": found, "summarized": summarized, "skipped": skipped}

    # ──────────────────────────────────────────────────────────
    # PRIVATE: PROCESS ONE EMAIL
    # Parse → Deduplicate → Summarize → Save
    # ──────────────────────────────────────────────────────────
    async def _process_single_email(
        self,
        raw_email:     bytes,
        internal_date: Optional[datetime],
        account:       IMAPAccountConfig,
        user_id:       str,
    ) -> str:
        """
        Processes a single raw email.
        Returns: "saved" | "skipped"
        """

        # ── Parse raw email ───────────────────────────────────
        parsed = mailparser.parse_from_bytes(raw_email)

        # Extract Message-ID for deduplication
        message_id = self._extract_message_id(parsed)

        if not message_id:
            logger.warning("⚠️  Email has no Message-ID — generating fallback")
            # Create a fallback ID from subject + date
            subject_raw = parsed.subject or "no-subject"
            date_raw    = str(internal_date or datetime.now())
            message_id  = f"no-id-{account.address}-{hash(subject_raw + date_raw)}"

        # ── Deduplicate check ─────────────────────────────────
        if await self._is_duplicate(message_id=message_id, user_id=user_id):
            logger.debug(f"⏭️  Duplicate — skipping: {message_id[:40]}...")
            return "skipped"

        # ── Extract email fields ──────────────────────────────
        sender_name, sender_email = self._extract_sender(parsed)
        subject                   = (parsed.subject or "(No Subject)").strip()
        received_at               = self._extract_date(parsed, internal_date)
        body_text                 = self._extract_body(parsed)
        raw_snippet               = body_text[:self.SNIPPET_LENGTH] if body_text else ""

        logger.debug(
            f"📧 Processing: '{subject[:50]}' "
            f"from {sender_email}"
        )

        # ── AI Summarize ──────────────────────────────────────
        ai_summary    = None
        ai_action_hint = None

        try:
            ai_result = await self.ai.summarize_email(
                email_body=body_text[:self.MAX_BODY_CHARS],
                subject=subject,
                sender=f"{sender_name} <{sender_email}>" if sender_name else sender_email,
            )
            ai_summary    = ai_result.get("summary")
            ai_action_hint = ai_result.get("action_hint")

            logger.debug(
                f"🧠 AI summary: '{ai_summary[:60] if ai_summary else 'None'}...'"
            )

        except Exception as e:
            # AI failure should NOT block email storage
            logger.warning(f"⚠️  AI summarize failed for '{subject[:40]}': {e}")
            ai_summary    = None
            ai_action_hint = "Summarization failed"

        # ── Save to Supabase ──────────────────────────────────
        insert_data = {
            "user_id":        user_id,
            "account_label":  account.label,
            "account_email":  account.address,
            "sender_name":    sender_name,
            "sender_email":   sender_email,
            "subject":        subject,
            "raw_snippet":    raw_snippet,
            "received_at":    received_at.isoformat() if received_at else datetime.now(timezone.utc).isoformat(),
            "ai_summary":     ai_summary,
            "ai_action_hint": ai_action_hint,
            "is_read":        False,
            "is_actioned":    False,
            "is_starred":     False,
            "message_id":     message_id,
        }

        try:
            self.db.table("email_summaries").insert(insert_data).execute()
            logger.info(
                f"✅ Saved: '{subject[:50]}' "
                f"from {sender_email} [{account.label}]"
            )
            return "saved"

        except Exception as e:
            error_str = str(e).lower()
            if "unique" in error_str or "duplicate" in error_str:
                # Race condition — another poll saved it first
                logger.debug(f"⏭️  Race condition duplicate for: {message_id[:40]}")
                return "skipped"
            raise

    # ──────────────────────────────────────────────────────────
    # PRIVATE HELPERS — Email parsing utilities
    # ──────────────────────────────────────────────────────────

    async def _is_duplicate(self, message_id: str, user_id: str) -> bool:
        """
        Checks if this message_id already exists in email_summaries.
        Uses the UNIQUE constraint index for O(1) lookup.
        """
        try:
            result = (
                self.db.table("email_summaries")
                .select("id")
                .eq("message_id", message_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            return bool(result.data)
        except Exception as e:
            logger.warning(f"⚠️  Duplicate check failed: {e}")
            return False   # Err on the side of processing

    @staticmethod
    def _extract_message_id(parsed: mailparser.MailParser) -> Optional[str]:
        """Extracts the Message-ID header value."""
        try:
            # mailparser stores headers as list of [name, value] pairs
            headers = parsed.headers
            if isinstance(headers, dict):
                mid = headers.get("Message-ID") or headers.get("Message-Id", "")
                return mid.strip().strip("<>") if mid else None

            # Try raw message_id attribute
            if hasattr(parsed, "message_id"):
                mid = parsed.message_id
                return mid.strip().strip("<>") if mid else None

        except Exception:
            pass
        return None

    @staticmethod
    def _extract_sender(
        parsed: mailparser.MailParser,
    ) -> tuple[Optional[str], str]:
        """
        Returns (sender_name, sender_email) tuple.
        Handles malformed From headers gracefully.
        """
        try:
            from_list = parsed.from_  # List of (name, email) tuples
            if from_list and isinstance(from_list, list):
                name, email = from_list[0]
                name  = name.strip()  if name  else None
                email = email.strip() if email else "unknown@unknown.com"
                return (name or None, email)
        except Exception:
            pass
        return (None, "unknown@unknown.com")

    @staticmethod
    def _extract_date(
        parsed:        mailparser.MailParser,
        internal_date: Optional[datetime],
    ) -> Optional[datetime]:
        """
        Returns email received datetime in UTC.
        Prefers IMAP INTERNALDATE over header Date field.
        """
        # INTERNALDATE from IMAP server is most reliable
        if internal_date:
            if internal_date.tzinfo is None:
                return internal_date.replace(tzinfo=timezone.utc)
            return internal_date.astimezone(timezone.utc)

        # Fallback to parsed Date header
        try:
            date_val = parsed.date
            if date_val:
                if isinstance(date_val, datetime):
                    if date_val.tzinfo is None:
                        return date_val.replace(tzinfo=timezone.utc)
                    return date_val.astimezone(timezone.utc)
        except Exception:
            pass

        return datetime.now(timezone.utc)

    @staticmethod
    def _extract_body(parsed: mailparser.MailParser) -> str:
        """
        Extracts clean plain-text body from email.
        Priority: text_plain → HTML converted → empty string
        """
        try:
            # Try plain text parts first
            if parsed.text_plain:
                parts = parsed.text_plain
                if isinstance(parts, list):
                    body = "\n\n".join(
                        part if isinstance(part, str)
                        else part.decode("utf-8", errors="replace")
                        for part in parts
                    )
                else:
                    body = str(parts)
                return body.strip()

        except Exception as e:
            logger.debug(f"Plain text extraction failed: {e}")

        try:
            # Fallback: convert HTML to plain text
            if parsed.text_html:
                html_parts = parsed.text_html
                if isinstance(html_parts, list):
                    html = "\n".join(
                        part if isinstance(part, str)
                        else part.decode("utf-8", errors="replace")
                        for part in html_parts
                    )
                else:
                    html = str(html_parts)
                return html_to_text(html)

        except Exception as e:
            logger.debug(f"HTML extraction failed: {e}")

        return ""   # Empty body — AI will note this gracefully


# ──────────────────────────────────────────────────────────────
# SINGLETON FACTORY
# ──────────────────────────────────────────────────────────────
_email_service_instance: Optional[IMAPEmailService] = None


def get_email_service(db=None, ai=None) -> IMAPEmailService:
    """
    Returns singleton IMAPEmailService.
    Pass db + ai on first call to initialize.
    Subsequent calls return the cached instance.
    """
    global _email_service_instance
    if _email_service_instance is None:
        if db is None or ai is None:
            raise ValueError(
                "db and ai must be provided on first get_email_service() call"
            )
        _email_service_instance = IMAPEmailService(db=db, ai=ai)
        logger.info("✅ IMAPEmailService singleton created")
    return _email_service_instance

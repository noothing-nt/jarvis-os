# backend/app/services/esp32_service.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — ESP32 Display Payload Service (Phase 5)
#
#  Builds the 6-line TFT display payload from live Supabase data.
#  Called every time the ESP32 pings the webhook.
#
#  Display layout on 2.8" TFT (320x240):
#  ┌─────────────────────────┐
#  │  JARVIS OS              │  ← line1 (header, large cyan)
#  │  Mon 15 Feb 2025        │  ← line2 (date)
#  │  14:32                  │  ← line3 (time, largest font)
#  │  3 tasks due today      │  ← line4 (tasks summary)
#  │  5 unread emails        │  ← line5 (email count)
#  │  Next: Org Chem 15:00   │  ← line6 (next class)
#  │  ⚠ 2 OVERDUE!           │  ← alert  (red, if any)
#  └─────────────────────────┘
# ══════════════════════════════════════════════════════════════

import logging
from datetime import datetime, timezone, date, time as time_type
from typing import Optional

from app.schemas.webhooks import TFTDisplayPayload

logger = logging.getLogger("jarvis-os.esp32_service")

# TFT display line character limit (320px wide, typical font)
MAX_LINE_LENGTH = 24


def _truncate(text: str, max_len: int = MAX_LINE_LENGTH) -> str:
    """Truncates text to fit on a single TFT display line."""
    if len(text) <= max_len:
        return text
    return text[:max_len - 2] + ".."


class ESP32DisplayService:
    """
    Builds TFT display payloads from live Supabase data.
    Used by the webhook route to respond to ESP32 pings.
    """

    def __init__(self, db):
        self.db = db

    # ──────────────────────────────────────────────────────────
    # MAIN BUILDER — Assembles full display payload
    # ──────────────────────────────────────────────────────────
    async def build_display_payload(self, user_id: str) -> TFTDisplayPayload:
        """
        Fetches live data from Supabase and builds the
        complete 6-line TFT display payload.

        Args:
            user_id: The authenticated user's UUID

        Returns:
            TFTDisplayPayload ready to be serialized and sent to ESP32
        """
        now     = datetime.now(timezone.utc)
        today   = date.today()

        # ── Line 1: System header ─────────────────────────────
        line1 = "JARVIS OS"

        # ── Line 2: Date ──────────────────────────────────────
        line2 = today.strftime("%a %d %b %Y")     # "Mon 15 Feb 2025"

        # ── Line 3: Time ──────────────────────────────────────
        line3 = now.strftime("%H:%M")             # "14:32"

        # ── Line 4: Tasks due today ────────────────────────────
        line4  = await self._build_tasks_line(user_id, today)

        # ── Line 5: Unread email count ─────────────────────────
        line5  = await self._build_email_line(user_id)

        # ── Line 6: Next scheduled event ──────────────────────
        line6  = await self._build_schedule_line(user_id, today, now.time())

        # ── Alert: Overdue tasks ───────────────────────────────
        alert  = await self._build_alert(user_id, now)

        payload = TFTDisplayPayload(
            line1=line1,
            line2=line2,
            line3=line3,
            line4=_truncate(line4),
            line5=_truncate(line5),
            line6=_truncate(line6),
            alert=_truncate(alert) if alert else None,
            refresh_interval_sec=30,
            backlight_brightness=200,
            text_color_hex="#00F5FF",
            alert_color_hex="#FF4444",
        )

        logger.debug(
            f"📺 Display payload built for user {user_id}: "
            f"tasks='{line4}' | email='{line5}' | next='{line6}'"
        )
        return payload

    # ──────────────────────────────────────────────────────────
    # PRIVATE BUILDERS
    # ──────────────────────────────────────────────────────────

    async def _build_tasks_line(self, user_id: str, today: date) -> str:
        """Builds the tasks summary line."""
        try:
            today_str    = today.isoformat()
            result       = (
                self.db.table("tasks")
                .select("id, priority", count="exact")
                .eq("user_id", user_id)
                .not_.in_("status", ["done", "cancelled"])
                .gte("due_date", f"{today_str}T00:00:00+00:00")
                .lte("due_date", f"{today_str}T23:59:59+00:00")
                .execute()
            )
            count    = result.count or 0
            tasks    = result.data or []
            critical = sum(1 for t in tasks if t.get("priority") == "critical")

            if count == 0:
                return "No tasks today"
            elif critical > 0:
                return f"{count} tasks | {critical} CRITICAL"
            else:
                return f"{count} task{'s' if count != 1 else ''} today"

        except Exception as e:
            logger.warning(f"⚠️  tasks line build failed: {e}")
            return "Tasks: unavailable"

    async def _build_email_line(self, user_id: str) -> str:
        """Builds the email unread count line."""
        try:
            result = (
                self.db.table("email_summaries")
                .select("id, ai_action_hint", count="exact")
                .eq("user_id", user_id)
                .eq("is_read", False)
                .execute()
            )
            count       = result.count or 0
            emails      = result.data or []
            needs_reply = sum(
                1 for e in emails
                if e.get("ai_action_hint") == "Reply needed"
            )

            if count == 0:
                return "Inbox clear"
            elif needs_reply > 0:
                return f"{count} unread | {needs_reply} reply"
            else:
                return f"{count} unread email{'s' if count != 1 else ''}"

        except Exception as e:
            logger.warning(f"⚠️  email line build failed: {e}")
            return "Email: unavailable"

    async def _build_schedule_line(
        self,
        user_id:  str,
        today:    date,
        now_time: time_type,
    ) -> str:
        """Builds the next scheduled event line."""
        try:
            # Convert Python weekday (Mon=0) to our schema (Mon=1, Sun=0)
            today_dow = (today.weekday() + 1) % 7

            result = (
                self.db.table("daily_schedule")
                .select("title, start_time, end_time, location, event_type")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .contains("day_of_week", [today_dow])
                .order("start_time", desc=False)
                .execute()
            )
            events = result.data or []

            # Find next upcoming event (after current time)
            now_str = now_time.strftime("%H:%M:%S")
            upcoming = [
                e for e in events
                if e.get("start_time", "23:59:59") > now_str
            ]

            if not upcoming:
                # All events done for today
                if events:
                    return "All classes done today"
                return "No classes today"

            next_event = upcoming[0]
            title      = next_event.get("title", "Event")
            start      = next_event.get("start_time", "")[:5]  # "HH:MM"
            event_type = next_event.get("event_type", "")

            # Prefix by type
            prefix_map = {
                "lab":       "Lab",
                "class":     "Class",
                "tutorial":  "Tut",
                "meeting":   "Meet",
                "study_block": "Study",
            }
            prefix = prefix_map.get(event_type, "Next")

            # Shorten title if needed
            short_title = title[:12] if len(title) > 12 else title

            return f"{prefix}: {short_title} {start}"

        except Exception as e:
            logger.warning(f"⚠️  schedule line build failed: {e}")
            return "Schedule: unavailable"

    async def _build_alert(
        self,
        user_id: str,
        now:     datetime,
    ) -> Optional[str]:
        """
        Returns an alert string if there are overdue tasks.
        Returns None if no alert needed.
        """
        try:
            result = (
                self.db.table("tasks")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .lt("due_date", now.isoformat())
                .not_.in_("status", ["done", "cancelled"])
                .execute()
            )
            count = result.count or 0

            if count > 0:
                return f"!! {count} OVERDUE TASK{'S' if count != 1 else ''}"
            return None

        except Exception as e:
            logger.warning(f"⚠️  alert build failed: {e}")
            return None


# ──────────────────────────────────────────────────────────────
# FACTORY
# ──────────────────────────────────────────────────────────────
def get_esp32_service(db) -> ESP32DisplayService:
    """Creates a new ESP32DisplayService with the given DB client."""
    return ESP32DisplayService(db=db)
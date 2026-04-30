# backend/app/services/ai_service.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — AI Service Layer
#
#  Abstracts Gemini (primary) and OpenAI (fallback) behind
#  a single AIService class. Every route calls this service —
#  never the SDK directly. Swap providers in .env only.
#
#  Methods:
#    brainstorm_idea()     → Expand a raw idea
#    summarize_project()   → Summarize project + tasks
#    suggest_next_steps()  → Action steps for a project
#    summarize_email()     → 1-sentence email summary
#    chat()                → Free-form JARVIS conversation
#    _call_gemini()        → Internal Gemini SDK wrapper
#    _call_openai()        → Internal OpenAI SDK wrapper
# ══════════════════════════════════════════════════════════════

import json
import logging
import time
from typing import Optional

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.config import settings

logger = logging.getLogger("jarvis-os.ai_service")


# ──────────────────────────────────────────────────────────────
# JARVIS SYSTEM PROMPT
# Sets the personality and context for all AI interactions.
# ──────────────────────────────────────────────────────────────
JARVIS_SYSTEM_PROMPT = """
You are JARVIS — a highly intelligent, concise, and helpful AI assistant 
integrated into a personal command center dashboard for a BSc Chemistry 
student and hardware developer.

Your personality:
- Professional, direct, and slightly Tony Stark-esque
- Always give structured, actionable responses
- Use bullet points and numbered lists for clarity
- Keep responses focused and avoid unnecessary padding
- You are aware the user is a BSc Chemistry student at Koshi College
  who also builds hardware projects with ESP32, Arduino, and IoT devices

Response rules:
- Never say "As an AI language model..."
- Never add disclaimers unless truly necessary
- Format lists cleanly — use numbering for steps, bullets for info
- For technical topics, be precise and code-friendly
- Keep summaries SHORT — 1-3 sentences maximum unless asked for more
"""


# ──────────────────────────────────────────────────────────────
# RESULT DATACLASS — Consistent return type from all methods
# ──────────────────────────────────────────────────────────────
class AIResult:
    """
    Standardized result object returned by every AIService method.
    Contains the response text plus usage/provider metadata.
    """
    def __init__(
        self,
        text:             str,
        provider:         str,
        model:            str,
        prompt_tokens:    Optional[int]   = None,
        response_tokens:  Optional[int]   = None,
        total_tokens:     Optional[int]   = None,
        latency_ms:       Optional[float] = None,
    ):
        self.text            = text
        self.provider        = provider
        self.model           = model
        self.prompt_tokens   = prompt_tokens
        self.response_tokens = response_tokens
        self.total_tokens    = total_tokens
        self.latency_ms      = latency_ms

    def to_usage_dict(self) -> dict:
        return {
            "provider":        self.provider,
            "model":           self.model,
            "prompt_tokens":   self.prompt_tokens,
            "response_tokens": self.response_tokens,
            "total_tokens":    self.total_tokens,
            "latency_ms":      self.latency_ms,
        }


# ══════════════════════════════════════════════════════════════
# AI SERVICE CLASS
# ══════════════════════════════════════════════════════════════
class AIService:
    """
    Singleton-style AI service.
    Instantiate once, reuse everywhere.

    Usage:
        from app.services.ai_service import get_ai_service
        ai = get_ai_service()
        result = await ai.brainstorm_idea(raw_idea="My idea here")
    """

    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self._gemini_client  = None
        self._openai_client  = None
        self._initialized    = False

    # ──────────────────────────────────────────────────────────
    # INITIALIZATION — Lazy-loads SDK clients on first use
    # ──────────────────────────────────────────────────────────
    def _init_gemini(self):
        if self._gemini_client is not None:
            return
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not set in .env. "
                "Cannot use Gemini provider."
            )
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._gemini_client = genai
            self._gemini_model  = genai.GenerativeModel(
                model_name="gemini-1.5-flash",      # Fast + cost-effective
                system_instruction=JARVIS_SYSTEM_PROMPT,
                generation_config={
                    "temperature":       0.7,
                    "top_p":             0.9,
                    "max_output_tokens": 2048,
                },
            )
            logger.info("✅ Gemini client initialized (gemini-1.5-flash)")
        except ImportError:
            raise ImportError(
                "google-generativeai not installed. "
                "Run: pip install google-generativeai"
            )

    def _init_openai(self):
        if self._openai_client is not None:
            return
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not set in .env. "
                "Cannot use OpenAI provider."
            )
        try:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
            )
            self._openai_model = "gpt-4o-mini"     # Fast + cost-effective
            logger.info("✅ OpenAI client initialized (gpt-4o-mini)")
        except ImportError:
            raise ImportError(
                "openai not installed. "
                "Run: pip install openai"
            )

    # ──────────────────────────────────────────────────────────
    # INTERNAL: GEMINI CALL WRAPPER
    # ──────────────────────────────────────────────────────────
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def _call_gemini_sync(self, prompt: str) -> AIResult:
        """
        Synchronous Gemini call wrapped with retry logic.
        Gemini SDK is sync — we run it in a thread pool from async context.
        """
        self._init_gemini()
        t0 = time.perf_counter()

        try:
            response = self._gemini_model.generate_content(prompt)
            latency  = (time.perf_counter() - t0) * 1000

            text = response.text.strip()

            # Extract token usage if available
            usage          = getattr(response, "usage_metadata", None)
            prompt_tokens  = getattr(usage, "prompt_token_count",     None)
            output_tokens  = getattr(usage, "candidates_token_count", None)
            total_tokens   = getattr(usage, "total_token_count",      None)

            logger.info(
                f"🧠 Gemini response: {len(text)} chars, "
                f"{total_tokens} tokens, {latency:.0f}ms"
            )

            return AIResult(
                text=text,
                provider="gemini",
                model="gemini-1.5-flash",
                prompt_tokens=prompt_tokens,
                response_tokens=output_tokens,
                total_tokens=total_tokens,
                latency_ms=round(latency, 2),
            )

        except Exception as e:
            logger.error(f"💥 Gemini call failed: {type(e).__name__}: {e}")
            raise

    async def _call_gemini(self, prompt: str) -> AIResult:
        """Async wrapper — runs sync Gemini call in thread pool."""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._call_gemini_sync,
            prompt
        )

    # ──────────────────────────────────────────────────────────
    # INTERNAL: OPENAI CALL WRAPPER
    # ──────────────────────────────────────────────────────────
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    async def _call_openai(self, prompt: str, system: Optional[str] = None) -> AIResult:
        """Async OpenAI call with retry logic."""
        self._init_openai()
        t0 = time.perf_counter()

        try:
            messages = [
                {
                    "role":    "system",
                    "content": system or JARVIS_SYSTEM_PROMPT
                },
                {
                    "role":    "user",
                    "content": prompt
                },
            ]

            response = await self._openai_client.chat.completions.create(
                model=self._openai_model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )

            latency = (time.perf_counter() - t0) * 1000
            text    = response.choices[0].message.content.strip()
            usage   = response.usage

            logger.info(
                f"🧠 OpenAI response: {len(text)} chars, "
                f"{usage.total_tokens} tokens, {latency:.0f}ms"
            )

            return AIResult(
                text=text,
                provider="openai",
                model=self._openai_model,
                prompt_tokens=usage.prompt_tokens,
                response_tokens=usage.completion_tokens,
                total_tokens=usage.total_tokens,
                latency_ms=round(latency, 2),
            )

        except Exception as e:
            logger.error(f"💥 OpenAI call failed: {type(e).__name__}: {e}")
            raise

    # ──────────────────────────────────────────────────────────
    # INTERNAL: PROVIDER ROUTER
    # Calls the configured provider, falls back to the other.
    # ──────────────────────────────────────────────────────────
    async def _generate(self, prompt: str) -> AIResult:
        """
        Routes to the configured provider.
        If primary fails, falls back to the other provider.
        """
        primary   = self.provider
        secondary = "openai" if primary == "gemini" else "gemini"

        try:
            if primary == "gemini":
                return await self._call_gemini(prompt)
            else:
                return await self._call_openai(prompt)

        except Exception as primary_error:
            logger.warning(
                f"⚠️  Primary provider ({primary}) failed: {primary_error}. "
                f"Falling back to {secondary}..."
            )
            try:
                if secondary == "gemini":
                    return await self._call_gemini(prompt)
                else:
                    return await self._call_openai(prompt)
            except Exception as fallback_error:
                logger.error(
                    f"💥 Both AI providers failed. "
                    f"Primary: {primary_error} | "
                    f"Fallback: {fallback_error}"
                )
                raise RuntimeError(
                    f"All AI providers failed. "
                    f"Check your API keys and rate limits. "
                    f"Error: {primary_error}"
                )

    # ══════════════════════════════════════════════════════════
    # PUBLIC METHOD 1: BRAINSTORM IDEA
    # ══════════════════════════════════════════════════════════
    async def brainstorm_idea(
        self,
        raw_idea: str,
        context:  Optional[str] = None,
    ) -> dict:
        """
        Expands a raw idea into a detailed brainstorm.

        Returns:
            {
                "expanded":    str,   # Full expansion
                "feasibility": str,   # Feasibility assessment
                "tags":        list,  # Suggested tags
            }
        """
        context_block = f"\nExtra context: {context}" if context else ""

        prompt = f"""
You are helping a BSc Chemistry student and hardware developer brainstorm a project idea.
{context_block}

RAW IDEA:
"{raw_idea}"

Please provide a structured brainstorm with exactly these sections:

## EXPANDED IDEA
Write 3-5 sentences expanding on this idea with specific details, 
potential features, and implementation approaches.

## FEASIBILITY
Write 2-3 sentences assessing feasibility for a student with 
chemistry and hardware skills. Rate as: HIGH / MEDIUM / LOW feasibility.

## SUGGESTED TAGS
List 5-8 relevant tags as a JSON array of lowercase strings.
Example: ["python", "hardware", "chemistry", "automation"]

Respond ONLY with these three sections. No extra text before or after.
"""

        result   = await self._generate(prompt)
        raw_text = result.text

        # ── Parse sections from response ──────────────────────
        expanded    = self._extract_section(raw_text, "EXPANDED IDEA")
        feasibility = self._extract_section(raw_text, "FEASIBILITY")
        tags_raw    = self._extract_section(raw_text, "SUGGESTED TAGS")

        # Parse JSON tags array from the section text
        tags = self._parse_tags(tags_raw)

        return {
            "expanded":    expanded    or raw_text,
            "feasibility": feasibility or "Assessment not available.",
            "tags":        tags,
            "raw_response": raw_text,
            "usage":       result.to_usage_dict(),
        }

    # ══════════════════════════════════════════════════════════
    # PUBLIC METHOD 2: SUMMARIZE PROJECT
    # ══════════════════════════════════════════════════════════
    async def summarize_project(
        self,
        project_title:       str,
        project_description: Optional[str],
        project_status:      str,
        project_category:    Optional[str],
        tasks:               Optional[list] = None,
        extra_notes:         Optional[str]  = None,
    ) -> dict:
        """
        Generates a concise AI summary of a project.

        Returns:
            {
                "summary": str  — 2-3 sentence project summary
            }
        """
        tasks_block = ""
        if tasks:
            todo_tasks = [t for t in tasks if t.get("status") != "done"][:10]
            done_count = sum(1 for t in tasks if t.get("status") == "done")
            if todo_tasks:
                task_lines = "\n".join(
                    f"  - [{t['priority'].upper()}] {t['title']}"
                    for t in todo_tasks
                )
                tasks_block = (
                    f"\n\nACTIVE TASKS ({len(todo_tasks)} pending, "
                    f"{done_count} completed):\n{task_lines}"
                )

        extra_block = f"\n\nExtra notes: {extra_notes}" if extra_notes else ""

        prompt = f"""
Summarize this project in 2-3 concise, informative sentences.
Focus on what it is, what stage it's at, and what it aims to achieve.

PROJECT:
Title:       {project_title}
Category:    {project_category or 'General'}
Status:      {project_status}
Description: {project_description or 'No description provided.'}
{tasks_block}
{extra_block}

Write ONLY the summary sentences. No headers, no bullet points.
Make it sound like a professional project brief, not a list.
"""

        result  = await self._generate(prompt)
        summary = result.text.strip()

        return {
            "summary": summary,
            "usage":   result.to_usage_dict(),
        }

    # ══════════════════════════════════════════════════════════
    # PUBLIC METHOD 3: SUGGEST NEXT STEPS
    # ══════════════════════════════════════════════════════════
    async def suggest_next_steps(
        self,
        project_title:       str,
        project_description: Optional[str],
        project_status:      str,
        progress_percent:    int,
        pending_tasks:       Optional[list] = None,
        ai_summary:          Optional[str]  = None,
    ) -> dict:
        """
        Suggests the next 3-5 concrete action steps for a project.

        Returns:
            {
                "next_steps":  str,   — Formatted multi-line string
                "steps_list":  list,  — Clean list for frontend rendering
            }
        """
        tasks_block = ""
        if pending_tasks:
            task_lines = "\n".join(
                f"  - [{t.get('priority','medium').upper()}] "
                f"{t['title']} ({t.get('status','todo')})"
                for t in pending_tasks[:8]
            )
            tasks_block = f"\nCurrent pending tasks:\n{task_lines}"

        summary_block = (
            f"\nProject summary: {ai_summary}"
            if ai_summary else ""
        )

        prompt = f"""
You are helping plan the next steps for this project.

PROJECT:
Title:       {project_title}
Status:      {project_status}
Progress:    {progress_percent}%
Description: {project_description or 'No description.'}
{summary_block}
{tasks_block}

Generate exactly 3-5 concrete, actionable next steps.
Each step should be specific and achievable within 1-2 days.

Format your response as a numbered list ONLY:
1. [Step description]
2. [Step description]
3. [Step description]

No introduction text. No conclusion text. Just the numbered list.
"""

        result   = await self._generate(prompt)
        raw_text = result.text.strip()

        # ── Parse numbered list into clean array ──────────────
        steps_list = self._parse_numbered_list(raw_text)

        return {
            "next_steps": raw_text,
            "steps_list": steps_list,
            "usage":      result.to_usage_dict(),
        }

    # ══════════════════════════════════════════════════════════
    # PUBLIC METHOD 4: SUMMARIZE EMAIL
    # ══════════════════════════════════════════════════════════
    async def summarize_email(
        self,
        email_body: str,
        subject:    Optional[str] = None,
        sender:     Optional[str] = None,
    ) -> dict:
        """
        Generates a 1-sentence email summary + action hint.
        Called by both the API route AND the Phase 4 IMAP poller.

        Returns:
            {
                "summary":     str,  — 1 sentence
                "action_hint": str,  — "Reply needed" / "FYI only" / etc.
            }
        """
        # Truncate very long emails to save tokens
        truncated_body = email_body[:2000]
        if len(email_body) > 2000:
            truncated_body += "\n[... email truncated ...]"

        subject_block = f"Subject: {subject}" if subject else ""
        sender_block  = f"From: {sender}"     if sender  else ""

        prompt = f"""
Analyze this email and provide exactly two things:

{sender_block}
{subject_block}

EMAIL BODY:
{truncated_body}

---

Respond in this EXACT format (no other text):

SUMMARY: [One clear sentence describing what this email is about]
ACTION: [One of: "Reply needed" | "Action required" | "FYI only" | "Meeting/event" | "Deadline alert" | "No action needed"]
"""

        result   = await self._generate(prompt)
        raw_text = result.text.strip()

        # ── Parse SUMMARY and ACTION lines ────────────────────
        summary     = "Email received."
        action_hint = "No action needed"

        for line in raw_text.split("\n"):
            line = line.strip()
            if line.upper().startswith("SUMMARY:"):
                summary     = line[8:].strip()
            elif line.upper().startswith("ACTION:"):
                action_hint = line[7:].strip()

        return {
            "summary":     summary,
            "action_hint": action_hint,
            "usage":       result.to_usage_dict(),
        }

    # ══════════════════════════════════════════════════════════
    # PUBLIC METHOD 5: JARVIS CHAT
    # ══════════════════════════════════════════════════════════
    async def chat(
        self,
        message:      str,
        context_data: Optional[dict] = None,
        history:      Optional[list] = None,
    ) -> dict:
        """
        Free-form conversation with JARVIS.
        context_data can contain:
            {
                "projects":  [...],  # Active project list
                "tasks":     [...],  # Today's tasks
                "schedule":  [...],  # Today's schedule events
            }

        Returns:
            {
                "reply":        str,
                "context_used": list[str],
            }
        """
        context_block = ""
        context_used  = []

        if context_data:
            # ── Inject projects context ───────────────────────
            projects = context_data.get("projects", [])
            if projects:
                proj_lines = "\n".join(
                    f"  - {p['title']} [{p['status']}] "
                    f"({p.get('progress_percent', 0)}% done)"
                    for p in projects[:10]
                )
                context_block += f"\n\nUSER'S ACTIVE PROJECTS:\n{proj_lines}"
                context_used.append("projects")

            # ── Inject tasks context ──────────────────────────
            tasks = context_data.get("tasks", [])
            if tasks:
                task_lines = "\n".join(
                    f"  - [{t.get('priority','medium').upper()}] "
                    f"{t['title']}"
                    f"{' (OVERDUE)' if t.get('overdue') else ''}"
                    for t in tasks[:10]
                )
                context_block += f"\n\nTODAY'S PENDING TASKS:\n{task_lines}"
                context_used.append("tasks")

            # ── Inject schedule context ───────────────────────
            schedule = context_data.get("schedule", [])
            if schedule:
                sched_lines = "\n".join(
                    f"  - {s.get('start_time','?')} — "
                    f"{s['title']}"
                    f"{' @ ' + s['location'] if s.get('location') else ''}"
                    for s in schedule[:8]
                )
                context_block += f"\n\nTODAY'S SCHEDULE:\n{sched_lines}"
                context_used.append("schedule")

        # ── Build conversation history ─────────────────────────
        history_block = ""
        if history:
            history_lines = []
            for turn in history[-10:]:     # Last 10 turns only
                role = "User"  if turn.get("role") == "user"  else "JARVIS"
                history_lines.append(f"{role}: {turn.get('text', '')}")
            if history_lines:
                history_block = (
                    "\n\nCONVERSATION HISTORY:\n"
                    + "\n".join(history_lines)
                )

        full_prompt = f"""
{JARVIS_SYSTEM_PROMPT}
{context_block}
{history_block}

USER MESSAGE: {message}

Respond as JARVIS. Be helpful, direct, and concise.
"""

        result = await self._generate(full_prompt)

        return {
            "reply":        result.text.strip(),
            "context_used": context_used,
            "usage":        result.to_usage_dict(),
        }

    # ══════════════════════════════════════════════════════════
    # PRIVATE HELPERS — Text parsing utilities
    # ══════════════════════════════════════════════════════════
    @staticmethod
    def _extract_section(text: str, section_name: str) -> Optional[str]:
        """
        Extracts content between ## SECTION_NAME and the next ## header.
        Handles variations like "## EXPANDED IDEA", "EXPANDED IDEA:", etc.
        """
        import re
        # Try markdown heading format first
        pattern = rf"##\s*{re.escape(section_name)}\s*\n(.*?)(?=##|\Z)"
        match   = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

        # Fallback: plain "SECTION:" format
        pattern2 = rf"{re.escape(section_name)}[:\s]*\n(.*?)(?=\n[A-Z\s]{{4,}}:|\Z)"
        match2   = re.search(pattern2, text, re.DOTALL | re.IGNORECASE)
        if match2:
            return match2.group(1).strip()

        return None

    @staticmethod
    def _parse_tags(tags_text: Optional[str]) -> list:
        """
        Extracts a list of tags from a section that might contain
        a JSON array, a comma-separated list, or bullet points.
        """
        if not tags_text:
            return []

        import re

        # Try JSON array first: ["tag1", "tag2"]
        json_match = re.search(r'$$.*?$$', tags_text, re.DOTALL)
        if json_match:
            try:
                tags = json.loads(json_match.group(0))
                return [str(t).lower().strip() for t in tags if t]
            except json.JSONDecodeError:
                pass

        # Fallback: comma-separated or newline-separated
        raw_tags = re.split(r'[,\n•\-]+', tags_text)
        cleaned  = [
            re.sub(r'[^a-zA-Z0-9\-_]', '', t).lower().strip()
            for t in raw_tags
            if t.strip()
        ]
        return [t for t in cleaned if 2 <= len(t) <= 30][:8]

    @staticmethod
    def _parse_numbered_list(text: str) -> list:
        """
        Extracts items from a numbered list like:
        1. Item one
        2. Item two
        """
        import re
        items   = re.findall(r'^\d+\.\s+(.+)$', text, re.MULTILINE)
        cleaned = [item.strip() for item in items if item.strip()]
        return cleaned if cleaned else [text.strip()]


# ──────────────────────────────────────────────────────────────
# SINGLETON FACTORY
# Import and call this wherever you need the AI service.
# ──────────────────────────────────────────────────────────────
_ai_service_instance: Optional[AIService] = None


def get_ai_service() -> AIService:
    """
    Returns the singleton AIService instance.
    Use as FastAPI dependency:
        ai: AIService = Depends(get_ai_service)
    Or import directly in services:
        from app.services.ai_service import get_ai_service
        ai = get_ai_service()
    """
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
        logger.info(
            f"✅ AIService initialized — "
            f"provider: {settings.AI_PROVIDER}"
        )
    return _ai_service_instance# Jarvis OS Backend Module

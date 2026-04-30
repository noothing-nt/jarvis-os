# backend/tests/test_ai_service.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — AI Service Unit Tests
#
#  Tests AI service methods with mocked LLM responses.
#  No real API calls are made — saves tokens during CI/CD.
#
#  Run: pytest tests/test_ai_service.py -v
# ══════════════════════════════════════════════════════════════

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_service import AIService, AIResult


# ──────────────────────────────────────────────────────────────
# FIXTURES
# ──────────────────────────────────────────────────────────────

@pytest.fixture
def ai_service():
    """Fresh AIService instance for each test."""
    return AIService()


@pytest.fixture
def mock_ai_result():
    """Factory for mock AIResult objects."""
    def _make(text: str) -> AIResult:
        return AIResult(
            text=text,
            provider="gemini",
            model="gemini-1.5-flash",
            prompt_tokens=100,
            response_tokens=200,
            total_tokens=300,
            latency_ms=450.0,
        )
    return _make


# ──────────────────────────────────────────────────────────────
# TEST: AIResult.to_usage_dict()
# ──────────────────────────────────────────────────────────────
def test_ai_result_to_usage_dict():
    result = AIResult(
        text="Test response",
        provider="gemini",
        model="gemini-1.5-flash",
        prompt_tokens=50,
        response_tokens=100,
        total_tokens=150,
        latency_ms=320.5,
    )
    usage = result.to_usage_dict()

    assert usage["provider"]        == "gemini"
    assert usage["model"]           == "gemini-1.5-flash"
    assert usage["prompt_tokens"]   == 50
    assert usage["response_tokens"] == 100
    assert usage["total_tokens"]    == 150
    assert usage["latency_ms"]      == 320.5


# ──────────────────────────────────────────────────────────────
# TEST: _extract_section() helper
# ──────────────────────────────────────────────────────────────
def test_extract_section_markdown():
    text = """
## EXPANDED IDEA
This is the expanded idea content.
It spans multiple lines.

## FEASIBILITY
HIGH feasibility for a student project.

## SUGGESTED TAGS
["python", "chemistry", "automation"]
"""
    expanded    = AIService._extract_section(text, "EXPANDED IDEA")
    feasibility = AIService._extract_section(text, "FEASIBILITY")
    tags        = AIService._extract_section(text, "SUGGESTED TAGS")

    assert expanded    is not None
    assert "expanded idea content" in expanded
    assert feasibility is not None
    assert "HIGH feasibility"      in feasibility
    assert tags        is not None
    assert "python"                in tags


def test_extract_section_missing():
    text    = "Some text without any sections"
    result  = AIService._extract_section(text, "NONEXISTENT")
    assert result is None


# ──────────────────────────────────────────────────────────────
# TEST: _parse_tags() helper
# ──────────────────────────────────────────────────────────────
def test_parse_tags_json_array():
    tags_text = '["python", "chemistry", "automation", "gemini"]'
    tags      = AIService._parse_tags(tags_text)

    assert isinstance(tags, list)
    assert "python"     in tags
    assert "chemistry"  in tags
    assert "automation" in tags


def test_parse_tags_comma_separated():
    tags_text = "python, chemistry, automation, gemini-api"
    tags      = AIService._parse_tags(tags_text)

    assert isinstance(tags, list)
    assert len(tags) > 0


def test_parse_tags_empty():
    tags = AIService._parse_tags(None)
    assert tags == []

    tags = AIService._parse_tags("")
    assert tags == []


def test_parse_tags_with_bullets():
    tags_text = """
- python
- chemistry
• automation
• hardware
"""
    tags = AIService._parse_tags(tags_text)
    assert isinstance(tags, list)
    assert len(tags) > 0


# ──────────────────────────────────────────────────────────────
# TEST: _parse_numbered_list() helper
# ──────────────────────────────────────────────────────────────
def test_parse_numbered_list_standard():
    text = """1. Set up the ESP32 development environment
2. Install TFT_eSPI library in Arduino IDE
3. Wire the display to the ESP32 GPIO pins
4. Flash the test sketch and verify display"""

    steps = AIService._parse_numbered_list(text)

    assert len(steps) == 4
    assert "ESP32 development environment" in steps[0]
    assert "TFT_eSPI library"             in steps[1]


def test_parse_numbered_list_empty():
    steps = AIService._parse_numbered_list("No numbered list here")
    assert isinstance(steps, list)
    assert len(steps) == 1    # Falls back to returning the whole text


# ──────────────────────────────────────────────────────────────
# TEST: brainstorm_idea() — with mocked _generate
# ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_brainstorm_idea_success(ai_service, mock_ai_result):
    mock_response_text = """
## EXPANDED IDEA
This tool would use Google Gemini API to accept voice or text notes from
chemistry lab sessions, then automatically format them into a professional
lab report PDF with sections for Aim, Theory, Observations, and Conclusion.
It could integrate with Google Drive for storage.

## FEASIBILITY
HIGH feasibility. Python + Gemini API is well-documented and the student
already has Python skills. PDF generation with reportlab is straightforward.
Timeline estimate: 2-3 weeks for a working prototype.

## SUGGESTED TAGS
["python", "gemini-api", "chemistry", "automation", "pdf-generation", "lab-report"]
"""

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_response_text)
    ):
        result = await ai_service.brainstorm_idea(
            raw_idea="Build a tool to auto-generate chemistry lab reports",
            context="BSc Chemistry student",
        )

    assert "expanded"    in result
    assert "feasibility" in result
    assert "tags"        in result
    assert "usage"       in result

    assert len(result["expanded"])    > 10
    assert "HIGH"                     in result["feasibility"]
    assert isinstance(result["tags"], list)
    assert len(result["tags"])        > 0


@pytest.mark.asyncio
async def test_brainstorm_idea_ai_failure(ai_service):
    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        side_effect=RuntimeError("Both AI providers failed"),
    ):
        with pytest.raises(RuntimeError, match="Both AI providers failed"):
            await ai_service.brainstorm_idea(raw_idea="Test idea")


# ──────────────────────────────────────────────────────────────
# TEST: summarize_project() — with mocked _generate
# ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_summarize_project_success(ai_service, mock_ai_result):
    mock_summary = (
        "The JARVIS TFT Display project aims to build a Tony Stark-style "
        "HUD on a 2.8-inch TFT screen driven by an ESP32 microcontroller. "
        "Currently in active development at 25% completion with WiFi "
        "integration and task display as the next milestones."
    )

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_summary)
    ):
        result = await ai_service.summarize_project(
            project_title="JARVIS TFT Display",
            project_description="ESP32 HUD display project",
            project_status="active",
            project_category="hardware",
            tasks=[
                {"title": "Wire display",   "status": "todo",        "priority": "high"},
                {"title": "Flash firmware", "status": "in_progress", "priority": "high"},
                {"title": "Test WiFi",      "status": "todo",        "priority": "medium"},
            ],
        )

    assert "summary" in result
    assert "usage"   in result
    assert len(result["summary"]) > 20
    assert "JARVIS" in result["summary"]


# ──────────────────────────────────────────────────────────────
# TEST: suggest_next_steps() — with mocked _generate
# ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_suggest_next_steps_success(ai_service, mock_ai_result):
    mock_steps = """1. Wire the 2.8-inch TFT display to ESP32 SPI pins (MOSI, MISO, CLK, CS)
2. Install and configure TFT_eSPI library with correct driver settings
3. Flash the basic display test sketch to verify hardware connections
4. Implement WiFi connection and HTTP client to poll the JARVIS backend
5. Build the 4-line HUD layout showing time, tasks, and email count"""

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_steps)
    ):
        result = await ai_service.suggest_next_steps(
            project_title="JARVIS TFT Display",
            project_description="ESP32 HUD display",
            project_status="active",
            progress_percent=25,
        )

    assert "next_steps"  in result
    assert "steps_list"  in result
    assert "usage"       in result

    assert isinstance(result["steps_list"], list)
    assert len(result["steps_list"]) == 5
    assert "TFT display"             in result["steps_list"][0]


# ──────────────────────────────────────────────────────────────
# TEST: summarize_email() — with mocked _generate
# ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_summarize_email_success(ai_service, mock_ai_result):
    mock_response = """SUMMARY: The college admin has released the BSc Chemistry practical exam schedule starting March 15th across three days.
ACTION: Deadline alert"""

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_response)
    ):
        result = await ai_service.summarize_email(
            email_body="The practical exam schedule starts March 15th...",
            subject="Practical Exam Schedule",
            sender="admin@koshicollege.edu.np",
        )

    assert "summary"     in result
    assert "action_hint" in result
    assert "usage"       in result

    assert len(result["summary"])     > 10
    assert result["action_hint"]      == "Deadline alert"
    assert "March 15"                 in result["summary"]


@pytest.mark.asyncio
async def test_summarize_email_parse_fallback(ai_service, mock_ai_result):
    """
    If LLM returns unexpected format, parser should gracefully fall back
    to default values rather than crashing.
    """
    mock_response = "The exam schedule has been updated. No further action needed."

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_response)
    ):
        result = await ai_service.summarize_email(
            email_body="Exam schedule updated.",
        )

    # Should fall back to defaults, not raise
    assert result["summary"]     == "Email received."
    assert result["action_hint"] == "No action needed"


# ──────────────────────────────────────────────────────────────
# TEST: chat() — with mocked _generate
# ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_chat_simple(ai_service, mock_ai_result):
    mock_reply = "Good morning! You have 3 tasks due today and Organic Chemistry at 9 AM. Start with the highest priority task first."

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_reply)
    ):
        result = await ai_service.chat(
            message="What should I focus on today?",
        )

    assert "reply"        in result
    assert "context_used" in result
    assert "usage"        in result
    assert len(result["reply"]) > 10
    assert result["context_used"] == []    # No context injected


@pytest.mark.asyncio
async def test_chat_with_context(ai_service, mock_ai_result):
    mock_reply = "Based on your schedule, you have Organic Chemistry at 9 AM. Focus on your high-priority task first."

    with patch.object(
        ai_service,
        "_generate",
        new_callable=AsyncMock,
        return_value=mock_ai_result(mock_reply)
    ):
        result = await ai_service.chat(
            message="What should I do today?",
            context_data={
                "projects": [
                    {"title": "JARVIS Display", "status": "active", "progress_percent": 25}
                ],
                "tasks": [
                    {"title": "Lab report", "priority": "high", "status": "todo"}
                ],
                "schedule": [
                    {"title": "Organic Chemistry", "start_time": "09:00:00", "location": "Hall B"}
                ],
            },
        )

    assert "reply"        in result
    assert "projects"     in result["context_used"]
    assert "tasks"        in result["context_used"]
    assert "schedule"     in result["context_used"]


# ──────────────────────────────────────────────────────────────
# TEST: Provider fallback logic — _generate()
# ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_generate_falls_back_to_secondary(ai_service, mock_ai_result):
    """
    When primary (Gemini) fails, should fall back to OpenAI.
    """
    fallback_result = mock_ai_result("Fallback OpenAI response")
    fallback_result.provider = "openai"

    with patch.object(
        ai_service,
        "_call_gemini",
        new_callable=AsyncMock,
        side_effect=Exception("Gemini rate limit exceeded"),
    ):
        with patch.object(
            ai_service,
            "_call_openai",
            new_callable=AsyncMock,
            return_value=fallback_result,
        ):
            ai_service.provider = "gemini"   # Set primary to gemini
            result = await ai_service._generate("Test prompt")

    assert result.provider == "openai"
    assert result.text     == "Fallback OpenAI response"


@pytest.mark.asyncio
async def test_generate_raises_when_both_fail(ai_service):
    """
    When both providers fail, should raise RuntimeError.
    """
    with patch.object(
        ai_service,
        "_call_gemini",
        new_callable=AsyncMock,
        side_effect=Exception("Gemini failed"),
    ):
        with patch.object(
            ai_service,
            "_call_openai",
            new_callable=AsyncMock,
            side_effect=Exception("OpenAI failed"),
        ):
            with pytest.raises(RuntimeError, match="All AI providers failed"):
                await ai_service._generate("Test prompt")


# ──────────────────────────────────────────────────────────────
# TEST: get_ai_service() singleton
# ──────────────────────────────────────────────────────────────
def test_get_ai_service_singleton():
    from app.services.ai_service import get_ai_service
    import app.services.ai_service as ai_module

    # Reset singleton for clean test
    ai_module._ai_service_instance = None

    service1 = get_ai_service()
    service2 = get_ai_service()

    assert service1 is service2    # Same instance# Jarvis OS Backend Module

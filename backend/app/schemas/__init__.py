# backend/app/schemas/__init__.py
# ══════════════════════════════════════════════════════════════
#  Central schema exports — Updated for Phase 4
# ══════════════════════════════════════════════════════════════

# ── Phase 2 Schemas ───────────────────────────────────────────
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectListResponse, ProjectStatsResponse,
)
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskListResponse, TaskCompleteResponse,
)
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse,
    ScheduleListResponse, TodayScheduleResponse,
)
from app.schemas.idea import (
    IdeaCreate, IdeaUpdate, IdeaResponse,
    IdeaListResponse, IdeaPromoteRequest,
)
from app.schemas.hardware import (
    HardwareCreate, HardwareUpdate, HardwareResponse,
    HardwareListResponse,
)

# ── Phase 3 Schemas ───────────────────────────────────────────
from app.schemas.ai import (
    BrainstormRequest,     BrainstormResponse,
    SummarizeRequest,      SummarizeResponse,
    NextStepsRequest,      NextStepsResponse,
    ChatRequest,           ChatResponse,
    EmailSummarizeRequest, EmailSummarizeResponse,
    AIUsageStats,
)

# ── Phase 4 Schemas ───────────────────────────────────────────
from app.schemas.comms import (
    EmailSummaryResponse,
    EmailListResponse,
    EmailUpdateRequest,
    CommsStatsResponse,
    AccountStats,
    RefreshResponse,
    IMAPAccountConfig,
)
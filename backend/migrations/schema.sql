-- ============================================================
--  JARVIS OS — Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For fuzzy text search on titles


-- ============================================================
-- TABLE 1: PROFILES
-- Extends Supabase Auth (auth.users) with custom fields.
-- A trigger auto-creates this row on new user signup.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username      TEXT        UNIQUE NOT NULL,
    full_name     TEXT,
    avatar_url    TEXT,
    college       TEXT        DEFAULT 'Koshi College',
    program       TEXT        DEFAULT 'BSc Chemistry',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: PROJECTS
-- Core project/idea tracking with AI summary support.
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id                  UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id             UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    -- Identity
    title               TEXT        NOT NULL,
    description         TEXT,
    category            TEXT,                            -- 'hardware', 'software', 'chemistry', 'personal'
    tags                TEXT[]      DEFAULT '{}',

    -- Status & Priority
    status              TEXT        DEFAULT 'active'
                        CHECK (status IN ('idea', 'active', 'paused', 'completed', 'archived')),
    priority            TEXT        DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress_percent    INTEGER     DEFAULT 0
                        CHECK (progress_percent BETWEEN 0 AND 100),

    -- Dates
    start_date          DATE,
    due_date            DATE,
    completed_at        TIMESTAMPTZ,

    -- Integrations
    gdrive_folder_id    TEXT,                            -- Linked Google Drive folder
    ai_summary          TEXT,                            -- LLM-generated project summary
    ai_next_steps       TEXT,                            -- LLM-suggested next actions

    -- HUD Display
    color_hex           TEXT        DEFAULT '#00F5FF',   -- Accent color for UI card
    is_pinned           BOOLEAN     DEFAULT FALSE,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 3: HARDWARE_INVENTORY
-- Track physical components, linked optionally to a project.
-- ============================================================
CREATE TABLE IF NOT EXISTS hardware_inventory (
    id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    project_id      UUID    REFERENCES projects(id) ON DELETE SET NULL,

    component_name  TEXT    NOT NULL,
    model_number    TEXT,
    quantity        INTEGER DEFAULT 1 CHECK (quantity >= 0),
    unit            TEXT    DEFAULT 'pcs',              -- 'pcs', 'meters', 'grams', etc.

    status          TEXT    DEFAULT 'available'
                    CHECK (status IN ('available', 'in_use', 'ordered', 'broken', 'depleted')),

    location        TEXT,                               -- e.g., 'Shelf A', 'Drawer 2'
    purchase_url    TEXT,
    price_inr       NUMERIC(10, 2),
    notes           TEXT,
    datasheet_url   TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 4: TASKS
-- General tasks, linked to a project or standalone.
-- Supports recurring tasks via RRULE.
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    project_id      UUID    REFERENCES projects(id) ON DELETE CASCADE,     -- NULL = personal task

    title           TEXT    NOT NULL,
    description     TEXT,
    tags            TEXT[]  DEFAULT '{}',

    -- Status & Priority
    status          TEXT    DEFAULT 'todo'
                    CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
    priority        TEXT    DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- Timing
    due_date        TIMESTAMPTZ,
    reminder_at     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    -- Recurrence (RFC 5545 RRULE format)
    is_recurring    BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,                               -- e.g., 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
    parent_task_id  UUID    REFERENCES tasks(id) ON DELETE SET NULL,  -- for sub-tasks

    -- Display
    is_pinned       BOOLEAN DEFAULT FALSE,
    color_hex       TEXT    DEFAULT '#00F5FF',

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 5: DAILY_SCHEDULE
-- Koshi College BSc Chemistry class timetable + personal blocks.
-- day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_schedule (
    id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    title           TEXT    NOT NULL,                   -- e.g., 'Organic Chemistry'
    description     TEXT,
    subject         TEXT,                               -- e.g., 'CHE-301'

    event_type      TEXT    DEFAULT 'class'
                    CHECK (event_type IN (
                        'class', 'lab', 'tutorial',
                        'study_block', 'break',
                        'meeting', 'personal', 'reminder'
                    )),

    -- Recurring weekly schedule
    day_of_week     INTEGER[]   NOT NULL,               -- e.g., '{1,3,5}' = Mon/Wed/Fri
    start_time      TIME        NOT NULL,               -- e.g., '09:00:00'
    end_time        TIME        NOT NULL,               -- e.g., '10:30:00'

    -- Metadata
    location        TEXT,                               -- e.g., 'Lab 3', 'Hall B'
    instructor      TEXT,
    semester        TEXT    DEFAULT 'Sem-I 2025',

    -- Display
    color_hex       TEXT    DEFAULT '#00F5FF',
    is_active       BOOLEAN DEFAULT TRUE,               -- Toggle off during exams/holidays

    -- Date range for this schedule block
    valid_from      DATE    DEFAULT CURRENT_DATE,
    valid_until     DATE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate time slots on the same days
    CONSTRAINT no_time_overlap CHECK (start_time < end_time)
);


-- ============================================================
-- TABLE 6: IDEAS
-- Raw ideas captured quickly, then AI-expanded and optionally
-- promoted into full Projects.
-- ============================================================
CREATE TABLE IF NOT EXISTS ideas (
    id                  UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id             UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    title               TEXT    NOT NULL,
    raw_idea            TEXT    NOT NULL,               -- User's original input
    ai_expanded         TEXT,                           -- LLM brainstormed expansion
    ai_feasibility      TEXT,                           -- LLM feasibility note
    tags                TEXT[]  DEFAULT '{}',

    status              TEXT    DEFAULT 'raw'
                        CHECK (status IN ('raw', 'evaluated', 'promoted', 'discarded')),

    promoted_project_id UUID    REFERENCES projects(id) ON DELETE SET NULL,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 7: EMAIL_SUMMARIES
-- Stores AI-processed email records from IMAP polling.
-- message_id is unique to prevent duplicate inserts.
-- ============================================================
CREATE TABLE IF NOT EXISTS email_summaries (
    id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    -- Account Info
    account_label   TEXT    NOT NULL,                   -- 'personal', 'college', 'work'
    account_email   TEXT    NOT NULL,

    -- Email Data
    sender_name     TEXT,
    sender_email    TEXT    NOT NULL,
    subject         TEXT    NOT NULL,
    raw_snippet     TEXT,                               -- First ~300 chars of body
    received_at     TIMESTAMPTZ NOT NULL,

    -- AI Processing
    ai_summary      TEXT,                               -- 1-sentence LLM summary
    ai_action_hint  TEXT,                               -- e.g., 'Reply needed', 'No action'

    -- State
    is_read         BOOLEAN DEFAULT FALSE,
    is_actioned     BOOLEAN DEFAULT FALSE,
    is_starred      BOOLEAN DEFAULT FALSE,

    -- Deduplication key (IMAP Message-ID header)
    message_id      TEXT    UNIQUE NOT NULL,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 8: ESP32_DEVICES
-- Tracks registered ESP32 hardware devices and their state.
-- ============================================================
CREATE TABLE IF NOT EXISTS esp32_devices (
    id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    device_id       TEXT    UNIQUE NOT NULL,            -- e.g., 'esp32-tft-01'
    device_name     TEXT    DEFAULT 'TFT HUD Display',
    firmware_ver    TEXT,

    -- Live State
    is_online       BOOLEAN DEFAULT FALSE,
    last_ping       TIMESTAMPTZ,
    display_mode    TEXT    DEFAULT 'clock'
                    CHECK (display_mode IN ('clock', 'tasks', 'email_count', 'weather', 'custom')),

    -- Flexible payload sent to display
    current_payload JSONB   DEFAULT '{}',

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 9: ACTIVITY_LOGS
-- Audit trail for the personal growth tracker.
-- Every action (task done, project created, idea captured) is logged.
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    -- What happened
    action_type     TEXT    NOT NULL,                   -- 'task_completed', 'project_created', etc.
    entity_type     TEXT,                               -- 'task', 'project', 'idea', 'email'
    entity_id       UUID,
    entity_title    TEXT,                               -- Snapshot of title at time of action

    -- Extra context
    metadata        JSONB   DEFAULT '{}',               -- Any relevant extra data

    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES — For Query Performance
-- ============================================================
CREATE INDEX idx_projects_user_status   ON projects(user_id, status);
CREATE INDEX idx_projects_pinned        ON projects(user_id, is_pinned);
CREATE INDEX idx_tasks_user_status      ON tasks(user_id, status);
CREATE INDEX idx_tasks_project_id       ON tasks(project_id);
CREATE INDEX idx_tasks_due_date         ON tasks(due_date);
CREATE INDEX idx_tasks_reminder         ON tasks(reminder_at);
CREATE INDEX idx_schedule_user_day      ON daily_schedule(user_id, day_of_week);
CREATE INDEX idx_email_message_id       ON email_summaries(message_id);
CREATE INDEX idx_email_user_account     ON email_summaries(user_id, account_label);
CREATE INDEX idx_email_received_at      ON email_summaries(received_at DESC);
CREATE INDEX idx_ideas_user_status      ON ideas(user_id, status);
CREATE INDEX idx_activity_user_date     ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_hardware_user_project  ON hardware_inventory(user_id, project_id);

-- Full-text search index on project titles
CREATE INDEX idx_projects_title_search  ON projects USING gin(title gin_trgm_ops);
CREATE INDEX idx_tasks_title_search     ON tasks    USING gin(title gin_trgm_ops);


-- ============================================================
-- AUTO-UPDATE TRIGGER — updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS 
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
 LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO 
$$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles', 'projects', 'hardware_inventory',
        'tasks', 'daily_schedule', 'ideas', 'esp32_devices'
    ]
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        ', t);
    END LOOP;
END;
$$
;


-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Creates a profile row automatically when a user signs up
-- via Supabase Auth.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS 
$$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$
 LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Supabase Multi-tenant Safety
-- Every user can ONLY see and modify their own data.
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_summaries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE esp32_devices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs      ENABLE ROW LEVEL SECURITY;

-- Generic RLS policies (replicate for each table)
CREATE POLICY "owner_all_projects"   ON projects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_tasks"      ON tasks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_schedule"   ON daily_schedule
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_ideas"      ON ideas
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_emails"     ON email_summaries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_hardware"   ON hardware_inventory
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_logs"       ON activity_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "owner_all_devices"    ON esp32_devices
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
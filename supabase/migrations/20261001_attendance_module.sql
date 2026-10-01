-- ==============================================================================
-- Migration: 20261001_attendance_module.sql
-- Description: Complete schema, constraints, realtime, and RLS for Coders Club Attendance
-- Module: Attendance Management (feature/attendance-gowtham)
-- Target: Supabase PostgreSQL (Project: acnhfntawflgkomksddp)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NULL,
    event_name TEXT NOT NULL,
    sub_event_id UUID NULL,
    sub_event_name TEXT NULL,
    period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon')),
    session_name TEXT NOT NULL,
    created_by UUID NULL,
    created_by_name TEXT NULL DEFAULT 'Coordinator',
    is_active BOOLEAN NOT NULL DEFAULT true,
    qr_secret_seed TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active ON public.attendance_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_period ON public.attendance_sessions(period);

-- 3. Create Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_reg_no TEXT NULL,
    student_name TEXT NULL,
    student_department TEXT NULL,
    student_year INT NULL,
    student_section TEXT NULL,
    associate_user_id TEXT NULL,
    associate_name TEXT NULL,
    attendee_type TEXT NOT NULL CHECK (attendee_type IN ('student', 'associate')),
    verification_method TEXT NOT NULL CHECK (verification_method IN ('qr_scan', 'manual_entry')),
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'excused')),
    marked_by TEXT NULL,
    client_metadata JSONB NULL,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints: exactly one record per student / per associate per session
    CONSTRAINT check_attendee_identity CHECK (
        (attendee_type = 'student' AND student_reg_no IS NOT NULL) OR
        (attendee_type = 'associate' AND (associate_user_id IS NOT NULL OR associate_name IS NOT NULL))
    ),
    CONSTRAINT unique_student_session UNIQUE (session_id, student_reg_no),
    CONSTRAINT unique_associate_session UNIQUE (session_id, associate_user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_reg_no);
CREATE INDEX IF NOT EXISTS idx_attendance_records_associate ON public.attendance_records(associate_user_id);

-- 4. Create Anti-Replay Challenge Table (5-minute TTL)
CREATE TABLE IF NOT EXISTS public.attendance_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    challenge_token TEXT NOT NULL UNIQUE,
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_challenges_token ON public.attendance_challenges(challenge_token, is_consumed);

-- 5. Enable Realtime Replication for attendance tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    END IF;
END $$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_challenges ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Sessions: viewable by authenticated coordinators and mobile scanners
CREATE POLICY "attendance_sessions_select_policy"
ON public.attendance_sessions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "attendance_sessions_insert_policy"
ON public.attendance_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "attendance_sessions_update_policy"
ON public.attendance_sessions FOR UPDATE
TO anon, authenticated
USING (true);

-- Records: viewable and insertable
CREATE POLICY "attendance_records_select_policy"
ON public.attendance_records FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "attendance_records_insert_policy"
ON public.attendance_records FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Challenges: 5-minute single-use handshake tokens
CREATE POLICY "attendance_challenges_select_policy"
ON public.attendance_challenges FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "attendance_challenges_insert_policy"
ON public.attendance_challenges FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "attendance_challenges_update_policy"
ON public.attendance_challenges FOR UPDATE
TO anon, authenticated
USING (true);

-- End of migration

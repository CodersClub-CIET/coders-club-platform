-- ==============================================================================
-- Migration: 20261007_score_management_module.sql
-- Description: Table, constraints, realtime subscription, and RLS policies for Score Management
-- Module: Score Management (feature/score-management-maheswaran)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Event Scores Table
CREATE TABLE IF NOT EXISTS public.event_scores (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id TEXT NULL,
    student_reg_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    department TEXT NOT NULL,
    year INT NOT NULL,
    section TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    sub_event_id TEXT NULL,
    sub_event_name TEXT NULL,
    score NUMERIC NOT NULL CHECK (score >= 0),
    max_score NUMERIC NOT NULL DEFAULT 100,
    entered_by TEXT NULL DEFAULT auth.uid()::text,
    entered_by_name TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT check_score_max_bound CHECK (score <= max_score),
    CONSTRAINT unique_student_event_score UNIQUE (student_reg_no, event_id)
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_event_scores_event ON public.event_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scores_student ON public.event_scores(student_reg_no);
CREATE INDEX IF NOT EXISTS idx_event_scores_entered_by ON public.event_scores(entered_by);

-- 4. Enable Realtime Replication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'event_scores'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.event_scores;
    END IF;
END $$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.event_scores ENABLE ROW LEVEL SECURITY;

-- 6. Strict RLS Policies
-- SELECT: authenticated and anon read access for dashboards/views
DROP POLICY IF EXISTS "event_scores_select_policy" ON public.event_scores;
CREATE POLICY "event_scores_select_policy"
ON public.event_scores FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: ONLY authenticated users (Admin / Associate)
DROP POLICY IF EXISTS "event_scores_insert_policy" ON public.event_scores;
CREATE POLICY "event_scores_insert_policy"
ON public.event_scores FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: ONLY authenticated users (Admin / Associate)
DROP POLICY IF EXISTS "event_scores_update_policy" ON public.event_scores;
CREATE POLICY "event_scores_update_policy"
ON public.event_scores FOR UPDATE
TO authenticated
USING (true);

-- DELETE: ONLY authenticated users (Admin / Associate)
DROP POLICY IF EXISTS "event_scores_delete_policy" ON public.event_scores;
CREATE POLICY "event_scores_delete_policy"
ON public.event_scores FOR DELETE
TO authenticated
USING (true);

-- 7. Seed Initial Event Scores for Testing & Standalone Preview
INSERT INTO public.event_scores (
    id, student_id, student_reg_no, student_name, department, year, section,
    event_id, event_name, score, max_score, entered_by_name
) VALUES 
('rec-1', 'stu-001', '917621104001', 'Aarav Kumar', 'CSE', 3, 'A', 'evt-101', 'Tech Fest - Web Development', 85, 100, 'Admin Evaluator'),
('rec-2', 'stu-002', '917621104002', 'Bhavana Sharma', 'CSE', 3, 'B', 'evt-101', 'Tech Fest - Web Development', 92, 100, 'Admin Evaluator'),
('rec-3', 'stu-003', '917621104003', 'Chandran R', 'IT', 2, 'A', 'evt-102', 'Debugging Contest', 42, 50, 'Associate Evaluator'),
('rec-4', 'stu-004', '917621104004', 'Divya Lakshmi', 'ECE', 4, 'A', 'evt-102', 'Debugging Contest', 38, 50, 'Associate Evaluator'),
('rec-5', 'stu-005', '917621104005', 'Eshwar Prasad', 'AIDS', 2, 'B', 'evt-103', 'Code Relay', 60, 75, 'Admin Evaluator')
ON CONFLICT (student_reg_no, event_id) DO NOTHING;

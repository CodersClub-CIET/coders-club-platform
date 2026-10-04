-- ==============================================================================
-- Coders Club Management Platform - Dynamic QR Attendance Module Migration
-- Target: Supabase PostgreSQL
-- Features:
--   1. Server-controlled attendance sessions
--   2. Cryptographically unpredictable, opaque, time-bound challenge tokens
--   3. Strict server-side single-use challenge consumption (anti-replay)
--   4. Duplicate attendance prevention per event and attendance context
--   5. Scanner/device fingerprinting & auditability
--   6. Realtime publication support
--   7. Server-authoritative RPC functions with atomic transactions
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Table: qr_attendance_sessions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(32) NOT NULL UNIQUE,
    event_id VARCHAR(100) NOT NULL,
    event_name TEXT NOT NULL,
    sub_event_id VARCHAR(100) NULL,
    sub_event_name TEXT NULL,
    attendance_context VARCHAR(100) NOT NULL,
    target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('student', 'associate')),
    creator_role VARCHAR(20) NOT NULL CHECK (creator_role IN ('admin', 'associate')),
    created_by UUID NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'expired')),
    challenge_refresh_interval_seconds INT NOT NULL DEFAULT 30,
    current_challenge_id UUID NULL,
    attendance_count INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. Table: qr_challenges
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES qr_attendance_sessions(id) ON DELETE CASCADE,
    challenge_token VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed', 'invalid')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    consumed_by_id VARCHAR(100) NULL,
    consumed_by_role VARCHAR(20) NULL CHECK (consumed_by_role IN ('student', 'associate')),
    consumption_ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key link back from session to current challenge
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_session_current_challenge'
    ) THEN
        ALTER TABLE qr_attendance_sessions
            ADD CONSTRAINT fk_session_current_challenge
            FOREIGN KEY (current_challenge_id) REFERENCES qr_challenges(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Table: qr_attendance_records
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES qr_attendance_sessions(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL UNIQUE REFERENCES qr_challenges(id) ON DELETE RESTRICT,
    event_id VARCHAR(100) NOT NULL,
    attendance_context VARCHAR(100) NOT NULL,
    attendee_type VARCHAR(20) NOT NULL CHECK (attendee_type IN ('student', 'associate')),
    student_reg_number VARCHAR(60) NULL,
    student_name VARCHAR(150) NULL,
    student_email VARCHAR(200) NULL,
    student_department VARCHAR(100) NULL,
    associate_id UUID NULL,
    associate_name VARCHAR(150) NULL,
    associate_email VARCHAR(200) NULL,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'flagged', 'rejected')),
    scanner_device_hash VARCHAR(128) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    verified_by_server BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. Indexes for Performance & Lookups
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_event ON qr_attendance_sessions(event_id, attendance_context);
CREATE INDEX IF NOT EXISTS idx_qr_challenges_token ON qr_challenges(challenge_token);
CREATE INDEX IF NOT EXISTS idx_qr_challenges_session_status ON qr_challenges(session_id, status);
CREATE INDEX IF NOT EXISTS idx_qr_attendance_session ON qr_attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_attendance_marked ON qr_attendance_records(marked_at);

-- ------------------------------------------------------------------------------
-- 5. Strict Unique Indexes for Duplicate Attendance Prevention
-- ------------------------------------------------------------------------------
-- Ensures a student can receive attendance ONLY ONCE for a given event + context
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_event_attendance
    ON qr_attendance_records (event_id, attendance_context, student_reg_number)
    WHERE attendee_type = 'student' AND student_reg_number IS NOT NULL;

-- Ensures an associate can receive attendance ONLY ONCE for a given event + context
CREATE UNIQUE INDEX IF NOT EXISTS uq_associate_event_attendance
    ON qr_attendance_records (event_id, attendance_context, associate_id)
    WHERE attendee_type = 'associate' AND associate_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 6. Server-Side Function: Generate / Rotate QR Challenge
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_qr_challenge(
    p_session_id UUID,
    p_validity_seconds INT DEFAULT 30
)
RETURNS TABLE (
    challenge_id UUID,
    challenge_token VARCHAR(128),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_new_token VARCHAR(128);
    v_expires_at TIMESTAMPTZ;
    v_new_challenge_id UUID;
BEGIN
    -- 1. Validate session
    SELECT * INTO v_session
    FROM qr_attendance_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    IF v_session.status <> 'active' THEN
        RAISE EXCEPTION 'SESSION_NOT_ACTIVE';
    END IF;

    -- 2. Expire all existing active challenges for this session
    UPDATE qr_challenges
    SET status = 'expired'
    WHERE session_id = p_session_id AND status = 'active';

    -- 3. Generate cryptographically unpredictable token (64 hex characters from 32 secure random bytes)
    v_new_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := clock_timestamp() + ((p_validity_seconds || ' seconds')::interval);

    -- 4. Insert new challenge
    INSERT INTO qr_challenges (
        session_id,
        challenge_token,
        status,
        issued_at,
        expires_at
    ) VALUES (
        p_session_id,
        v_new_token,
        'active',
        clock_timestamp(),
        v_expires_at
    ) RETURNING id INTO v_new_challenge_id;

    -- 5. Update session reference
    UPDATE qr_attendance_sessions
    SET current_challenge_id = v_new_challenge_id,
        updated_at = clock_timestamp()
    WHERE id = p_session_id;

    RETURN QUERY
    SELECT v_new_challenge_id, v_new_token, v_expires_at, 'active'::VARCHAR(20);
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Server-Side Function: Validate and Consume Challenge (Atomic Attendance Marking)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verify_and_consume_challenge(
    p_session_id UUID,
    p_challenge_token TEXT,
    p_attendee_type TEXT,
    p_student_reg_number TEXT DEFAULT NULL,
    p_student_name TEXT DEFAULT NULL,
    p_student_email TEXT DEFAULT NULL,
    p_student_department TEXT DEFAULT NULL,
    p_associate_id UUID DEFAULT NULL,
    p_associate_name TEXT DEFAULT NULL,
    p_associate_email TEXT DEFAULT NULL,
    p_scanner_device_hash TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_challenge RECORD;
    v_existing_record_id UUID;
    v_new_record_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- 1. Validate session
    SELECT * INTO v_session
    FROM qr_attendance_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SESSION_NOT_FOUND', 'message', 'Attendance session not found');
    END IF;

    IF v_session.status = 'ended' THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SESSION_ENDED', 'message', 'Attendance session has already ended');
    END IF;

    IF v_session.status <> 'active' THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SESSION_NOT_ACTIVE', 'message', 'Attendance session is not currently active');
    END IF;

    -- 2. Validate attendee type vs session target role
    IF v_session.target_role <> p_attendee_type THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'ROLE_MISMATCH', 'message', 'This QR code is designated for ' || v_session.target_role || ' attendance');
    END IF;

    -- 3. Lock & check challenge
    SELECT * INTO v_challenge
    FROM qr_challenges
    WHERE challenge_token = p_challenge_token AND session_id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'CHALLENGE_NOT_FOUND', 'message', 'Invalid QR code token');
    END IF;

    IF v_challenge.status = 'consumed' THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'CHALLENGE_ALREADY_CONSUMED', 'message', 'This QR challenge has already been scanned and consumed');
    END IF;

    IF v_challenge.status <> 'active' OR v_challenge.expires_at < v_now THEN
        -- Mark as expired if not already marked
        UPDATE qr_challenges SET status = 'expired' WHERE id = v_challenge.id;
        RETURN jsonb_build_object('success', false, 'error_code', 'CHALLENGE_EXPIRED', 'message', 'QR code has expired. Please scan the current code displayed on screen');
    END IF;

    -- 4. Check duplicate attendance
    IF p_attendee_type = 'student' THEN
        IF p_student_reg_number IS NULL OR trim(p_student_reg_number) = '' THEN
            RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_ATTENDEE_DATA', 'message', 'Student register number is required');
        END IF;

        SELECT id INTO v_existing_record_id
        FROM qr_attendance_records
        WHERE event_id = v_session.event_id
          AND attendance_context = v_session.attendance_context
          AND student_reg_number = trim(upper(p_student_reg_number))
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error_code', 'DUPLICATE_ATTENDANCE', 'message', 'Attendance has already been marked for this student in this session');
        END IF;

    ELSIF p_attendee_type = 'associate' THEN
        IF p_associate_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_ATTENDEE_DATA', 'message', 'Associate ID is required');
        END IF;

        SELECT id INTO v_existing_record_id
        FROM qr_attendance_records
        WHERE event_id = v_session.event_id
          AND attendance_context = v_session.attendance_context
          AND associate_id = p_associate_id
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error_code', 'DUPLICATE_ATTENDANCE', 'message', 'Attendance has already been marked for this associate in this session');
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_ATTENDEE_DATA', 'message', 'Invalid attendee type');
    END IF;

    -- 5. Atomically consume the challenge
    UPDATE qr_challenges
    SET status = 'consumed',
        consumed_at = v_now,
        consumed_by_id = CASE WHEN p_attendee_type = 'student' THEN trim(upper(p_student_reg_number)) ELSE p_associate_id::text END,
        consumed_by_role = p_attendee_type,
        consumption_ip = p_ip_address,
        user_agent = p_user_agent
    WHERE id = v_challenge.id;

    -- 6. Insert attendance record
    INSERT INTO qr_attendance_records (
        session_id,
        challenge_id,
        event_id,
        attendance_context,
        attendee_type,
        student_reg_number,
        student_name,
        student_email,
        student_department,
        associate_id,
        associate_name,
        associate_email,
        marked_at,
        scanner_device_hash,
        ip_address,
        user_agent,
        status,
        verified_by_server
    ) VALUES (
        p_session_id,
        v_challenge.id,
        v_session.event_id,
        v_session.attendance_context,
        p_attendee_type,
        CASE WHEN p_attendee_type = 'student' THEN trim(upper(p_student_reg_number)) ELSE NULL END,
        CASE WHEN p_attendee_type = 'student' THEN trim(p_student_name) ELSE NULL END,
        CASE WHEN p_attendee_type = 'student' THEN trim(lower(p_student_email)) ELSE NULL END,
        CASE WHEN p_attendee_type = 'student' THEN trim(p_student_department) ELSE NULL END,
        CASE WHEN p_attendee_type = 'associate' THEN p_associate_id ELSE NULL END,
        CASE WHEN p_attendee_type = 'associate' THEN trim(p_associate_name) ELSE NULL END,
        CASE WHEN p_attendee_type = 'associate' THEN trim(lower(p_associate_email)) ELSE NULL END,
        v_now,
        p_scanner_device_hash,
        p_ip_address,
        p_user_agent,
        'valid',
        true
    ) RETURNING id INTO v_new_record_id;

    -- 7. Increment session attendance counter
    UPDATE qr_attendance_sessions
    SET attendance_count = attendance_count + 1,
        updated_at = v_now
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Attendance successfully recorded',
        'record_id', v_new_record_id,
        'event_name', v_session.event_name,
        'attendance_context', v_session.attendance_context,
        'marked_at', v_now
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE qr_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_attendance_records ENABLE ROW LEVEL SECURITY;

-- Allow reading sessions
CREATE POLICY "Allow authenticated read of qr_attendance_sessions"
    ON qr_attendance_sessions FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins full control over sessions
CREATE POLICY "Allow admin manage qr_attendance_sessions"
    ON qr_attendance_sessions FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role' = 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    );

-- Allow associates to manage sessions they created
CREATE POLICY "Allow associate create and manage own sessions"
    ON qr_attendance_sessions FOR ALL
    TO authenticated
    USING (
        created_by = auth.uid()
    );

-- Allow reading attendance records
CREATE POLICY "Allow authenticated read qr_attendance_records"
    ON qr_attendance_records FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- 9. Realtime Publication
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE qr_attendance_sessions;
        ALTER PUBLICATION supabase_realtime ADD TABLE qr_attendance_records;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Gracefully ignore if publication is managed by Supabase dashboard
END $$;

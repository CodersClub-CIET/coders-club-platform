-- ==============================================================================
-- Coders Club Management Platform - Dynamic QR Attendance Module Migration
-- Target: Supabase PostgreSQL
--
-- Dynamic QR uses the existing Attendance tables:
--   attendance_sessions
--   attendance_records
--   students
--   event_participations
--   associates
--
-- Dynamic QR specific table:
--   qr_challenges
--
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. QR Challenges
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.attendance_sessions(id)
        ON DELETE CASCADE,

    challenge_token VARCHAR(128) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'consumed', 'invalid')),

    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,

    consumed_at TIMESTAMPTZ NULL,
    consumed_by_id TEXT NULL,
    consumed_by_role VARCHAR(20) NULL
        CHECK (consumed_by_role IN ('student', 'associate')),

    consumption_ip INET NULL,
    user_agent TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_challenges_token
    ON public.qr_challenges(challenge_token);

CREATE INDEX IF NOT EXISTS idx_qr_challenges_session_status
    ON public.qr_challenges(session_id, status);


-- ------------------------------------------------------------------------------
-- 2. Generate / Rotate QR Challenge
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_qr_challenge(
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
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_new_token VARCHAR(128);
    v_expires_at TIMESTAMPTZ;
    v_new_challenge_id UUID;
BEGIN

    -- Validate and lock attendance session
    SELECT *
    INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    -- Your live Attendance schema uses is_active
    IF v_session.is_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'SESSION_NOT_ACTIVE';
    END IF;

    -- Expire previous active challenges
    UPDATE public.qr_challenges
    SET status = 'expired'
    WHERE session_id = p_session_id
      AND status = 'active';

    -- Generate unpredictable 32-byte token
    v_new_token := encode(
        gen_random_bytes(32),
        'hex'
    );

    v_expires_at :=
        clock_timestamp()
        + ((p_validity_seconds || ' seconds')::interval);

    -- Create new challenge
    INSERT INTO public.qr_challenges (
        session_id,
        challenge_token,
        status,
        issued_at,
        expires_at
    )
    VALUES (
        p_session_id,
        v_new_token,
        'active',
        clock_timestamp(),
        v_expires_at
    )
    RETURNING id INTO v_new_challenge_id;

    RETURN QUERY
    SELECT
        v_new_challenge_id,
        v_new_token,
        v_expires_at,
        'active'::VARCHAR(20);

END;
$$;


-- ------------------------------------------------------------------------------
-- 3. Verify and Consume Challenge
--    Atomic anti-replay + attendance marking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_verify_and_consume_challenge(
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
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_challenge RECORD;
    v_student RECORD;
    v_participation RECORD;
    v_existing_record_id UUID;
    v_new_record_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_event_node_id UUID;
BEGIN

    -- ============================================================
    -- 1. Validate attendance session
    -- ============================================================

    SELECT *
    INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SESSION_NOT_FOUND',
            'message', 'Attendance session not found'
        );
    END IF;

    -- Live attendance schema uses is_active
    IF v_session.is_active IS DISTINCT FROM true THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SESSION_NOT_ACTIVE',
            'message', 'Attendance session is not currently active'
        );
    END IF;

    -- Dynamic QR requires event_node_id from the live session schema
    v_event_node_id := v_session.event_node_id;

    IF v_event_node_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'EVENT_NODE_NOT_FOUND',
            'message',
            'Attendance session is not linked to an event node'
        );
    END IF;


    -- ============================================================
    -- 2. Validate attendee type
    -- ============================================================

    IF p_attendee_type NOT IN ('student', 'associate') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_ATTENDEE_DATA',
            'message', 'Invalid attendee type'
        );
    END IF;

    IF v_session.target_role <> p_attendee_type THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ROLE_MISMATCH',
            'message',
            'This QR code is designated for '
            || v_session.target_role
            || ' attendance'
        );
    END IF;


    -- ============================================================
    -- 3. Lock and validate QR challenge
    -- ============================================================

    SELECT *
    INTO v_challenge
    FROM public.qr_challenges
    WHERE challenge_token = p_challenge_token
      AND session_id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CHALLENGE_NOT_FOUND',
            'message', 'Invalid QR code token'
        );
    END IF;

    IF v_challenge.status = 'consumed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CHALLENGE_ALREADY_CONSUMED',
            'message',
            'This QR challenge has already been scanned and consumed'
        );
    END IF;

    IF v_challenge.status <> 'active'
       OR v_challenge.expires_at < v_now THEN

        UPDATE public.qr_challenges
        SET status = 'expired'
        WHERE id = v_challenge.id;

        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CHALLENGE_EXPIRED',
            'message',
            'QR code has expired. Please scan the current code displayed on screen'
        );
    END IF;


    -- ============================================================
    -- 4. Prevent scanner-device reuse
    -- ============================================================

    IF p_scanner_device_hash IS NOT NULL
       AND trim(p_scanner_device_hash) <> '' THEN

        IF EXISTS (
            SELECT 1
            FROM public.attendance_records
            WHERE session_id = p_session_id
              AND scanner_device_hash = trim(p_scanner_device_hash)
              AND status = 'present'
        ) THEN

            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'SCANNER_SESSION_ALREADY_USED',
                'message',
                'This device has already been used for attendance in this session'
            );

        END IF;

    END IF;


    -- ============================================================
    -- 5. Resolve attendee identity
    -- ============================================================

    IF p_attendee_type = 'student' THEN

        IF p_student_reg_number IS NULL
           OR trim(p_student_reg_number) = '' THEN

            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_ATTENDEE_DATA',
                'message',
                'Student register number is required'
            );

        END IF;


        -- --------------------------------------------------------
        -- Find real student
        -- --------------------------------------------------------

        SELECT
            id,
            register_number,
            name,
            email
        INTO v_student
        FROM public.students
        WHERE upper(trim(register_number))
              = upper(trim(p_student_reg_number))
          AND is_active = true
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'STUDENT_NOT_FOUND',
                'message',
                'Student register number was not found'
            );
        END IF;


        -- --------------------------------------------------------
        -- Find student's event participation
        -- --------------------------------------------------------

        SELECT
            id,
            event_node_id,
            student_id,
            status
        INTO v_participation
        FROM public.event_participations
        WHERE event_node_id = v_event_node_id
          AND student_id = v_student.id
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'STUDENT_NOT_REGISTERED',
                'message',
                'Student is not registered for this event'
            );
        END IF;


        -- --------------------------------------------------------
        -- Prevent duplicate student attendance
        -- --------------------------------------------------------

        SELECT ar.id
        INTO v_existing_record_id
        FROM public.attendance_records ar
        JOIN public.attendance_sessions s
          ON s.id = ar.session_id
        WHERE ar.event_node_id = v_event_node_id
          AND ar.attendance_type = 'student'
          AND ar.student_id = v_student.id
          AND s.attendance_context = v_session.attendance_context
          AND ar.status = 'present'
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'DUPLICATE_ATTENDANCE',
                'message',
                'Attendance has already been marked for this student in this attendance context'
            );
        END IF;


    ELSIF p_attendee_type = 'associate' THEN

        IF p_associate_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_ATTENDEE_DATA',
                'message',
                'Associate ID is required'
            );
        END IF;


        -- --------------------------------------------------------
        -- Verify associate
        -- --------------------------------------------------------

        PERFORM 1
        FROM public.associates
        WHERE id = p_associate_id
          AND is_active = true;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ASSOCIATE_NOT_FOUND',
                'message',
                'Associate was not found or is inactive'
            );
        END IF;


        -- --------------------------------------------------------
        -- Prevent duplicate associate attendance
        -- --------------------------------------------------------

        SELECT ar.id
        INTO v_existing_record_id
        FROM public.attendance_records ar
        JOIN public.attendance_sessions s
          ON s.id = ar.session_id
        WHERE ar.event_node_id = v_event_node_id
          AND ar.attendance_type = 'associate'
          AND ar.associate_id = p_associate_id
          AND s.attendance_context = v_session.attendance_context
          AND ar.status = 'present'
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'DUPLICATE_ATTENDANCE',
                'message',
                'Attendance has already been marked for this associate in this attendance context'
            );
        END IF;

    END IF;


    -- ============================================================
    -- 6. Consume challenge
    -- ============================================================

    UPDATE public.qr_challenges
    SET
        status = 'consumed',
        consumed_at = v_now,

        consumed_by_id = CASE
            WHEN p_attendee_type = 'student'
                THEN v_student.id::text
            ELSE
                p_associate_id::text
        END,

        consumed_by_role = p_attendee_type,
        consumption_ip = NULLIF(trim(p_ip_address), '')::inet,
        user_agent = p_user_agent

    WHERE id = v_challenge.id;


    -- ============================================================
    -- 7. Insert into REAL attendance_records
    -- ============================================================

    INSERT INTO public.attendance_records (
        session_id,
        challenge_id,
        event_node_id,
        participation_id,
        attendance_type,
        student_id,
        associate_id,
        marked_at,
        scanner_device_hash,
        ip_address,
        user_agent,
        status,
        verified_by_server
    )
    VALUES (
        p_session_id,
        v_challenge.id,
        v_event_node_id,

        CASE
            WHEN p_attendee_type = 'student'
                THEN v_participation.id
            ELSE
                NULL
        END,

        p_attendee_type,

        CASE
            WHEN p_attendee_type = 'student'
                THEN v_student.id
            ELSE
                NULL
        END,

        CASE
            WHEN p_attendee_type = 'associate'
                THEN p_associate_id
            ELSE
                NULL
        END,

        v_now,

        NULLIF(
            trim(p_scanner_device_hash),
            ''
        ),

        NULLIF(
            trim(p_ip_address),
            ''
        )::inet,

        p_user_agent,

        'present',

        true
    )
    RETURNING id INTO v_new_record_id;


    -- ============================================================
    -- 8. Update attendance count
    -- ============================================================

    UPDATE public.attendance_sessions
    SET
        attendance_count = attendance_count + 1,
        updated_at = v_now
    WHERE id = p_session_id;


    -- ============================================================
    -- 9. Success response
    -- ============================================================

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Attendance successfully recorded',
        'record_id', v_new_record_id,
        'event_node_id', v_event_node_id,
        'attendance_context', v_session.attendance_context,
        'attendee_type', p_attendee_type,
        'marked_at', v_now
    );

END;
$$;


-- ------------------------------------------------------------------------------
-- 4. RLS for QR Challenges
-- ------------------------------------------------------------------------------

ALTER TABLE public.qr_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_challenges_authenticated_read"
ON public.qr_challenges;

CREATE POLICY "qr_challenges_authenticated_read"
ON public.qr_challenges
FOR SELECT
TO authenticated
USING (true);


-- ------------------------------------------------------------------------------
-- 5. Realtime support for QR challenges
-- ------------------------------------------------------------------------------

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN

        BEGIN
            ALTER PUBLICATION supabase_realtime
            ADD TABLE public.qr_challenges;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
            WHEN OTHERS THEN
                NULL;
        END;

    END IF;

END $$;
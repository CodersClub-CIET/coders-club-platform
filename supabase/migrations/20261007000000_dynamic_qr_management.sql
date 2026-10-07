-- PROPOSAL ONLY. NOT EXECUTED. Requires explicit approval.
-- Existing canonical tables only. No table/RLS/grant/publication changes.
-- New RPC names below are proposed, not claimed to exist in the deployed database.
-- Run as postgres only after review; the transaction rolls back on any error.
BEGIN;

DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Review and run this proposal as postgres, not an application role';
  END IF;
  IF pg_catalog.to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL
     OR pg_catalog.to_regprocedure('public.consume_student_attendance(text,text,text)') IS NULL
     OR pg_catalog.to_regclass('public.attendance_sessions') IS NULL
     OR pg_catalog.to_regclass('public.qr_challenges') IS NULL
     OR pg_catalog.to_regclass('public.attendance_records') IS NULL THEN
    RAISE EXCEPTION 'Canonical attendance/randomness contract is missing';
  END IF;
END;
$preflight$;

-- Internal authorization gate. No caller-supplied actor or role.
-- NULL event means identity/profile validation only; this helper is not exposed.
CREATE FUNCTION private.qr_require_manager(p_event_node_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;
  SELECT up.role INTO v_role FROM public.user_profiles up
  WHERE up.id = v_uid AND up.is_active = true;
  IF v_role IS NULL OR v_role NOT IN ('admin', 'associate') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Active management profile required';
  END IF;
  IF v_role = 'associate' AND p_event_node_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.associates a
       JOIN public.associate_allocations aa ON aa.associate_id = a.id
       WHERE a.auth_user_id = v_uid AND a.is_active = true
         AND aa.event_node_id = p_event_node_id
         AND aa.is_active = true AND aa.attendance_access = true
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  RETURN v_role;
END;
$fn$;
REVOKE ALL ON FUNCTION private.qr_require_manager(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- New sessions: the actor and creator_role are always derived from auth.uid().
-- Proposed validity policy: 1..300 seconds, default 30. No new database column.
-- The existing metadata JSONB stores the UI's validity preference.
CREATE FUNCTION public.qr_create_session(
  p_event_node_id uuid,
  p_attendance_context text,
  p_target_role text DEFAULT 'student',
  p_validity_seconds integer DEFAULT 30
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_role text;
  v_session public.attendance_sessions%ROWTYPE;
  v_challenge public.qr_challenges%ROWTYPE;
  v_now timestamptz;
BEGIN
  v_role := private.qr_require_manager(NULL);
  IF p_event_node_id IS NULL
     OR p_attendance_context IS NULL OR p_attendance_context NOT IN ('morning', 'afternoon')
     OR p_target_role IS NULL OR p_target_role NOT IN ('student', 'associate')
     OR p_validity_seconds IS NULL OR p_validity_seconds NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid session input';
  END IF;
  v_role := private.qr_require_manager(p_event_node_id);
  IF v_role = 'associate' AND p_target_role <> 'student' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Associate managers may create student sessions only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.event_nodes en
                 WHERE en.id = p_event_node_id AND en.is_active = true) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  v_now := pg_catalog.clock_timestamp();
  INSERT INTO public.attendance_sessions
    (event_node_id, attendance_context, target_role, creator_role, created_by,
     status, attendance_count, started_at, metadata)
  VALUES
    (p_event_node_id, p_attendance_context, p_target_role, v_role, auth.uid(),
     'active', 0, v_now,
     pg_catalog.jsonb_build_object('dynamic_qr',
       pg_catalog.jsonb_build_object('validity_seconds', p_validity_seconds)))
  RETURNING * INTO v_session;
  INSERT INTO public.qr_challenges
    (session_id, challenge_token, status, issued_at, expires_at)
  VALUES
    (v_session.id, pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
     'active', v_now, v_now + pg_catalog.make_interval(secs => p_validity_seconds))
  RETURNING * INTO v_challenge;
  RETURN pg_catalog.jsonb_build_object('session', pg_catalog.to_jsonb(v_session),
                                      'challenge', pg_catalog.to_jsonb(v_challenge));
END;
$fn$;
REVOKE ALL ON FUNCTION public.qr_create_session(uuid,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qr_create_session(uuid,text,text,integer) TO authenticated;

-- Rotation: serialize managers, then challenges in UUID order, then session.
-- Never acquire the session row lock before acquiring challenge row locks.
-- Expected challenge UUID is a compare-and-swap precondition, NOT a new version column.
-- NULL expected UUID is accepted only when a session has no challenge yet.
CREATE FUNCTION public.qr_rotate_challenge(
  p_session_id uuid,
  p_expected_challenge_id uuid,
  p_validity_seconds integer DEFAULT 30
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_role text;
  v_session public.attendance_sessions%ROWTYPE;
  v_challenge public.qr_challenges%ROWTYPE;
  v_latest_id uuid;
  v_now timestamptz;
BEGIN
  v_role := private.qr_require_manager(NULL);
  IF p_session_id IS NULL OR p_validity_seconds IS NULL
     OR p_validity_seconds NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid rotation input';
  END IF;
  SELECT * INTO v_session FROM public.attendance_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  v_role := private.qr_require_manager(v_session.event_node_id);
  IF v_role = 'associate' AND
     (v_session.created_by <> auth.uid() OR v_session.creator_role <> 'associate'
      OR v_session.target_role <> 'student') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dynamic-qr-management:' || p_session_id::text, 0));
  PERFORM q.id FROM public.qr_challenges q
    WHERE q.session_id = p_session_id ORDER BY q.id FOR UPDATE;
  SELECT * INTO v_session FROM public.attendance_sessions
    WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  -- Recheck after waiting for locks, including ownership/event changes.
  v_role := private.qr_require_manager(v_session.event_node_id);
  IF v_role = 'associate' AND
     (v_session.created_by <> auth.uid() OR v_session.creator_role <> 'associate'
      OR v_session.target_role <> 'student') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Session is not active';
  END IF;
  IF pg_catalog.jsonb_typeof(v_session.metadata) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Session metadata is not a JSON object';
  END IF;
  SELECT q.id INTO v_latest_id FROM public.qr_challenges q
    WHERE q.session_id = p_session_id ORDER BY q.issued_at DESC, q.id DESC LIMIT 1;
  IF v_latest_id IS DISTINCT FROM p_expected_challenge_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Challenge state changed; reload before retrying';
  END IF;
  v_now := pg_catalog.clock_timestamp();
  UPDATE public.qr_challenges
    SET status = CASE WHEN expires_at <= v_now THEN 'expired' ELSE 'revoked' END
    WHERE session_id = p_session_id AND status = 'active';
  INSERT INTO public.qr_challenges
    (session_id, challenge_token, status, issued_at, expires_at)
  VALUES
    (p_session_id, pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
     'active', v_now, v_now + pg_catalog.make_interval(secs => p_validity_seconds))
  RETURNING * INTO v_challenge;
  UPDATE public.attendance_sessions
    SET metadata = pg_catalog.jsonb_set(metadata, '{dynamic_qr}',
      pg_catalog.jsonb_build_object('validity_seconds', p_validity_seconds), true)
    WHERE id = p_session_id;
  RETURN pg_catalog.jsonb_build_object('session_id', p_session_id,
                                      'challenge', pg_catalog.to_jsonb(v_challenge));
END;
$fn$;
REVOKE ALL ON FUNCTION public.qr_rotate_challenge(uuid,uuid,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qr_rotate_challenge(uuid,uuid,integer) TO authenticated;

CREATE FUNCTION public.qr_end_session(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_role text;
  v_session public.attendance_sessions%ROWTYPE;
  v_now timestamptz;
BEGIN
  v_role := private.qr_require_manager(NULL);
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid session input';
  END IF;
  SELECT * INTO v_session FROM public.attendance_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  v_role := private.qr_require_manager(v_session.event_node_id);
  IF v_role = 'associate' AND
     (v_session.created_by <> auth.uid() OR v_session.creator_role <> 'associate'
      OR v_session.target_role <> 'student') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dynamic-qr-management:' || p_session_id::text, 0));
  PERFORM q.id FROM public.qr_challenges q
    WHERE q.session_id = p_session_id ORDER BY q.id FOR UPDATE;
  SELECT * INTO v_session FROM public.attendance_sessions
    WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  v_role := private.qr_require_manager(v_session.event_node_id);
  IF v_role = 'associate' AND
     (v_session.created_by <> auth.uid() OR v_session.creator_role <> 'associate'
      OR v_session.target_role <> 'student') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resource not found or inaccessible';
  END IF;
  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Session is not active';
  END IF;
  v_now := pg_catalog.clock_timestamp();
  UPDATE public.qr_challenges SET status = 'revoked'
    WHERE session_id = p_session_id AND status = 'active';
  UPDATE public.attendance_sessions SET status = 'ended', ended_at = v_now
    WHERE id = p_session_id;
  RETURN pg_catalog.jsonb_build_object('session_id', p_session_id,
                                      'status', 'ended', 'ended_at', v_now);
END;
$fn$;
REVOKE ALL ON FUNCTION public.qr_end_session(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qr_end_session(uuid) TO authenticated;

-- Capability-bound public context: no row enumeration, counters, actors, records,
-- metadata, or challenge token in the response. Requires BOTH session and token.
-- It performs no writes and does not expose SELECT privileges to anon.
CREATE FUNCTION public.qr_scan_context(p_session_id uuid, p_challenge_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_context jsonb;
BEGIN
  IF p_session_id IS NULL OR p_challenge_token IS NULL
     OR pg_catalog.length(pg_catalog.btrim(p_challenge_token)) NOT BETWEEN 16 AND 256 THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_CHALLENGE');
  END IF;
  SELECT pg_catalog.jsonb_build_object(
    'success', true, 'session_id', s.id, 'event_name', en.name,
    'attendance_context', s.attendance_context, 'target_role', s.target_role,
    'expires_at', q.expires_at)
  INTO v_context
  FROM public.qr_challenges q
  JOIN public.attendance_sessions s ON s.id = q.session_id
  JOIN public.event_nodes en ON en.id = s.event_node_id
  WHERE q.session_id = p_session_id
    AND q.challenge_token = pg_catalog.btrim(p_challenge_token)
    AND q.status = 'active' AND q.expires_at > pg_catalog.clock_timestamp()
    AND s.status = 'active';
  RETURN coalesce(v_context,
    pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_CHALLENGE'));
END;
$fn$;
REVOKE ALL ON FUNCTION public.qr_scan_context(uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qr_scan_context(uuid,text) TO anon, authenticated;

-- Deliberately untouched:
-- consume_student_attendance (body, ownership, ACL and eligibility behavior);
-- all existing tables, constraints, indexes, RLS policies, table grants,
-- triggers, realtime publication and obsolete functions.
COMMIT;

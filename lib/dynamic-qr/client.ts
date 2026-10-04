import { createClient } from "@/lib/supabase/client";

import {
  type QRAttendanceSession,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type RefreshChallengeResponse,
  type EndSessionResponse,
  type ConsumeChallengeRequest,
  type ConsumeChallengeResponse,
  type QRAttendanceRecord,
  QRErrorCode,
} from "./types";

/**
 * Supabase client
 */
function getSupabase() {
  return createClient();
}

/**
 * Consume a QR challenge and mark attendance.
 *
 * This calls the server-authoritative Supabase RPC:
 * fn_verify_and_consume_challenge
 */
export async function consumeAttendanceChallenge(
  payload: ConsumeChallengeRequest
): Promise<ConsumeChallengeResponse> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc(
    "fn_verify_and_consume_challenge",
    {
      p_session_id: payload.session_id,
      p_challenge_token: payload.challenge_token,
      p_attendee_type: payload.attendee_type,

      p_student_reg_number:
        payload.student_reg_number ?? null,

      p_student_name:
        payload.student_name ?? null,

      p_student_email:
        payload.student_email ?? null,

      p_student_department:
        payload.student_department ?? null,

      p_associate_id:
        payload.associate_id ?? null,

      p_associate_name: null,

      p_associate_email:
        payload.associate_email ?? null,

      p_scanner_device_hash:
        payload.scanner_fingerprint ?? null,

      p_ip_address: null,

      p_user_agent:
        typeof navigator !== "undefined"
          ? navigator.userAgent
          : null,
    }
  );

  if (error) {
    return {
      success: false,
      message: error.message,
      error_code: QRErrorCode.SERVER_ERROR,
    };
  }

  const result = data as {
    success?: boolean;
    message?: string;
    record_id?: string;
    event_name?: string;
    attendance_context?: string;
    marked_at?: string;
    error_code?: string;
  };

  if (!result?.success) {
    return {
      success: false,
      message:
        result?.message ??
        "Attendance verification failed",
      error_code:
        (result?.error_code as QRErrorCode) ??
        QRErrorCode.SERVER_ERROR,
    };
  }

  return {
    success: true,
    message:
      result.message ??
      "Attendance successfully recorded",
    details: {
      record_id: result.record_id,
      event_name: result.event_name,
      attendance_context:
        result.attendance_context,
      marked_at: result.marked_at,
    },
  };
}

/**
 * Call the existing Dynamic QR API routes.
 */
async function callApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(
    options?.headers
  );

  if (
    options?.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response = await fetch(
    `/api${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data as T;
}

/**
 * Create a new attendance session.
 */
export async function createAttendanceSession(
  payload: CreateSessionRequest
): Promise<CreateSessionResponse> {
  return callApi<CreateSessionResponse>(
    "/dynamic-qr/sessions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Get an attendance session.
 */
export async function getAttendanceSession(
  sessionId: string
): Promise<QRAttendanceSession> {
  const result = await callApi<{
    session: QRAttendanceSession;
  }>(
    `/dynamic-qr/sessions/${sessionId}`
  );

  return result.session;
}

/**
 * Refresh the current QR challenge.
 *
 * The server controls the challenge validity period.
 */
export async function refreshAttendanceChallenge(
  sessionId: string
): Promise<RefreshChallengeResponse> {
  return callApi<RefreshChallengeResponse>(
    `/dynamic-qr/sessions/${sessionId}/refresh`,
    {
      method: "POST",
    }
  );
}

/**
 * End an attendance session.
 */
export async function endAttendanceSession(
  sessionId: string
): Promise<EndSessionResponse> {
  return callApi<EndSessionResponse>(
    `/dynamic-qr/sessions/${sessionId}/end`,
    {
      method: "POST",
    }
  );
}

/**
 * Get attendance records for a session.
 */
export async function getSessionRecords(
  sessionId: string
): Promise<QRAttendanceRecord[]> {
  const result = await callApi<{
    records: QRAttendanceRecord[];
  }>(
    `/dynamic-qr/sessions/${sessionId}/records`
  );

  return result.records || [];
}
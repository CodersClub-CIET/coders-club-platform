export type AttendanceRole = "student" | "associate";
export type CreatorRole = "admin" | "associate";
export type AttendanceContextType = "morning" | "afternoon";
export type SessionStatus = "active" | "ended" | "cancelled";
export type ChallengeStatus = "active" | "expired" | "consumed" | "revoked";
export interface QRChallenge {
  id: string; session_id: string; challenge_token: string; status: ChallengeStatus;
  issued_at: string; expires_at: string; consumed_at: string | null;
}
export interface QRAttendanceSession {
  id: string; event_node_id: string; event_name: string;
  attendance_context: AttendanceContextType; target_role: AttendanceRole;
  creator_role: CreatorRole; created_by: string; status: SessionStatus;
  started_at: string; ended_at: string | null; attendance_count: number;
  created_at: string; updated_at: string; validity_seconds: number;
  latest_challenge_id: string | null; current_challenge?: QRChallenge;
}
export interface QRAttendanceRecord {
  id: string; session_id: string; challenge_id: string | null; event_node_id: string;
  attendance_type: AttendanceRole; student_id: string | null; associate_id: string | null;
  marked_at: string; status: "present" | "invalid" | "rejected";
  verified_by_server: boolean; student_name?: string | null; student_reg_number?: string | null; associate_name?: string | null;
}
export interface EventOption { id: string; name: string }
export interface ScanContext {
  success: true; session_id: string; event_name: string;
  attendance_context: AttendanceContextType; target_role: AttendanceRole; expires_at: string;
}
export interface CreateSessionRequest {
  event_node_id: string; attendance_context: AttendanceContextType;
  target_role: AttendanceRole; validity_seconds?: number;
}
export interface CreateSessionResponse { session: QRAttendanceSession; challenge: QRChallenge }
export interface RefreshChallengeResponse { session_id: string; challenge: QRChallenge; remaining_seconds: number }
export interface EndSessionResponse { session_id: string; status: "ended"; ended_at: string }
export interface ConsumeChallengeRequest {
  challenge_token: string; register_number: string; device_hash?: string;
}
export interface ConsumeChallengeResponse {
  success: boolean; message: string; code?: string; attendance_record_id?: string;
}
export const QRErrorCode = {
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND", SESSION_NOT_ACTIVE: "SESSION_NOT_ACTIVE",
  SESSION_ENDED: "SESSION_ENDED", CHALLENGE_NOT_FOUND: "CHALLENGE_NOT_FOUND",
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED", CHALLENGE_ALREADY_CONSUMED: "CHALLENGE_ALREADY_CONSUMED",
  ROLE_MISMATCH: "ROLE_MISMATCH", DUPLICATE_ATTENDANCE: "DUPLICATE_ATTENDANCE",
  INVALID_ATTENDEE_DATA: "INVALID_ATTENDEE_DATA", UNAUTHORIZED: "UNAUTHORIZED",
  SCANNER_REPLAY_DETECTED: "SCANNER_REPLAY_DETECTED", SERVER_ERROR: "SERVER_ERROR",
} as const;
export type QRErrorCode = (typeof QRErrorCode)[keyof typeof QRErrorCode];

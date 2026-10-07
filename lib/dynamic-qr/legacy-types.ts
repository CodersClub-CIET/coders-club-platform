export type AttendanceRole = "student" | "associate";
export type CreatorRole = "admin" | "associate";
export type SessionStatus = "active" | "paused" | "ended" | "expired";
export type ChallengeStatus = "active" | "expired" | "consumed" | "invalid";
export type AttendanceRecordStatus = "valid" | "flagged" | "rejected";

export type AttendanceContextType =
  | "session_1"
  | "session_2"
  | "morning"
  | "afternoon"
  | "entry"
  | "exit"
  | "workshop"
  | "general"
  | string;

export interface QRChallenge {
  id: string;
  session_id: string;
  challenge_token: string;
  status: ChallengeStatus;
  issued_at: string;
  expires_at: string;
  consumed_at?: string;
  consumed_by_id?: string;
  consumed_by_role?: AttendanceRole;
}

export interface QRAttendanceSession {
  id: string;
  session_code: string;
  event_id: string;
  event_name: string;
  sub_event_id?: string;
  sub_event_name?: string;
  attendance_context: AttendanceContextType;
  target_role: AttendanceRole;
  creator_role: CreatorRole;
  created_by: string;
  status: SessionStatus;
  challenge_refresh_interval_seconds: number;
  current_challenge?: QRChallenge;
  started_at: string;
  ended_at?: string;
  attendance_count: number;
  created_at: string;
  updated_at: string;
}

export interface QRAttendanceRecord {
  id: string;
  session_id: string;
  challenge_id: string;
  event_id: string;
  event_name?: string;
  attendance_context: string;
  attendee_type: AttendanceRole;
  student_reg_number?: string;
  student_name?: string;
  student_email?: string;
  student_department?: string;
  associate_id?: string;
  associate_name?: string;
  associate_email?: string;
  marked_at: string;
  status: AttendanceRecordStatus;
  scanner_device_hash?: string;
  verified_by_server: boolean;
}

export interface CreateSessionRequest {
  event_id: string;
  event_name: string;
  sub_event_id?: string;
  sub_event_name?: string;
  attendance_context: string;
  target_role: AttendanceRole;
  refresh_interval_seconds?: number;
}

export interface CreateSessionResponse {
  session: QRAttendanceSession;
  challenge: QRChallenge;
}

export interface RefreshChallengeResponse {
  session_id: string;
  challenge: QRChallenge;
  remaining_seconds: number;
}

export interface EndSessionResponse {
  session_id: string;
  status: "ended";
  ended_at: string;
  final_attendance_count: number;
}

export interface ConsumeChallengeRequest {
  session_id: string;
  challenge_token: string;
  attendee_type: AttendanceRole;
  student_reg_number?: string;
  student_name?: string;
  student_email?: string;
  student_department?: string;
  associate_id?: string;
  associate_email?: string;
  scanner_fingerprint?: string;
}

export interface ConsumeChallengeResponse {
  success: boolean;
  message: string;
  record?: QRAttendanceRecord;
  error_code?: QRErrorCode;
  details?: Record<string, unknown>;
}

export const QRErrorCode = {
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_NOT_ACTIVE: "SESSION_NOT_ACTIVE",
  SESSION_ENDED: "SESSION_ENDED",
  CHALLENGE_NOT_FOUND: "CHALLENGE_NOT_FOUND",
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED",
  CHALLENGE_ALREADY_CONSUMED: "CHALLENGE_ALREADY_CONSUMED",
  ROLE_MISMATCH: "ROLE_MISMATCH",
  DUPLICATE_ATTENDANCE: "DUPLICATE_ATTENDANCE",
  INVALID_ATTENDEE_DATA: "INVALID_ATTENDEE_DATA",
  UNAUTHORIZED: "UNAUTHORIZED",
  SCANNER_REPLAY_DETECTED: "SCANNER_REPLAY_DETECTED",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export type QRErrorCode = (typeof QRErrorCode)[keyof typeof QRErrorCode];

export interface PredefinedEvent {
  id: string;
  name: string;
  category: string;
  sub_events: { id: string; name: string }[];
  contexts: { id: string; label: string }[];
}
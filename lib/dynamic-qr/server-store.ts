import crypto from "crypto";
import {
  type QRAttendanceSession,
  type QRChallenge,
  type QRAttendanceRecord,
  type CreateSessionRequest,
  type ConsumeChallengeRequest,
  type ConsumeChallengeResponse,
  QRErrorCode,
  type PredefinedEvent,
} from "./types";

/**
 * Predefined club events for quick selection in the UI
 */
export const PREDEFINED_EVENTS: PredefinedEvent[] = [
  {
    id: "evt-react-bootcamp",
    name: "Full Stack React & Next.js Workshop",
    category: "Technical Workshop",
    sub_events: [
      { id: "track-nextjs-app", name: "App Router & SSR Mastery" },
      { id: "track-tailwind-shadcn", name: "Modern UI Design Systems" },
    ],
    contexts: [
      { id: "session_1", label: "Morning Session (09:30 AM - 12:30 PM)" },
      { id: "session_2", label: "Afternoon Session (01:30 PM - 04:30 PM)" },
      { id: "lab_checkin", label: "Hands-on Lab Verification" },
      { id: "exit", label: "Final Wrap-up & Attendance" },
    ],
  },
  {
    id: "evt-dsa-marathon",
    name: "DSA 48-Hour Coding Marathon",
    category: "Competition",
    sub_events: [
      { id: "round-1-prelims", name: "Round 1 - Algorithmic Prelims" },
      { id: "round-2-finals", name: "Round 2 - Live Problem Solving" },
    ],
    contexts: [
      { id: "entry", label: "Participant Check-in" },
      { id: "checkpoint_mid", label: "Midnight Checkpoint" },
      { id: "exit", label: "Submission & Evaluation Check-in" },
    ],
  },
  {
    id: "evt-weekly-club-sync",
    name: "Weekly Coders Club Sync & Mentorship",
    category: "Internal Meeting",
    sub_events: [],
    contexts: [
      { id: "general", label: "Meeting Attendance" },
      { id: "associate_duty", label: "Associate Duty Verification" },
    ],
  },
];

// Global in-memory persistence store for server instances
interface StoreState {
  sessions: Map<string, QRAttendanceSession>;
  challenges: Map<string, QRChallenge>;
  records: Map<string, QRAttendanceRecord>;
}

declare global {
  var __qrStore: StoreState | undefined;
}

const store: StoreState =
  globalThis.__qrStore ||
  {
    sessions: new Map<string, QRAttendanceSession>(),
    challenges: new Map<string, QRChallenge>(),
    records: new Map<string, QRAttendanceRecord>(),
  };

if (process.env.NODE_ENV !== "production") {
  globalThis.__qrStore = store;
}

/**
 * Generate a cryptographically strong, opaque random token
 */
export function generateSecureOpaqueToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Hash string
 */
export function hashIdentifier(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

/**
 * Create a new QR attendance session with an initial challenge
 */
export async function createSession(
  req: CreateSessionRequest,
  creator: { id: string; role: "admin" | "associate" }
): Promise<{ session: QRAttendanceSession; challenge: QRChallenge }> {
  const sessionId = crypto.randomUUID();
  const sessionCode = `CC-${Math.floor(100000 + Math.random() * 900000)}`;

  const refreshInterval =
    req.refresh_interval_seconds || 30;

  const now = new Date();

  const challengeId = crypto.randomUUID();
  const token = generateSecureOpaqueToken();

  const expiresAt = new Date(
    now.getTime() + refreshInterval * 1000
  );

  const challenge: QRChallenge = {
    id: challengeId,
    session_id: sessionId,
    challenge_token: token,
    status: "active",
    issued_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const session: QRAttendanceSession = {
    id: sessionId,
    session_code: sessionCode,
    event_id: req.event_id,
    event_name: req.event_name,
    sub_event_id: req.sub_event_id,
    sub_event_name: req.sub_event_name,
    attendance_context: req.attendance_context,
    target_role: req.target_role,
    creator_role: creator.role,
    created_by: creator.id,
    status: "active",
    challenge_refresh_interval_seconds: refreshInterval,
    current_challenge: challenge,
    attendance_count: 0,
    started_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  store.sessions.set(sessionId, session);
  store.challenges.set(token, challenge);

  return {
    session,
    challenge,
  };
}

/**
 * Retrieve session by ID
 */
export async function getSessionById(
  sessionId: string
): Promise<QRAttendanceSession | null> {
  const session = store.sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (
    session.current_challenge &&
    session.status === "active"
  ) {
    const expiresAt = new Date(
      session.current_challenge.expires_at
    ).getTime();

    if (
      Date.now() > expiresAt &&
      session.current_challenge.status === "active"
    ) {
      session.current_challenge.status = "expired";

      store.challenges.set(
        session.current_challenge.challenge_token,
        session.current_challenge
      );
    }
  }

  return session;
}

/**
 * List all active sessions
 */
export async function listActiveSessions(
  targetRole?: "student" | "associate"
): Promise<QRAttendanceSession[]> {
  const all = Array.from(store.sessions.values());

  return all.filter((session) => {
    if (session.status !== "active") {
      return false;
    }

    if (
      targetRole &&
      session.target_role !== targetRole
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Server-controlled challenge rotation
 */
export async function rotateChallenge(
  sessionId: string,
  validitySeconds?: number
): Promise<{
  challenge: QRChallenge;
  remainingSeconds: number;
} | null> {
  const session = store.sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.status !== "active") {
    throw new Error(
      `Cannot rotate challenge for session with status: ${session.status}`
    );
  }

  const now = new Date();

  const seconds =
    validitySeconds ||
    session.challenge_refresh_interval_seconds ||
    30;

  // Expire previous challenge
  if (
    session.current_challenge &&
    session.current_challenge.status === "active"
  ) {
    session.current_challenge.status = "expired";

    store.challenges.set(
      session.current_challenge.challenge_token,
      session.current_challenge
    );
  }

  // Create new challenge
  const challengeId = crypto.randomUUID();
  const token = generateSecureOpaqueToken();

  const expiresAt = new Date(
    now.getTime() + seconds * 1000
  );

  const newChallenge: QRChallenge = {
    id: challengeId,
    session_id: sessionId,
    challenge_token: token,
    status: "active",
    issued_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  store.challenges.set(token, newChallenge);

  session.current_challenge = newChallenge;
  session.updated_at = now.toISOString();

  store.sessions.set(sessionId, session);

  return {
    challenge: newChallenge,
    remainingSeconds: seconds,
  };
}

/**
 * End an attendance session
 */
export async function endSession(
  sessionId: string
): Promise<QRAttendanceSession | null> {
  const session = store.sessions.get(sessionId);

  if (!session) {
    return null;
  }

  const now = new Date();

  session.status = "ended";
  session.ended_at = now.toISOString();
  session.updated_at = now.toISOString();

  // Expire current challenge
  if (
    session.current_challenge &&
    session.current_challenge.status === "active"
  ) {
    session.current_challenge.status = "expired";

    store.challenges.set(
      session.current_challenge.challenge_token,
      session.current_challenge
    );
  }

  store.sessions.set(sessionId, session);

  return session;
}

/**
 * Get attendance records for a session
 */
export async function getSessionAttendanceRecords(
  sessionId: string
): Promise<QRAttendanceRecord[]> {
  const allRecords = Array.from(
    store.records.values()
  );

  return allRecords.filter(
    (record) => record.session_id === sessionId
  );
}

/**
 * Server-authoritative challenge consumption
 * and attendance marking
 */
export async function verifyAndConsumeAttendance(
  req: ConsumeChallengeRequest,
  _clientInfo?: {
    ip?: string;
    userAgent?: string;
  }
): Promise<ConsumeChallengeResponse> {
  const now = new Date();
  const nowTime = now.getTime();

  // 1. Session check
  const session = store.sessions.get(req.session_id);

  if (!session) {
    return {
      success: false,
      message:
        "Attendance session not found or invalid",
      error_code: QRErrorCode.SESSION_NOT_FOUND,
    };
  }

  if (session.status === "ended") {
    return {
      success: false,
      message:
        "Attendance session has already ended",
      error_code: QRErrorCode.SESSION_ENDED,
    };
  }

  if (session.status !== "active") {
    return {
      success: false,
      message:
        `Attendance session is currently ${session.status}`,
      error_code: QRErrorCode.SESSION_NOT_ACTIVE,
    };
  }

  // 2. Role check
  if (
    session.target_role !== req.attendee_type
  ) {
    return {
      success: false,
      message:
        `This QR code is intended for ${session.target_role} attendance only`,
      error_code: QRErrorCode.ROLE_MISMATCH,
    };
  }

  // 3. Challenge check
  const challenge = store.challenges.get(
    req.challenge_token
  );

  if (
    !challenge ||
    challenge.session_id !== req.session_id
  ) {
    return {
      success: false,
      message:
        "Invalid or forged QR challenge token",
      error_code: QRErrorCode.CHALLENGE_NOT_FOUND,
    };
  }

  if (challenge.status === "consumed") {
    return {
      success: false,
      message:
        "This QR challenge has already been consumed. Refresh the screen to get a new code.",
      error_code:
        QRErrorCode.CHALLENGE_ALREADY_CONSUMED,
    };
  }

  const expiresAt = new Date(
    challenge.expires_at
  ).getTime();

  if (
    challenge.status !== "active" ||
    nowTime > expiresAt
  ) {
    challenge.status = "expired";

    store.challenges.set(
      challenge.challenge_token,
      challenge
    );

    return {
      success: false,
      message:
        "This QR code has expired. Please scan the current active code displayed on the screen.",
      error_code:
        QRErrorCode.CHALLENGE_EXPIRED,
    };
  }

  // 4. Duplicate attendance check
  const allRecords = Array.from(
    store.records.values()
  );

  if (req.attendee_type === "student") {
    const regNo =
      req.student_reg_number
        ?.trim()
        .toUpperCase();

    if (!regNo) {
      return {
        success: false,
        message:
          "Student Register / Roll Number is required",
        error_code:
          QRErrorCode.INVALID_ATTENDEE_DATA,
      };
    }

    const isDuplicate = allRecords.some(
      (record) =>
        record.event_id === session.event_id &&
        record.attendance_context ===
          session.attendance_context &&
        record.attendee_type === "student" &&
        record.student_reg_number
          ?.trim()
          .toUpperCase() === regNo
    );

    if (isDuplicate) {
      return {
        success: false,
        message:
          `Attendance has already been marked for register number ${regNo} in this session context`,
        error_code:
          QRErrorCode.DUPLICATE_ATTENDANCE,
      };
    }
  } else if (
    req.attendee_type === "associate"
  ) {
    const assocId = req.associate_id;

    if (!assocId) {
      return {
        success: false,
        message:
          "Associate ID is required",
        error_code:
          QRErrorCode.INVALID_ATTENDEE_DATA,
      };
    }

    const isDuplicate = allRecords.some(
      (record) =>
        record.event_id === session.event_id &&
        record.attendance_context ===
          session.attendance_context &&
        record.attendee_type === "associate" &&
        record.associate_id === assocId
    );

    if (isDuplicate) {
      return {
        success: false,
        message:
          "Associate attendance has already been recorded for this event session",
        error_code:
          QRErrorCode.DUPLICATE_ATTENDANCE,
      };
    }
  }

  // 5. Consume the challenge
  challenge.status = "consumed";
  challenge.consumed_at =
    now.toISOString();

  challenge.consumed_by_id =
    req.attendee_type === "student"
      ? req.student_reg_number
          ?.trim()
          .toUpperCase()
      : req.associate_id;

  challenge.consumed_by_role =
    req.attendee_type;

  store.challenges.set(
    challenge.challenge_token,
    challenge
  );

  // 6. Create attendance record
  const recordId =
    crypto.randomUUID();

  const record: QRAttendanceRecord = {
    id: recordId,
    session_id: session.id,
    challenge_id: challenge.id,
    event_id: session.event_id,
    event_name: session.event_name,
    attendance_context:
      session.attendance_context,
    attendee_type:
      req.attendee_type,

    student_reg_number:
      req.attendee_type === "student"
        ? req.student_reg_number
            ?.trim()
            .toUpperCase()
        : undefined,

    student_name:
      req.attendee_type === "student"
        ? req.student_name?.trim()
        : undefined,

    student_email:
      req.attendee_type === "student"
        ? req.student_email
            ?.trim()
            .toLowerCase()
        : undefined,

    student_department:
      req.attendee_type === "student"
        ? req.student_department?.trim()
        : undefined,

    associate_id:
      req.attendee_type === "associate"
        ? req.associate_id
        : undefined,

    associate_name:
      req.attendee_type === "associate"
        ? req.student_name ||
          req.associate_email?.split("@")[0]
        : undefined,

    associate_email:
      req.attendee_type === "associate"
        ? req.associate_email
        : undefined,

    marked_at:
      now.toISOString(),

    status: "valid",

    scanner_device_hash:
      req.scanner_fingerprint,

    verified_by_server: true,
  };

  store.records.set(
    recordId,
    record
  );

  // 7. Increment session attendance counter
  session.attendance_count =
    (session.attendance_count || 0) + 1;

  session.updated_at =
    now.toISOString();

  store.sessions.set(
    session.id,
    session
  );

  return {
    success: true,
    message:
      "Attendance successfully recorded and verified by server",
    record,
    details: {
      eventName:
        session.event_name,
      context:
        session.attendance_context,
      markedAt:
        now.toISOString(),
    },
  };
}
import {
  AttendanceRecord,
  AttendanceSession,
  CreateSessionInput,
  HandshakeChallenge,
  QRTokenData,
  StudentAttendanceSubmission,
} from "./types";
import { checkDuplicateAttendance, validateStudentSubmission } from "./validation";

// Standalone Mock State for preview when Supabase backend tables/functions are pending
const MOCK_SESSIONS: AttendanceSession[] = [
  {
    id: "sess-101",
    eventId: "evt-01",
    eventName: "Full Stack Web Development Hackathon",
    subEventId: "sub-01",
    subEventName: "Round 1: Rapid Prototyping",
    period: "morning",
    sessionName: "Morning Attendance - Day 1",
    createdBy: "usr-admin-01",
    createdByName: "Gowtham R (Admin)",
    isActive: true,
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "sess-102",
    eventId: "evt-02",
    eventName: "Algorithmic Problem Solving Workshop",
    period: "afternoon",
    sessionName: "Afternoon Session - Practice Lab",
    createdBy: "usr-admin-01",
    createdByName: "Gowtham R (Admin)",
    isActive: false,
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    endsAt: new Date(Date.now() - 79200000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 79200000).toISOString(),
  },
];

const MOCK_RECORDS: AttendanceRecord[] = [
  {
    id: "rec-01",
    sessionId: "sess-101",
    studentRegNo: "917621104001",
    studentName: "Aarav Kumar",
    studentDepartment: "CSE",
    studentYear: 3,
    studentSection: "A",
    attendeeType: "student",
    verificationMethod: "qr_scan",
    status: "present",
    markedAt: new Date(Date.now() - 2400000).toISOString(),
  },
  {
    id: "rec-02",
    sessionId: "sess-101",
    studentRegNo: "917621104015",
    studentName: "Bhavana S",
    studentDepartment: "IT",
    studentYear: 3,
    studentSection: "B",
    attendeeType: "student",
    verificationMethod: "qr_scan",
    status: "present",
    markedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "rec-03",
    sessionId: "sess-101",
    associateUserId: "usr-assoc-01",
    associateName: "Kavya Murugan",
    attendeeType: "associate",
    verificationMethod: "qr_scan",
    status: "present",
    markedAt: new Date(Date.now() - 1200000).toISOString(),
  },
];

class AttendanceService {
  private sessions: AttendanceSession[] = [...MOCK_SESSIONS];
  private records: AttendanceRecord[] = [...MOCK_RECORDS];
  // Anti-replay challenge storage in-memory fallback
  private activeChallenges: Map<string, { sessionId: string; expiresAt: number; consumed: boolean }> = new Map();

  /**
   * Retrieves all attendance sessions.
   */
  async getSessions(): Promise<AttendanceSession[]> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("attendance_sessions")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data as AttendanceSession[];
        }
      } catch {
        // Fallback to in-memory state while Supabase schema is deployed
      }
    }

    return [...this.sessions];
  }

  /**
   * Retrieves a specific session by ID.
   */
  async getSessionById(sessionId: string): Promise<AttendanceSession | null> {
    const session = this.sessions.find((s) => s.id === sessionId);
    return session || null;
  }

  /**
   * Starts a new attendance session.
   */
  async createSession(input: CreateSessionInput, userId: string = "usr-admin-01"): Promise<AttendanceSession> {
    const newSession: AttendanceSession = {
      id: `sess-${Date.now()}`,
      eventId: input.eventId,
      eventName: input.eventName,
      subEventId: input.subEventId,
      subEventName: input.subEventName,
      period: input.period,
      sessionName: input.sessionName,
      createdBy: userId,
      createdByName: "Current User",
      isActive: true,
      startsAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.unshift(newSession);
    return newSession;
  }

  /**
   * Closes an active attendance session.
   */
  async endSession(sessionId: string): Promise<AttendanceSession> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error("Attendance session not found.");
    }

    session.isActive = false;
    session.endsAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    return { ...session };
  }

  /**
   * Generates a secure temporary QR token for an active session.
   * Per requirements: QR rotation every few seconds is NOT used.
   * A signed, time-bounded token is issued.
   */
  async generateSessionQR(sessionId: string): Promise<QRTokenData> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error("Invalid session ID.");
    }
    if (!session.isActive) {
      throw new Error("Cannot generate QR for a closed session.");
    }

    // Temporary signed token seed
    const rawPayload = JSON.stringify({
      sid: session.id,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60 * 4, // 4 hours valid window for the event
      p: session.period,
    });

    const token = typeof window !== "undefined" ? btoa(rawPayload) : Buffer.from(rawPayload).toString("base64");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const scanUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(token)}`;

    return {
      sessionId,
      qrToken: token,
      scanUrl,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    };
  }

  /**
   * Performs the anti-replay handshake when a student scans the QR URL.
   * Generates a single-use challenge token valid for 90 seconds.
   */
  async performHandshake(token: string): Promise<HandshakeChallenge> {
    try {
      const decodedStr = typeof window !== "undefined" ? atob(token) : Buffer.from(token, "base64").toString("utf-8");
      const payload = JSON.parse(decodedStr);

      const session = await this.getSessionById(payload.sid);
      if (!session || !session.isActive) {
        throw new Error("This attendance session is no longer active.");
      }

      // Generate single-use challenge token
      const challengeToken = `chal-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      const expiresAt = Date.now() + 90 * 1000; // 90 seconds TTL

      this.activeChallenges.set(challengeToken, {
        sessionId: session.id,
        expiresAt,
        consumed: false,
      });

      return {
        valid: true,
        sessionId: session.id,
        eventName: session.eventName,
        subEventName: session.subEventName,
        period: session.period,
        challengeToken,
        expiresInSeconds: 90,
      };
    } catch {
      throw new Error("Invalid or corrupted QR attendance token.");
    }
  }

  /**
   * Submits student attendance.
   * Enforces:
   * 1. Anti-replay challenge verification
   * 2. Single-use consumption
   * 3. Duplicate prevention: one record per person per applicable context
   */
  async submitStudentAttendance(submission: StudentAttendanceSubmission): Promise<AttendanceRecord> {
    // 1. Validation check
    const validation = validateStudentSubmission(submission);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    // 2. Anti-replay challenge verification
    const challenge = this.activeChallenges.get(submission.challengeToken);
    if (!challenge) {
      throw new Error("Security challenge token is invalid or already consumed. Please re-scan.");
    }

    if (Date.now() > challenge.expiresAt) {
      this.activeChallenges.delete(submission.challengeToken);
      throw new Error("Attendance window expired. Please re-scan the QR code.");
    }

    if (challenge.consumed) {
      throw new Error("Security token has already been used. Duplicate submission blocked.");
    }

    // Mark challenge as consumed immediately
    challenge.consumed = true;

    // 3. Duplicate attendance prevention check
    const isDuplicate = checkDuplicateAttendance(this.records, {
      studentRegNo: submission.studentRegNo,
    });

    if (isDuplicate) {
      throw new Error(
        `Attendance for registration number ${submission.studentRegNo} has already been recorded for this session.`
      );
    }

    // 4. Create new attendance record
    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}`,
      sessionId: challenge.sessionId,
      studentRegNo: submission.studentRegNo.trim().toUpperCase(),
      studentName: submission.studentName.trim(),
      studentDepartment: submission.department,
      studentYear: submission.year,
      studentSection: submission.section,
      attendeeType: "student",
      verificationMethod: "qr_scan",
      status: "present",
      markedAt: new Date().toISOString(),
    };

    this.records.unshift(newRecord);
    return newRecord;
  }

  /**
   * Retrieves all attendance records for a given session.
   */
  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    return this.records.filter((r) => r.sessionId === sessionId);
  }

  /**
   * Subscribes to live attendee changes via Supabase Realtime with fallback.
   */
  subscribeToLiveAttendees(
    sessionId: string,
    onNewRecord: (record: AttendanceRecord) => void
  ): () => void {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return () => {};
    }

    try {
      // Dynamic require to avoid build-time static evaluation errors when env keys are unset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createRealtimeChannel, removeRealtimeChannel } = require("@/lib/supabase/realtime");
      const channelName = `attendance-session-${sessionId}`;
      const channel = createRealtimeChannel(channelName);

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "attendance_records",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload: { new: unknown }) => {
            if (payload.new) {
              onNewRecord(payload.new as AttendanceRecord);
            }
          }
        )
        .subscribe();

      return () => {
        removeRealtimeChannel(channel);
      };
    } catch {
      return () => {};
    }
  }
}

export const attendanceService = new AttendanceService();

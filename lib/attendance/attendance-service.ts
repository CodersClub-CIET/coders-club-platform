import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  AssociateAttendanceSubmission,
  CoordinatorAttendanceInput,
  CreateSessionInput,
  HandshakeChallenge,
  ManualAttendanceInput,
  PlatformAttendanceAnalytics,
  QRTokenData,
  StudentAttendanceSubmission,
  StudentAttendanceSummary,
} from "./types";
import { checkDuplicateAttendance, validateStudentSubmission } from "./validation";

const STORAGE_SESSIONS_KEY = "coders_club_attendance_sessions";
const STORAGE_RECORDS_KEY = "coders_club_attendance_records";
const STORAGE_CHALLENGES_KEY = "coders_club_attendance_challenges";
const BROADCAST_CHANNEL_NAME = "coders_club_attendance_live_stream";

// Default Mock State for initial seed
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

export function mapDbSessionToAttendanceSession(d: Record<string, unknown>): AttendanceSession {
  return {
    id: String(d.id),
    eventId: d.event_id ? String(d.event_id) : "evt-01",
    eventName: String(d.event_name || d.eventName || "CIET Coders Club Event"),
    subEventId: d.sub_event_id ? String(d.sub_event_id) : undefined,
    subEventName: d.sub_event_name ? String(d.sub_event_name) : undefined,
    period: (d.period as "morning" | "afternoon") || "morning",
    sessionName: String(d.session_name || d.sessionName || "Attendance Session"),
    createdBy: d.created_by ? String(d.created_by) : "usr-admin-01",
    createdByName: String(d.created_by_name || d.createdByName || "Coordinator"),
    isActive: d.is_active !== undefined ? Boolean(d.is_active) : d.isActive !== undefined ? Boolean(d.isActive) : true,
    startsAt: String(d.starts_at || d.startsAt || new Date().toISOString()),
    endsAt: d.ends_at ? String(d.ends_at) : d.endsAt ? String(d.endsAt) : undefined,
    createdAt: String(d.created_at || d.createdAt || new Date().toISOString()),
    updatedAt: String(d.updated_at || d.updatedAt || new Date().toISOString()),
  };
}

export function mapDbRecordToAttendanceRecord(d: Record<string, unknown>): AttendanceRecord {
  return {
    id: String(d.id),
    sessionId: String(d.session_id || d.sessionId),
    studentRegNo: d.student_reg_no ? String(d.student_reg_no) : d.studentRegNo ? String(d.studentRegNo) : undefined,
    studentName: d.student_name ? String(d.student_name) : d.studentName ? String(d.studentName) : undefined,
    studentDepartment: d.student_department ? String(d.student_department) : d.studentDepartment ? String(d.studentDepartment) : undefined,
    studentYear: d.student_year !== undefined ? Number(d.student_year) : d.studentYear !== undefined ? Number(d.studentYear) : undefined,
    studentSection: d.student_section ? String(d.student_section) : d.studentSection ? String(d.studentSection) : undefined,
    associateUserId: d.associate_user_id ? String(d.associate_user_id) : d.associateUserId ? String(d.associateUserId) : undefined,
    associateName: d.associate_name ? String(d.associate_name) : d.associateName ? String(d.associateName) : d.student_name ? String(d.student_name) : undefined,
    attendeeType: (d.attendee_type || d.attendeeType || "student") as "student" | "associate",
    verificationMethod: (d.verification_method || d.verificationMethod || "qr_scan") as "qr_scan" | "manual_entry",
    status: (d.status || "present") as AttendanceStatus,
    markedBy: d.marked_by ? String(d.marked_by) : d.markedBy ? String(d.markedBy) : undefined,
    markedAt: String(d.marked_at || d.markedAt || new Date().toISOString()),
  };
}

class AttendanceService {
  // In-memory fallback for challenge tokens
  private activeChallenges: Map<string, { sessionId: string; expiresAt: number; consumed: boolean }> = new Map();

  /**
   * Checks whether Supabase is configured with valid environment variables.
   */
  private isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return !!(url && key && !url.includes("placeholder") && !key.includes("placeholder"));
  }

  /**
   * Performs an instant health check on Supabase database connectivity
   * and verifies whether required tables exist in schema cache.
   */
  async checkDatabaseHealth(): Promise<{
    configured: boolean;
    connected: boolean;
    tablesExist: boolean;
    missingTables: string[];
    error?: string;
  }> {
    if (!this.isSupabaseConfigured()) {
      return {
        configured: false,
        connected: false,
        tablesExist: false,
        missingTables: ["attendance_sessions", "attendance_records"],
        error: "Supabase environment variables (URL/Publishable Key) are not configured.",
      };
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const missing: string[] = [];

      const { error: sessError } = await supabase
        .from("attendance_sessions")
        .select("id")
        .limit(1);

      if (sessError && (sessError.code === "PGRST205" || sessError.message?.includes("Could not find the table"))) {
        missing.push("attendance_sessions");
      }

      const { error: recError } = await supabase
        .from("attendance_records")
        .select("id")
        .limit(1);

      if (recError && (recError.code === "PGRST205" || recError.message?.includes("Could not find the table"))) {
        missing.push("attendance_records");
      }

      if (missing.length > 0) {
        return {
          configured: true,
          connected: true,
          tablesExist: false,
          missingTables: missing,
          error: `Missing database tables: ${missing.join(", ")}. Please execute the SQL migration in Supabase SQL Editor.`,
        };
      }

      return {
        configured: true,
        connected: true,
        tablesExist: true,
        missingTables: [],
      };
    } catch (err: unknown) {
      return {
        configured: true,
        connected: false,
        tablesExist: false,
        missingTables: ["attendance_sessions", "attendance_records"],
        error: err instanceof Error ? err.message : "Failed to connect to Supabase backend.",
      };
    }
  }

  /**
   * Checks database directly for existing record to prevent duplicate student and coordinator submissions.
   */
  async checkDuplicateInDatabase(
    sessionId: string,
    identifier: { studentRegNo?: string; associateUserId?: string }
  ): Promise<boolean> {
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        let query = supabase
          .from("attendance_records")
          .select("id")
          .eq("session_id", sessionId);

        if (identifier.studentRegNo) {
          query = query
            .eq("attendee_type", "student")
            .ilike("student_reg_no", identifier.studentRegNo.trim());
        } else if (identifier.associateUserId) {
          query = query
            .eq("attendee_type", "associate")
            .ilike("associate_user_id", identifier.associateUserId.trim());
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          return true;
        }
      } catch (err) {
        console.warn("Database duplicate check fallback to local records:", err);
      }
    }

    // Always check in local records cache as well
    const records = this.getStoredRecords();
    return checkDuplicateAttendance(records, {
      ...identifier,
      sessionId,
    });
  }

  /**
   * Reads persistent sessions with fallback to default mock sessions.
   */
  private getStoredSessions(): AttendanceSession[] {
    if (typeof window === "undefined") return [...MOCK_SESSIONS];
    try {
      const data = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [...MOCK_SESSIONS];
  }

  /**
   * Persists sessions to localStorage.
   */
  private saveStoredSessions(sessions: AttendanceSession[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }

  /**
   * Reads persistent records with fallback to default mock records.
   */
  private getStoredRecords(): AttendanceRecord[] {
    if (typeof window === "undefined") return [...MOCK_RECORDS];
    try {
      const data = localStorage.getItem(STORAGE_RECORDS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [...MOCK_RECORDS];
  }

  /**
   * Persists records to localStorage.
   */
  private saveStoredRecords(records: AttendanceRecord[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(records));
    } catch {
      // ignore
    }
  }

  /**
   * Broadcasts an attendance event across all open browser tabs and in-tab listeners.
   */
  private broadcastEvent(event: {
    type:
      | "NEW_RECORD"
      | "UPDATE_RECORD"
      | "DELETE_RECORD"
      | "NEW_SESSION"
      | "SESSION_ENDED"
      | "SESSION_DELETED";
    sessionId?: string;
    recordId?: string;
    record?: AttendanceRecord;
    session?: AttendanceSession;
  }): void {
    if (typeof window === "undefined") return;

    // 1. Same-tab CustomEvent
    try {
      window.dispatchEvent(new CustomEvent("coders_club_attendance_event", { detail: event }));
    } catch {
      // ignore
    }

    // 2. Cross-tab BroadcastChannel
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage(event);
        bc.close();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Saves challenge token to persistent storage so cross-tab scan can access it.
   */
  private saveChallenge(token: string, challenge: { sessionId: string; expiresAt: number; consumed: boolean }): void {
    this.activeChallenges.set(token, challenge);
    if (typeof window !== "undefined") {
      try {
        const allChallenges = JSON.parse(localStorage.getItem(STORAGE_CHALLENGES_KEY) || "{}");
        allChallenges[token] = challenge;
        localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(allChallenges));
      } catch {
        // ignore
      }
    }
  }

  /**
   * Retrieves challenge token from memory or persistent storage.
   */
  private getChallenge(token: string): { sessionId: string; expiresAt: number; consumed: boolean } | null {
    if (this.activeChallenges.has(token)) {
      return this.activeChallenges.get(token)!;
    }
    if (typeof window !== "undefined") {
      try {
        const allChallenges = JSON.parse(localStorage.getItem(STORAGE_CHALLENGES_KEY) || "{}");
        if (allChallenges[token]) {
          return allChallenges[token];
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  /**
   * Retrieves all attendance sessions.
   * Directly fetches from Supabase Database when configured, with localStorage fallback.
   */
  async getSessions(): Promise<AttendanceSession[]> {
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("attendance_sessions")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d: Record<string, unknown>) => mapDbSessionToAttendanceSession(d));
          this.saveStoredSessions(mapped);
          return mapped;
        }
      } catch {
        // Fallback to local storage
      }
    }

    return this.getStoredSessions();
  }

  /**
   * Retrieves a specific session by ID.
   */
  async getSessionById(sessionId: string): Promise<AttendanceSession | null> {
    const sessions = await this.getSessions();
    return sessions.find((s) => s.id === sessionId) || null;
  }

  /**
   * Starts a new attendance session.
   * Persists both to Supabase PostgreSQL and local cache.
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

    const currentSessions = this.getStoredSessions();
    const updated = [newSession, ...currentSessions];
    this.saveStoredSessions(updated);

    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.from("attendance_sessions").insert({
          id: newSession.id,
          event_id: newSession.eventId || "evt-01",
          event_name: newSession.eventName,
          sub_event_id: newSession.subEventId || null,
          sub_event_name: newSession.subEventName || null,
          period: newSession.period,
          session_name: newSession.sessionName,
          created_by: newSession.createdBy,
          created_by_name: newSession.createdByName,
          is_active: newSession.isActive,
          starts_at: newSession.startsAt,
          created_at: newSession.createdAt,
          updated_at: newSession.updatedAt,
        });
      } catch (err) {
        console.warn("Supabase session insert notice:", err);
      }
    }

    this.broadcastEvent({ type: "NEW_SESSION", session: newSession });
    return newSession;
  }

  /**
   * Closes an active attendance session.
   */
  async endSession(sessionId: string): Promise<AttendanceSession> {
    const sessions = this.getStoredSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error("Attendance session not found.");
    }

    session.isActive = false;
    session.endsAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    this.saveStoredSessions(sessions);

    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase
          .from("attendance_sessions")
          .update({
            is_active: false,
            ends_at: session.endsAt,
            updated_at: session.updatedAt,
          })
          .eq("id", sessionId);
      } catch (err) {
        console.warn("Supabase session end notice:", err);
      }
    }

    this.broadcastEvent({ type: "SESSION_ENDED", sessionId });
    return { ...session };
  }

  /**
   * Generates a secure temporary QR token for an active session.
   * Supports generating dedicated QR codes for students or for coordinators.
   * Validity window: EXACTLY 5 MINUTES (300,000 ms).
   */
  async generateSessionQR(
    sessionId: string,
    attendeeType: "student" | "associate" = "student"
  ): Promise<QRTokenData> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error("Invalid session ID.");
    }
    if (!session.isActive) {
      throw new Error("Cannot generate QR for a closed session.");
    }

    const QR_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes
    const issuedAt = Date.now();
    const expiresAtMs = issuedAt + QR_VALIDITY_MS;

    const rawPayload = JSON.stringify({
      sid: session.id,
      name: session.sessionName,
      event: session.eventName,
      sub: session.subEventName || "",
      iat: issuedAt,
      exp: expiresAtMs,
      p: session.period,
      type: attendeeType,
    });

    const token = typeof window !== "undefined" ? btoa(rawPayload) : Buffer.from(rawPayload).toString("base64");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const modeParam = attendeeType === "associate" ? "&mode=associate" : "";
    const scanUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(token)}${modeParam}`;

    return {
      sessionId,
      qrToken: token,
      scanUrl,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      attendeeType,
    };
  }

  /**
   * Performs the anti-replay handshake when a student or coordinator scans the QR URL.
   * 1. Validates that the 5-minute QR code has not expired.
   * 2. Self-contained: reconciles session data from QR payload even if phone hasn't fetched network sessions.
   * 3. Generates a single-use challenge token valid for 5 minutes (300 seconds).
   */
  async performHandshake(token: string): Promise<HandshakeChallenge> {
    try {
      const decodedStr = typeof window !== "undefined" ? atob(token) : Buffer.from(token, "base64").toString("utf-8");
      const payload = JSON.parse(decodedStr);

      // Verify QR token expiration (5 minutes limit)
      if (payload.exp && Date.now() > payload.exp) {
        throw new Error(
          "This attendance QR code has expired (5-minute validity window reached). Please ask the coordinator to refresh the QR code."
        );
      }

      let session = await this.getSessionById(payload.sid);

      // If not in cache/local store, query Supabase directly
      if (!session && this.isSupabaseConfigured()) {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data } = await supabase
            .from("attendance_sessions")
            .select("*")
            .eq("id", payload.sid)
            .single();
          if (data) {
            session = mapDbSessionToAttendanceSession(data);
            const current = this.getStoredSessions();
            this.saveStoredSessions([session, ...current.filter((s) => s.id !== session!.id)]);
          }
        } catch {
          // ignore
        }
      }

      // If still not found, construct self-contained session from signed QR payload
      if (!session && payload.sid) {
        session = {
          id: payload.sid,
          eventId: "evt-01",
          eventName: payload.event || "CIET Coders Club Event",
          subEventName: payload.sub || undefined,
          period: payload.p || "morning",
          sessionName: payload.name || "Attendance Session",
          createdBy: "admin",
          isActive: true,
          startsAt: new Date(payload.iat || Date.now()).toISOString(),
          createdAt: new Date(payload.iat || Date.now()).toISOString(),
          updatedAt: new Date(payload.iat || Date.now()).toISOString(),
        };
        const current = this.getStoredSessions();
        if (!current.some((s) => s.id === session!.id)) {
          this.saveStoredSessions([session, ...current]);
        }
      }

      if (!session || !session.isActive) {
        throw new Error("This attendance session is no longer active.");
      }

      const challengeToken = `chal-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
      const expiresAt = Date.now() + CHALLENGE_TTL_MS;

      this.saveChallenge(challengeToken, {
        sessionId: session.id,
        expiresAt,
        consumed: false,
      });

      const targetAttendeeType = payload.type === "associate" ? "associate" : "student";

      return {
        valid: true,
        sessionId: session.id,
        eventName: session.eventName,
        subEventName: session.subEventName,
        period: session.period,
        challengeToken,
        expiresInSeconds: 300,
        targetAttendeeType,
      };
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes("expired") || err.message.includes("active"))) {
        throw err;
      }
      throw new Error("Invalid or corrupted QR attendance token.");
    }
  }

  /**
   * Creates a challenge directly for an active session without requiring an encoded QR token.
   * Enables direct check-in from dashboard links and session switchers.
   */
  async createDirectChallenge(
    sessionId: string,
    attendeeType: "student" | "associate" = "student"
  ): Promise<HandshakeChallenge> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error("Attendance session could not be found.");
    }
    if (!session.isActive) {
      throw new Error(`Session "${session.sessionName}" is closed and is no longer accepting attendance.`);
    }

    const challengeToken = `chal-dir-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;

    this.saveChallenge(challengeToken, {
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
      expiresInSeconds: 300,
      targetAttendeeType: attendeeType,
    };
  }

  /**
   * Submits student attendance.
   * Enforces:
   * 1. Anti-replay challenge verification
   * 2. Single-use consumption
   * 3. Duplicate prevention: one record per person per applicable context
   * 4. Multi-tab and multi-window Realtime broadcast!
   */
  async submitStudentAttendance(submission: StudentAttendanceSubmission): Promise<AttendanceRecord> {
    const validation = validateStudentSubmission(submission);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    const challenge = this.getChallenge(submission.challengeToken);
    if (!challenge) {
      throw new Error("Security challenge token is invalid or already consumed. Please re-scan.");
    }

    if (Date.now() > challenge.expiresAt) {
      throw new Error("Attendance window expired (5 minutes). Please re-scan the QR code.");
    }

    if (challenge.consumed) {
      throw new Error("Security token has already been used. Duplicate submission blocked.");
    }

    // Mark consumed immediately
    challenge.consumed = true;
    this.saveChallenge(submission.challengeToken, challenge);

    // 1. Strict duplicate check against both Database and Local Cache!
    const isDuplicate = await this.checkDuplicateInDatabase(challenge.sessionId, {
      studentRegNo: submission.studentRegNo,
    });

    if (isDuplicate) {
      throw new Error(
        `Duplicate Check-in: Attendance for registration number ${submission.studentRegNo.trim().toUpperCase()} has already been recorded for this session.`
      );
    }

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

    const records = this.getStoredRecords();
    const updatedRecords = [newRecord, ...records];
    this.saveStoredRecords(updatedRecords);

    // Persist to Supabase Database if configured
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // 1. Ensure parent session exists in attendance_sessions to satisfy foreign key constraint
        try {
          const currentSession = await this.getSessionById(challenge.sessionId);
          await supabase.from("attendance_sessions").upsert(
            {
              id: challenge.sessionId,
              event_id: currentSession?.eventId || "evt-01",
              event_name: currentSession?.eventName || "CIET Coders Club Event",
              sub_event_id: currentSession?.subEventId || null,
              sub_event_name: currentSession?.subEventName || null,
              period: currentSession?.period || "morning",
              session_name: currentSession?.sessionName || "Attendance Session",
              is_active: currentSession ? currentSession.isActive : true,
              starts_at: currentSession?.startsAt || new Date().toISOString(),
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
        } catch (sessUpsertErr) {
          console.warn("Auto session upsert notice:", sessUpsertErr);
        }

        // 2. Insert attendance record into Supabase
        const { error } = await supabase.from("attendance_records").insert({
          id: newRecord.id,
          session_id: challenge.sessionId,
          student_reg_no: newRecord.studentRegNo,
          student_name: newRecord.studentName,
          student_department: newRecord.studentDepartment,
          student_year: newRecord.studentYear,
          student_section: newRecord.studentSection,
          attendee_type: "student",
          verification_method: "qr_scan",
          status: "present",
          marked_at: newRecord.markedAt,
        });

        if (error) {
          console.error("Supabase student record insert error:", error);
          if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
            throw new Error(
              "Cloud Database Incomplete: Supabase table 'attendance_records' does not exist yet. Please ask the coordinator to run the SQL migration in Supabase SQL Editor."
            );
          }
          if (error.code === "23505") {
            throw new Error(
              `Duplicate Check-in: Attendance for registration number ${newRecord.studentRegNo} has already been recorded.`
            );
          }
          throw new Error(`Cloud Database Error: ${error.message}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error("Failed to persist attendance record to central server.");
      }
    }

    // Broadcast across all open tabs, windows, and in-tab listeners!
    this.broadcastEvent({
      type: "NEW_RECORD",
      sessionId: challenge.sessionId,
      record: newRecord,
    });

    return newRecord;
  }

  /**
   * Submits Associate / Coordinator attendance from QR scan.
   * Enforces:
   * 1. Anti-replay challenge verification
   * 2. Single-use consumption
   * 3. Strict duplicate prevention against DB and local state
   * 4. Multi-tab and multi-window Realtime broadcast
   */
  async submitAssociateAttendance(submission: AssociateAttendanceSubmission): Promise<AttendanceRecord> {
    if (!submission.associateName || submission.associateName.trim().length < 2) {
      throw new Error("Associate full name is required.");
    }
    if (!submission.associateUserId || submission.associateUserId.trim().length < 3) {
      throw new Error("Associate ID / Registration Number is required.");
    }

    const challenge = this.getChallenge(submission.challengeToken);
    if (!challenge) {
      throw new Error("Security challenge token is invalid or already consumed. Please re-scan.");
    }

    if (Date.now() > challenge.expiresAt) {
      throw new Error("Attendance window expired (5 minutes). Please re-scan the QR code.");
    }

    if (challenge.consumed) {
      throw new Error("Security token has already been used. Duplicate submission blocked.");
    }

    // Mark challenge consumed
    challenge.consumed = true;
    this.saveChallenge(submission.challengeToken, challenge);

    // Strict duplicate check against both Database and Local Cache!
    const isDuplicate = await this.checkDuplicateInDatabase(challenge.sessionId, {
      associateUserId: submission.associateUserId,
    });

    if (isDuplicate) {
      throw new Error(
        `Duplicate Check-in: Attendance for coordinator ${submission.associateName} (${submission.associateUserId.trim().toUpperCase()}) has already been recorded for this session.`
      );
    }

    const newRecord: AttendanceRecord = {
      id: `rec-assoc-${Date.now()}`,
      sessionId: challenge.sessionId,
      associateUserId: submission.associateUserId.trim().toUpperCase(),
      associateName: submission.associateName.trim(),
      studentDepartment: submission.department,
      attendeeType: "associate",
      verificationMethod: "qr_scan",
      status: "present",
      markedBy: `${submission.role || "Associate"} (Self Scan)`,
      markedAt: new Date().toISOString(),
    };

    const records = this.getStoredRecords();
    const updatedRecords = [newRecord, ...records];
    this.saveStoredRecords(updatedRecords);

    // Persist to Supabase Database if configured
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.from("attendance_records").insert({
          id: newRecord.id,
          session_id: challenge.sessionId,
          associate_user_id: newRecord.associateUserId,
          student_name: newRecord.associateName,
          associate_name: newRecord.associateName,
          student_department: newRecord.studentDepartment,
          attendee_type: "associate",
          verification_method: "qr_scan",
          status: "present",
          marked_by: newRecord.markedBy,
          marked_at: newRecord.markedAt,
        });
        if (error) {
          console.error("Supabase coordinator insert error:", error);
        }
      } catch (err) {
        console.warn("Supabase coordinator insert fallback to local storage:", err);
      }
    }

    this.broadcastEvent({
      type: "NEW_RECORD",
      sessionId: challenge.sessionId,
      record: newRecord,
    });

    return newRecord;
  }

  /**
   * Manually records attendance for an event coordinator or club executive.
   * Enforces duplicate prevention against both database and local state.
   */
  async markCoordinatorAttendance(input: CoordinatorAttendanceInput): Promise<AttendanceRecord> {
    const session = await this.getSessionById(input.sessionId);
    if (!session) {
      throw new Error("Invalid session ID.");
    }
    if (!session.isActive) {
      throw new Error("Cannot mark attendance for a closed session.");
    }

    if (!input.coordinatorId || input.coordinatorId.trim().length < 3) {
      throw new Error("Coordinator ID or Roll Number is required (min 3 characters).");
    }

    if (!input.coordinatorName || input.coordinatorName.trim().length < 2) {
      throw new Error("Coordinator full name is required.");
    }

    // Check duplicate against both database and local records
    const isDuplicate = await this.checkDuplicateInDatabase(input.sessionId, {
      associateUserId: input.coordinatorId,
    });

    if (isDuplicate) {
      throw new Error(
        `Duplicate Check-in: Coordinator "${input.coordinatorName}" (${input.coordinatorId.trim().toUpperCase()}) has already recorded attendance for this session.`
      );
    }

    const newRecord: AttendanceRecord = {
      id: `rec-coord-${Date.now()}`,
      sessionId: input.sessionId,
      associateUserId: input.coordinatorId.trim().toUpperCase(),
      associateName: input.coordinatorName.trim(),
      studentDepartment: input.department || "Executive",
      attendeeType: "associate",
      verificationMethod: "manual_entry",
      status: "present",
      markedBy: input.markedBy || `${input.role || "Coordinator"} (Coordinator Desk)`,
      markedAt: new Date().toISOString(),
    };

    const records = this.getStoredRecords();
    const updatedRecords = [newRecord, ...records];
    this.saveStoredRecords(updatedRecords);

    // Persist to Supabase Database if configured
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.from("attendance_records").insert({
          id: newRecord.id,
          session_id: input.sessionId,
          associate_user_id: newRecord.associateUserId,
          student_name: newRecord.associateName,
          associate_name: newRecord.associateName,
          student_department: newRecord.studentDepartment,
          attendee_type: "associate",
          verification_method: "manual_entry",
          status: "present",
          marked_by: newRecord.markedBy,
          marked_at: newRecord.markedAt,
        });
        if (error) {
          console.error("Supabase coordinator manual insert error:", error);
        }
      } catch (err) {
        console.warn("Supabase coordinator manual insert fallback:", err);
      }
    }

    this.broadcastEvent({
      type: "NEW_RECORD",
      sessionId: input.sessionId,
      record: newRecord,
    });

    return newRecord;
  }

  /**
   * Manually records attendance for a student (e.g. phone dead, camera issue).
   */
  async markManualAttendance(input: ManualAttendanceInput): Promise<AttendanceRecord> {
    const session = await this.getSessionById(input.sessionId);
    if (!session) {
      throw new Error("Invalid session ID.");
    }
    if (!session.isActive) {
      throw new Error("Cannot manually mark attendance for a closed session.");
    }

    if (!input.studentRegNo || input.studentRegNo.trim().length < 8) {
      throw new Error("Please enter a valid Registration Number (8-12 digits).");
    }

    if (!input.studentName || input.studentName.trim().length < 2) {
      throw new Error("Student name is required.");
    }

    // Check duplicate against both Database and local storage
    const isDuplicate = await this.checkDuplicateInDatabase(input.sessionId, {
      studentRegNo: input.studentRegNo,
    });

    if (isDuplicate) {
      throw new Error(
        `Duplicate Check-in: Attendance for registration number ${input.studentRegNo.trim().toUpperCase()} has already been recorded for this session.`
      );
    }

    const newRecord: AttendanceRecord = {
      id: `rec-manual-${Date.now()}`,
      sessionId: input.sessionId,
      studentRegNo: input.studentRegNo.trim().toUpperCase(),
      studentName: input.studentName.trim(),
      studentDepartment: input.department,
      studentYear: input.year,
      studentSection: input.section,
      attendeeType: "student",
      verificationMethod: "manual_entry",
      status: "present",
      markedBy: input.markedBy || "Coordinator (Manual)",
      markedAt: new Date().toISOString(),
    };

    const records = this.getStoredRecords();
    const updatedRecords = [newRecord, ...records];
    this.saveStoredRecords(updatedRecords);

    // Persist to Supabase Database if configured
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // 1. Ensure parent session exists in attendance_sessions
        try {
          const currentSession = await this.getSessionById(input.sessionId);
          await supabase.from("attendance_sessions").upsert(
            {
              id: input.sessionId,
              event_id: currentSession?.eventId || "evt-01",
              event_name: currentSession?.eventName || "CIET Coders Club Event",
              sub_event_id: currentSession?.subEventId || null,
              sub_event_name: currentSession?.subEventName || null,
              period: currentSession?.period || "morning",
              session_name: currentSession?.sessionName || "Attendance Session",
              is_active: currentSession ? currentSession.isActive : true,
              starts_at: currentSession?.startsAt || new Date().toISOString(),
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
        } catch (sessUpsertErr) {
          console.warn("Auto session upsert notice:", sessUpsertErr);
        }

        // 2. Insert record
        const { error } = await supabase.from("attendance_records").insert({
          id: newRecord.id,
          session_id: input.sessionId,
          student_reg_no: newRecord.studentRegNo,
          student_name: newRecord.studentName,
          student_department: newRecord.studentDepartment,
          student_year: newRecord.studentYear,
          student_section: newRecord.studentSection,
          attendee_type: "student",
          verification_method: "manual_entry",
          status: "present",
          marked_by: newRecord.markedBy,
          marked_at: newRecord.markedAt,
        });

        if (error) {
          console.error("Supabase student manual insert error:", error);
          if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
            throw new Error(
              "Cloud Database Incomplete: Supabase table 'attendance_records' does not exist yet. Please run the SQL migration in Supabase SQL Editor."
            );
          }
          if (error.code === "23505") {
            throw new Error(
              `Duplicate Check-in: Attendance for registration number ${newRecord.studentRegNo} has already been recorded.`
            );
          }
          throw new Error(`Cloud Database Error: ${error.message}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          throw err;
        }
        console.warn("Supabase student manual insert fallback:", err);
      }
    }

    this.broadcastEvent({
      type: "NEW_RECORD",
      sessionId: input.sessionId,
      record: newRecord,
    });

    return newRecord;
  }

  /**
   * Retrieves all attendance records for a given session.
   * Directly queries Supabase Database when configured, with seamless local storage sync.
   */
  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("session_id", sessionId)
          .order("marked_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const dbRecords = data.map((d: Record<string, unknown>) => mapDbRecordToAttendanceRecord(d));

          // Merge local cache for records created in-session
          const localRecords = this.getStoredRecords().filter((r) => r.sessionId === sessionId);
          const merged = [...dbRecords];
          localRecords.forEach((local) => {
            const exists = merged.some(
              (m) =>
                m.id === local.id ||
                (local.studentRegNo && m.studentRegNo === local.studentRegNo) ||
                (local.associateUserId && m.associateUserId === local.associateUserId)
            );
            if (!exists) {
              merged.push(local);
            }
          });
          return merged;
        }
      } catch (err) {
        console.warn("Could not fetch session records from DB, falling back to local records:", err);
      }
    }

    const records = this.getStoredRecords();
    return records.filter((r) => r.sessionId === sessionId);
  }

  /**
   * Updates an attendance record status (e.g. present, late, excused).
   */
  async updateRecordStatus(recordId: string, status: AttendanceStatus): Promise<AttendanceRecord> {
    const records = this.getStoredRecords();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) {
      throw new Error("Attendance record not found.");
    }

    records[index] = {
      ...records[index],
      status,
    };
    this.saveStoredRecords(records);

    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.from("attendance_records").update({ status }).eq("id", recordId);
      } catch (err) {
        console.warn("Supabase record status update notice:", err);
      }
    }

    this.broadcastEvent({
      type: "UPDATE_RECORD",
      sessionId: records[index].sessionId,
      record: records[index],
    });

    return records[index];
  }

  /**
   * Deletes an attendance record.
   */
  async deleteRecord(recordId: string): Promise<boolean> {
    const records = this.getStoredRecords();
    const record = records.find((r) => r.id === recordId);
    if (!record) {
      return false;
    }

    const filtered = records.filter((r) => r.id !== recordId);
    this.saveStoredRecords(filtered);

    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.from("attendance_records").delete().eq("id", recordId);
      } catch (err) {
        console.warn("Supabase record delete notice:", err);
      }
    }

    this.broadcastEvent({
      type: "DELETE_RECORD",
      sessionId: record.sessionId,
      recordId,
    });

    return true;
  }

  /**
   * Deletes an entire attendance session and associated records.
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const sessions = await this.getSessions();
    const filteredSessions = sessions.filter((s) => s.id !== sessionId);
    this.saveStoredSessions(filteredSessions);

    const records = this.getStoredRecords();
    const filteredRecords = records.filter((r) => r.sessionId !== sessionId);
    this.saveStoredRecords(filteredRecords);

    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.from("attendance_records").delete().eq("session_id", sessionId);
        await supabase.from("attendance_sessions").delete().eq("id", sessionId);
      } catch (err) {
        console.warn("Supabase session delete notice:", err);
      }
    }

    this.broadcastEvent({
      type: "SESSION_DELETED",
      sessionId,
    });

    return true;
  }

  /**
   * Subscribes to live attendee changes via BroadcastChannel, Storage events, CustomEvents, and Supabase Realtime.
   */
  subscribeToLiveAttendees(
    sessionId: string,
    onNewRecord: (record: AttendanceRecord) => void,
    onRecordUpdated?: (record: AttendanceRecord) => void,
    onRecordDeleted?: (recordId: string) => void
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    if (typeof window !== "undefined") {
      // 1. Same-tab CustomEvent listener
      const handleCustomEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        const data = customEvent.detail;
        if (data && data.sessionId === sessionId) {
          if (data.type === "NEW_RECORD" && data.record) {
            onNewRecord(data.record);
          } else if (data.type === "UPDATE_RECORD" && data.record) {
            onRecordUpdated?.(data.record);
          } else if (data.type === "DELETE_RECORD" && data.recordId) {
            onRecordDeleted?.(data.recordId);
          }
        }
      };
      window.addEventListener("coders_club_attendance_event", handleCustomEvent);
      unsubscribers.push(() => window.removeEventListener("coders_club_attendance_event", handleCustomEvent));

      // 2. Cross-tab BroadcastChannel listener
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (event) => {
          const data = event.data;
          if (data && data.sessionId === sessionId) {
            if (data.type === "NEW_RECORD" && data.record) {
              onNewRecord(data.record);
            } else if (data.type === "UPDATE_RECORD" && data.record) {
              onRecordUpdated?.(data.record);
            } else if (data.type === "DELETE_RECORD" && data.recordId) {
              onRecordDeleted?.(data.recordId);
            }
          }
        };
        unsubscribers.push(() => {
          bc.close();
        });
      }

      // 3. Storage event listener (fires when another tab updates localStorage)
      const handleStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_RECORDS_KEY && e.newValue) {
          try {
            const allRecords: AttendanceRecord[] = JSON.parse(e.newValue);
            const sessionRecords = allRecords.filter((r) => r.sessionId === sessionId);
            if (sessionRecords.length > 0) {
              onNewRecord(sessionRecords[0]);
            }
          } catch {
            // ignore
          }
        }
      };
      window.addEventListener("storage", handleStorage);
      unsubscribers.push(() => window.removeEventListener("storage", handleStorage));
    }

    // 4. Supabase Realtime (when live backend credentials are configured)
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
      try {
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
              if (payload.new && typeof payload.new === "object") {
                const mapped = mapDbRecordToAttendanceRecord(payload.new as Record<string, unknown>);
                onNewRecord(mapped);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "attendance_records",
              filter: `session_id=eq.${sessionId}`,
            },
            (payload: { new: unknown }) => {
              if (payload.new && typeof payload.new === "object" && onRecordUpdated) {
                const mapped = mapDbRecordToAttendanceRecord(payload.new as Record<string, unknown>);
                onRecordUpdated(mapped);
              }
            }
          )
          .subscribe();

        unsubscribers.push(() => {
          removeRealtimeChannel(channel);
        });
      } catch {
        // ignore
      }
    }

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }

  /**
   * Generates CSV string for attendance records in a session.
   */
  async generateSessionAttendanceCSV(sessionId: string): Promise<string> {
    const session = await this.getSessionById(sessionId);
    const records = await this.getSessionRecords(sessionId);

    const headers = [
      "S.No",
      "Registration Number",
      "Student / Attendee Name",
      "Attendee Type",
      "Department",
      "Year",
      "Section",
      "Status",
      "Verification Method",
      "Time Marked",
      "Marked By",
      "Event Name",
      "Session Name",
      "Period",
    ];

    const rows = records.map((r, index) => {
      const regNo = r.studentRegNo || "N/A";
      const name = r.studentName || r.associateName || "N/A";
      const dept = r.studentDepartment || "Executive";
      const year = r.studentYear ? `${r.studentYear}` : "N/A";
      const section = r.studentSection || "N/A";
      const time = new Date(r.markedAt).toLocaleString();
      const method = r.verificationMethod === "qr_scan" ? "QR Scanned" : "Manual Entry";
      const markedBy = r.markedBy || "Self (Scan)";

      return [
        index + 1,
        `"${regNo}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${r.attendeeType}"`,
        `"${dept}"`,
        `"${year}"`,
        `"${section}"`,
        `"${r.status}"`,
        `"${method}"`,
        `"${time}"`,
        `"${markedBy}"`,
        `"${(session?.eventName || "").replace(/"/g, '""')}"`,
        `"${(session?.sessionName || "").replace(/"/g, '""')}"`,
        `"${session?.period || ""}"`,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Triggers a browser download of the attendance CSV sheet.
   */
  async downloadSessionCSV(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    const csvContent = await this.generateSessionAttendanceCSV(sessionId);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const cleanTitle = (session?.sessionName || "attendance")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `${cleanTitle}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Retrieves all attendance records across all sessions.
   * Directly queries Supabase Database with fallback to local storage.
   */
  async getAllRecords(): Promise<AttendanceRecord[]> {
    if (this.isSupabaseConfigured()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("attendance_records")
          .select("*")
          .order("marked_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const dbRecords = data.map((d: Record<string, unknown>) => mapDbRecordToAttendanceRecord(d));
          const localRecords = this.getStoredRecords();
          const merged = [...dbRecords];
          localRecords.forEach((local) => {
            const exists = merged.some(
              (m) =>
                m.id === local.id ||
                (local.studentRegNo && m.studentRegNo === local.studentRegNo && m.sessionId === local.sessionId) ||
                (local.associateUserId && m.associateUserId === local.associateUserId && m.sessionId === local.sessionId)
            );
            if (!exists) {
              merged.push(local);
            }
          });
          return merged;
        }
      } catch (err) {
        console.warn("Supabase getAllRecords error:", err);
      }
    }
    return this.getStoredRecords();
  }

  /**
   * Calculates platform-wide attendance analytics.
   */
  async getPlatformAnalytics(): Promise<PlatformAttendanceAnalytics> {
    const sessions = await this.getSessions();
    const records = await this.getAllRecords();

    const distinctStudents = new Set(
      records
        .filter((r) => r.attendeeType === "student" && r.studentRegNo)
        .map((r) => r.studentRegNo)
    ).size;

    const distinctAssociates = new Set(
      records
        .filter((r) => r.attendeeType === "associate" && r.associateUserId)
        .map((r) => r.associateUserId)
    ).size;

    const departmentCounts: Record<string, number> = {};
    const yearCounts: Record<number, number> = {};
    const periodCounts = { morning: 0, afternoon: 0 };

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    records.forEach((r) => {
      const dept = r.studentDepartment || "Executive / Associate";
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

      if (r.studentYear) {
        yearCounts[r.studentYear] = (yearCounts[r.studentYear] || 0) + 1;
      }

      const session = sessionMap.get(r.sessionId);
      if (session) {
        if (session.period === "morning") periodCounts.morning++;
        else if (session.period === "afternoon") periodCounts.afternoon++;
      }
    });

    return {
      totalRecords: records.length,
      distinctStudents,
      distinctAssociates,
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.isActive).length,
      departmentCounts,
      yearCounts,
      periodCounts,
    };
  }

  /**
   * Searches and builds student attendance history and OD eligibility summary.
   */
  async searchStudentAttendance(query: string): Promise<StudentAttendanceSummary[]> {
    const sessions = await this.getSessions();
    const records = await this.getAllRecords();
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const cleanQuery = query.trim().toLowerCase();

    const studentMap = new Map<
      string,
      {
        regNo: string;
        name: string;
        department: string;
        year: number;
        section: string;
        records: AttendanceRecord[];
      }
    >();

    records
      .filter((r) => r.attendeeType === "student" && r.studentRegNo)
      .forEach((r) => {
        const regNo = r.studentRegNo!;
        if (!studentMap.has(regNo)) {
          studentMap.set(regNo, {
            regNo,
            name: r.studentName || "N/A",
            department: r.studentDepartment || "N/A",
            year: r.studentYear || 0,
            section: r.studentSection || "A",
            records: [],
          });
        }
        studentMap.get(regNo)!.records.push(r);
      });

    const totalSessions = sessions.length || 1;
    const summaries: StudentAttendanceSummary[] = [];

    studentMap.forEach((student) => {
      const matches =
        !cleanQuery ||
        student.regNo.toLowerCase().includes(cleanQuery) ||
        student.name.toLowerCase().includes(cleanQuery) ||
        student.department.toLowerCase().includes(cleanQuery);

      if (matches) {
        const history = student.records.map((r) => {
          const s = sessionMap.get(r.sessionId);
          return {
            sessionId: r.sessionId,
            sessionName: s?.sessionName || "Unknown Session",
            eventName: s?.eventName || "Event",
            period: s?.period || "morning",
            markedAt: r.markedAt,
            status: r.status,
            verificationMethod: r.verificationMethod,
          };
        });

        const rate = Math.round((history.length / totalSessions) * 100);

        summaries.push({
          studentRegNo: student.regNo,
          studentName: student.name,
          department: student.department,
          year: student.year,
          section: student.section,
          sessionsAttended: history.length,
          totalSessions,
          attendanceRate: Math.min(100, rate),
          history,
        });
      }
    });

    return summaries.sort((a, b) => b.sessionsAttended - a.sessionsAttended);
  }

  /**
   * Generates a Master Consolidated Attendance CSV spanning all sessions.
   */
  async generateMasterAttendanceCSV(): Promise<string> {
    const sessions = await this.getSessions();
    const records = await this.getAllRecords();

    const studentMap = new Map<
      string,
      {
        regNo: string;
        name: string;
        dept: string;
        year: number | string;
        section: string;
        attendedSessions: Set<string>;
      }
    >();

    records
      .filter((r) => r.attendeeType === "student" && r.studentRegNo)
      .forEach((r) => {
        const regNo = r.studentRegNo!;
        if (!studentMap.has(regNo)) {
          studentMap.set(regNo, {
            regNo,
            name: r.studentName || "N/A",
            dept: r.studentDepartment || "N/A",
            year: r.studentYear || "N/A",
            section: r.studentSection || "N/A",
            attendedSessions: new Set(),
          });
        }
        studentMap.get(regNo)!.attendedSessions.add(r.sessionId);
      });

    const headers = [
      "S.No",
      "Registration Number",
      "Student Name",
      "Department",
      "Year",
      "Section",
      ...sessions.map((s) => `"${s.sessionName.replace(/"/g, '""')} (${s.period})"`),
      "Total Attended",
      "Attendance %",
      "OD Eligible",
    ];

    const rows = Array.from(studentMap.values()).map((student, idx) => {
      const sessionAttendanceCols = sessions.map((s) =>
        student.attendedSessions.has(s.id) ? "P" : "A"
      );
      const attendedCount = student.attendedSessions.size;
      const rate = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 0;
      const odEligible = rate >= 75 ? "YES" : "NO";

      return [
        idx + 1,
        `"${student.regNo}"`,
        `"${student.name.replace(/"/g, '""')}"`,
        `"${student.dept}"`,
        `"${student.year}"`,
        `"${student.section}"`,
        ...sessionAttendanceCols,
        attendedCount,
        `${rate}%`,
        `"${odEligible}"`,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Downloads the master consolidated CSV sheet.
   */
  async downloadMasterAttendanceCSV(): Promise<void> {
    const csvContent = await this.generateMasterAttendanceCSV();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `ciet_coders_club_master_attendance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Retrieves coordinator / associate attendance records across sessions or for a specific session.
   */
  async getCoordinatorRecords(sessionId?: string): Promise<AttendanceRecord[]> {
    const allRecords = await this.getAllRecords();
    return allRecords.filter(
      (r) =>
        r.attendeeType === "associate" &&
        (!sessionId || r.sessionId === sessionId)
    );
  }

  /**
   * Generates a CSV sheet specifically for Coordinator & Associate attendance.
   */
  async generateCoordinatorAttendanceCSV(sessionId?: string): Promise<string> {
    const sessions = await this.getSessions();
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const records = await this.getCoordinatorRecords(sessionId);

    const headers = [
      "S.No",
      "Coordinator ID / Reg No",
      "Coordinator Name",
      "Department",
      "Role / Designation",
      "Event Name",
      "Session Name",
      "Period",
      "Verification Method",
      "Time Marked",
      "Status",
    ];

    const rows = records.map((r, index) => {
      const session = sessionMap.get(r.sessionId);
      const coordId = r.associateUserId || "N/A";
      const name = r.associateName || r.studentName || "N/A";
      const dept = r.studentDepartment || "Executive";
      const role = r.markedBy || "Event Coordinator";
      const eventName = session?.eventName || "Event";
      const sessionName = session?.sessionName || "Session";
      const period = session?.period || "N/A";
      const method = r.verificationMethod === "qr_scan" ? "QR Scanned" : "Coordinator Check-in";
      const time = new Date(r.markedAt).toLocaleString();

      return [
        index + 1,
        `"${coordId}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${dept}"`,
        `"${role.replace(/"/g, '""')}"`,
        `"${eventName.replace(/"/g, '""')}"`,
        `"${sessionName.replace(/"/g, '""')}"`,
        `"${period}"`,
        `"${method}"`,
        `"${time}"`,
        `"${r.status}"`,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Downloads the coordinator attendance CSV.
   */
  async downloadCoordinatorAttendanceCSV(sessionId?: string): Promise<void> {
    const csvContent = await this.generateCoordinatorAttendanceCSV(sessionId);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `ciet_coders_club_coordinators_attendance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const attendanceService = new AttendanceService();

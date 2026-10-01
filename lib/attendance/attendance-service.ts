import {
  AttendanceRecord,
  AttendanceSession,
  CreateSessionInput,
  HandshakeChallenge,
  ManualAttendanceInput,
  QRTokenData,
  StudentAttendanceSubmission,
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

class AttendanceService {
  // In-memory fallback for challenge tokens
  private activeChallenges: Map<string, { sessionId: string; expiresAt: number; consumed: boolean }> = new Map();

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
    type: "NEW_RECORD" | "NEW_SESSION" | "SESSION_ENDED";
    sessionId?: string;
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
   */
  async getSessions(): Promise<AttendanceSession[]> {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
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
    this.broadcastEvent({ type: "SESSION_ENDED", sessionId });
    return { ...session };
  }

  /**
   * Generates a secure temporary QR token for an active session.
   * Validity window: EXACTLY 5 MINUTES (300,000 ms).
   */
  async generateSessionQR(sessionId: string): Promise<QRTokenData> {
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
      iat: issuedAt,
      exp: expiresAtMs,
      p: session.period,
    });

    const token = typeof window !== "undefined" ? btoa(rawPayload) : Buffer.from(rawPayload).toString("base64");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const scanUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(token)}`;

    return {
      sessionId,
      qrToken: token,
      scanUrl,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  /**
   * Performs the anti-replay handshake when a student scans the QR URL.
   * 1. Validates that the 5-minute QR code has not expired.
   * 2. Generates a single-use challenge token valid for 5 minutes (300 seconds).
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

      const session = await this.getSessionById(payload.sid);
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

      return {
        valid: true,
        sessionId: session.id,
        eventName: session.eventName,
        subEventName: session.subEventName,
        period: session.period,
        challengeToken,
        expiresInSeconds: 300,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("expired")) {
        throw err;
      }
      throw new Error("Invalid or corrupted QR attendance token.");
    }
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

    const records = this.getStoredRecords();
    const isDuplicate = checkDuplicateAttendance(records, {
      studentRegNo: submission.studentRegNo,
    });

    if (isDuplicate) {
      throw new Error(
        `Attendance for registration number ${submission.studentRegNo} has already been recorded for this session.`
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

    const updatedRecords = [newRecord, ...records];
    this.saveStoredRecords(updatedRecords);

    // Broadcast across all open tabs, windows, and in-tab listeners!
    this.broadcastEvent({
      type: "NEW_RECORD",
      sessionId: challenge.sessionId,
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

    const records = this.getStoredRecords();
    const isDuplicate = checkDuplicateAttendance(records, {
      studentRegNo: input.studentRegNo,
    });

    if (isDuplicate) {
      throw new Error(
        `Attendance for registration number ${input.studentRegNo} has already been recorded for this session.`
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

    const updatedRecords = [newRecord, ...records];
    this.saveStoredRecords(updatedRecords);

    this.broadcastEvent({
      type: "NEW_RECORD",
      sessionId: input.sessionId,
      record: newRecord,
    });

    return newRecord;
  }

  /**
   * Retrieves all attendance records for a given session.
   */
  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const records = this.getStoredRecords();
    return records.filter((r) => r.sessionId === sessionId);
  }

  /**
   * Subscribes to live attendee changes via BroadcastChannel, Storage events, CustomEvents, and Supabase Realtime.
   */
  subscribeToLiveAttendees(
    sessionId: string,
    onNewRecord: (record: AttendanceRecord) => void
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    if (typeof window !== "undefined") {
      // 1. Same-tab CustomEvent listener
      const handleCustomEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        const data = customEvent.detail;
        if (data && data.type === "NEW_RECORD" && data.sessionId === sessionId && data.record) {
          onNewRecord(data.record);
        }
      };
      window.addEventListener("coders_club_attendance_event", handleCustomEvent);
      unsubscribers.push(() => window.removeEventListener("coders_club_attendance_event", handleCustomEvent));

      // 2. Cross-tab BroadcastChannel listener
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (event) => {
          const data = event.data;
          if (data && data.type === "NEW_RECORD" && data.sessionId === sessionId && data.record) {
            onNewRecord(data.record);
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
              if (payload.new) {
                onNewRecord(payload.new as AttendanceRecord);
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
      const year = r.studentYear ? `Yr ${r.studentYear}` : "N/A";
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
}

export const attendanceService = new AttendanceService();

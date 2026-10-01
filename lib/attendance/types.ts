export type AttendancePeriod = "morning" | "afternoon";

export type AttendeeType = "student" | "associate";

export type AttendanceStatus = "present" | "late" | "excused";

export type VerificationMethod = "qr_scan" | "manual_entry";

export const DEPARTMENTS = [
  "CSE",
  "IT",
  "AI&DS",
  "AI&ML",
  "Cyber Security",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface AttendanceSession {
  id: string;
  eventId: string;
  eventName: string;
  subEventId?: string;
  subEventName?: string;
  period: AttendancePeriod;
  sessionName: string;
  createdBy: string;
  createdByName?: string;
  isActive: boolean;
  startsAt: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentRegNo?: string;
  studentName?: string;
  studentDepartment?: string;
  studentYear?: number;
  studentSection?: string;
  associateUserId?: string;
  associateName?: string;
  attendeeType: AttendeeType;
  verificationMethod: VerificationMethod;
  status: AttendanceStatus;
  markedBy?: string;
  clientMetadata?: {
    userAgent?: string;
    ipHash?: string;
  };
  markedAt: string;
}

export interface CreateSessionInput {
  eventId: string;
  eventName: string;
  subEventId?: string;
  subEventName?: string;
  period: AttendancePeriod;
  sessionName: string;
}

export interface QRTokenData {
  sessionId: string;
  qrToken: string;
  scanUrl: string;
  issuedAt: string;
  expiresAt: string;
  attendeeType?: AttendeeType;
}

export interface HandshakeChallenge {
  valid: boolean;
  sessionId: string;
  eventName: string;
  subEventName?: string;
  period: AttendancePeriod;
  challengeToken: string;
  expiresInSeconds: number;
  targetAttendeeType?: AttendeeType;
}

export interface StudentAttendanceSubmission {
  challengeToken: string;
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  clientTimestamp: string;
}

export interface AssociateAttendanceSubmission {
  challengeToken: string;
  associateUserId: string;
  associateName: string;
  department: string;
  role: string;
}

export interface ManualAttendanceInput {
  sessionId: string;
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  reason?: string;
  markedBy?: string;
}

export const COORDINATOR_ROLES = [
  "Club Executive",
  "Event Coordinator",
  "Technical Volunteer",
  "Design Lead",
  "Core Team Member",
  "Faculty Coordinator",
] as const;

export type CoordinatorRole = (typeof COORDINATOR_ROLES)[number];

export interface CoordinatorAttendanceInput {
  sessionId: string;
  coordinatorId: string;
  coordinatorName: string;
  department: string;
  role: string;
  markedBy?: string;
}

export interface AttendanceValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SessionAttendanceStats {
  totalCount: number;
  studentCount: number;
  associateCount: number;
  period: AttendancePeriod;
  sessionName: string;
  eventName: string;
}

export type AttendanceStats = SessionAttendanceStats;

export interface PlatformAttendanceAnalytics {
  totalRecords: number;
  distinctStudents: number;
  distinctAssociates: number;
  totalSessions: number;
  activeSessions: number;
  departmentCounts: Record<string, number>;
  yearCounts: Record<number, number>;
  periodCounts: { morning: number; afternoon: number };
}

export interface StudentAttendanceSummary {
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  sessionsAttended: number;
  totalSessions: number;
  attendanceRate: number;
  history: {
    sessionId: string;
    sessionName: string;
    eventName: string;
    period: AttendancePeriod;
    markedAt: string;
    status: AttendanceStatus;
    verificationMethod: VerificationMethod;
  }[];
}

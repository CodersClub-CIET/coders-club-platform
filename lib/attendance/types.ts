export type AttendancePeriod = "morning" | "afternoon";

export type AttendeeType = "student" | "associate";

export type AttendanceStatus = "present" | "late" | "excused";

export type VerificationMethod = "qr_scan" | "manual_entry";

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
}

export interface HandshakeChallenge {
  valid: boolean;
  sessionId: string;
  eventName: string;
  subEventName?: string;
  period: AttendancePeriod;
  challengeToken: string;
  expiresInSeconds: number;
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
  sessionId: string;
  associateUserId: string;
  associateName: string;
}

export interface AttendanceValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AttendanceStats {
  totalCount: number;
  studentCount: number;
  associateCount: number;
  period: AttendancePeriod;
  sessionName: string;
  eventName: string;
}

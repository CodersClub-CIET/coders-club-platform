/**
 * Reports Module - Data Contracts & Types
 *
 * Defines TypeScript interfaces for querying, aggregating, and exporting
 * reports across attendance, scores, students, and associate duty allocations.
 *
 * Reuses domain types from:
 * - lib/attendance/types.ts
 * - app/types/score.ts
 * - lib/allocation/types.ts
 */

import type {
  AttendancePeriod,
  AttendeeType,
  AttendanceStatus,
  Department,
  AttendanceRecord,
  AttendanceSession,
  StudentAttendanceSummary,
} from "@/lib/attendance/types";

import type {
  EventScoreRecord,
  EventReference as ScoreEventReference,
  SubEventReference as ScoreSubEventReference,
} from "@/app/types/score";

import type {
  AssociateAllocation,
  AllocationStatus,
} from "@/lib/allocation/types";

// Re-export foundational types for consumers of the Reports module
export type {
  AttendancePeriod,
  AttendeeType,
  AttendanceStatus,
  Department,
  AttendanceRecord,
  AttendanceSession,
  StudentAttendanceSummary,
  EventScoreRecord,
  ScoreEventReference,
  ScoreSubEventReference,
  AssociateAllocation,
  AllocationStatus,
};

// ============================================================================
// 1. Report Query Filters
// ============================================================================

/**
 * Filter parameters for querying consolidated attendance reports.
 */
export interface AttendanceReportQuery {
  eventId?: string;
  subEventId?: string;
  sessionId?: string;
  department?: Department | "all";
  year?: number | "all";
  section?: string | "all";
  period?: AttendancePeriod | "all";
  attendeeType?: AttendeeType | "all";
  status?: AttendanceStatus | "all";
  startDate?: string; // ISO 8601 string or YYYY-MM-DD
  endDate?: string;   // ISO 8601 string or YYYY-MM-DD
  search?: string;    // Student name, register number, or associate name
}

/**
 * Filter parameters for querying competition & event score reports.
 */
export interface ScoreReportQuery {
  eventId?: string;
  subEventId?: string;
  department?: Department | "all";
  year?: number | "all";
  section?: string | "all";
  minScore?: number;
  maxScore?: number;
  search?: string;    // Student name or register number
}

/**
 * Filter parameters for querying associate duty and allocation reports.
 */
export interface AssociateDutyReportQuery {
  associateId?: string;
  eventId?: string;
  department?: Department | string | "all";
  allocationStatus?: AllocationStatus | "all";
  attendanceAccess?: boolean | "all";
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ============================================================================
// 2. Aggregated Report Summaries
// ============================================================================

/**
 * Aggregated attendance and performance metrics grouped by academic department.
 */
export interface DepartmentReportSummary {
  department: Department | string;
  totalStudents: number;
  totalAttendanceRecords: number;
  averageAttendanceRate: number; // Percentage (0 - 100)
  odEligibleCount: number;       // Number of students meeting OD threshold (>= 75%)
  totalEventsParticipated: number;
  averageScore?: number;         // Average score across events (if score data exists)
  averageScorePercentage?: number;
}

/**
 * Detailed performance and participation profile for an individual student.
 * Combines attendance records, OD eligibility, and event competition marks.
 */
export interface StudentPerformanceProfile {
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  // Attendance metrics
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;        // Percentage (0 - 100)
  isOdEligible: boolean;         // true if attendanceRate >= 75%
  attendanceHistory: StudentAttendanceSummary["history"];
  // Performance & Score metrics
  scoreRecords: EventScoreRecord[];
  totalEventsScored: number;
  overallAveragePercentage: number;
  topScore?: {
    eventId: string;
    eventName: string;
    subEventName?: string;
    score: number;
    maxScore: number;
    percentage: number;
  };
}

/**
 * Consolidated report summary for a specific event or competition.
 */
export interface EventReportSummary {
  eventId: string;
  eventName: string;
  subEventId?: string;
  subEventName?: string;
  totalRegisteredOrAttended: number;
  studentAttendanceCount: number;
  associateAttendanceCount: number;
  departmentBreakdown: Record<string, number>;
  yearBreakdown: Record<number, number>;
  scoreStatistics?: {
    totalScored: number;
    highestScore: number;
    lowestScore: number;
    averageScore: number;
    averagePercentage: number;
    maxPossibleScore: number;
  };
}

/**
 * Summary of associate duty assignments and on-site attendance check-ins.
 */
export interface AssociateDutyReportSummary {
  associateId: string;
  associateName: string;
  associateEmail: string;
  department: string;
  totalAllocations: number;
  activeAllocations: number;
  completedAllocations: number;
  verifiedAttendances: number;
  allocatedEvents: Array<{
    eventId: string;
    eventName: string;
    subEventName?: string;
    status: AllocationStatus;
    attendanceAccess: boolean;
  }>;
}

// ============================================================================
// 3. Export & Print Options
// ============================================================================

/**
 * Options for generating and downloading CSV data sheets.
 */
export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  dateStamp?: boolean;
  columns?: string[];
  delimiter?: string;
}

/**
 * Signatory block for formal institutional documents (OD letters, certificates).
 */
export interface ReportSignatory {
  label: string;      // e.g. "Faculty Coordinator", "Coders Club Staff In-Charge", "HOD"
  name?: string;
  title?: string;
  department?: string;
}

/**
 * Options for rendering formal printable institutional reports (PDF/Print).
 */
export interface PrintLayoutOptions {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  includeLetterhead?: boolean;
  institutionName?: string;
  institutionAddress?: string;
  autonomousAffiliation?: string;
  includeSignatures?: boolean;
  signatories?: ReportSignatory[];
  generatedAt?: string;
}

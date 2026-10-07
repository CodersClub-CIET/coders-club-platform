import { StudentAttendanceSummary } from "@/lib/attendance/types";
import { EventScoreRecord } from "@/app/types/score";

/**
 * Optional professional links for a student.
 * BACKEND CONTRACT REQUIRED: Database columns or profile table in Supabase.
 */
export interface StudentSocialLinks {
  githubUrl?: string;
  linkedinUrl?: string;
}

/**
 * Academic context for a student.
 * BACKEND CONTRACT REQUIRED: Multi-semester historical academic records table in Supabase.
 */
export interface StudentAcademicContext {
  cgpa?: number;
  currentSemester?: number;
  batch?: string;
  mentorName?: string;
}

/**
 * Unified Student Performance Profile.
 * Combines existing live attendance data, event scores, and placeholder fields
 * for profiles awaiting backend team contracts.
 */
export interface StudentPerformanceProfile {
  // Identity fields (available from attendance & score records)
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;

  // Live Attendance data (reused from Attendance module)
  attendance: StudentAttendanceSummary;

  // Event Scores data (reused from Score Management module)
  eventScores: EventScoreRecord[];

  // Professional links (awaiting backend contract)
  socialLinks?: StudentSocialLinks;

  // Academic context (awaiting backend contract)
  academicContext?: StudentAcademicContext;
}

/**
 * Filter and search state for the performance dashboard.
 */
export interface PerformanceFilterState {
  searchQuery: string;
  selectedDepartment: string;
  selectedYear: string;
}

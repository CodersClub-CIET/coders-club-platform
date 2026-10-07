import { attendanceService } from "@/lib/attendance/attendance-service";
import { StudentAttendanceSummary } from "@/lib/attendance/types";
import { EventScoreRecord } from "@/app/types/score";
import { StudentPerformanceProfile } from "./types";

/**
 * Service responsible for assembling Student Performance views.
 *
 * Current Data Sources:
 * 1. Attendance Data -> Reuses attendanceService (backed by Supabase public.attendance_records).
 * 2. Event Scores -> BACKEND CONTRACT REQUIRED (event_scores Supabase table).
 * 3. GitHub & LinkedIn -> BACKEND CONTRACT REQUIRED (student_profiles Supabase table).
 * 4. Academic History -> BACKEND CONTRACT REQUIRED (academic_records Supabase table).
 * 5. Authoritative Overall Score -> BACKEND CONTRACT REQUIRED (composite scoring contract).
 */
export class PerformanceService {
  /**
   * Searches for students by registration number, name, or department
   * using the existing, verified Attendance infrastructure.
   */
  async searchStudents(query: string): Promise<StudentAttendanceSummary[]> {
    return attendanceService.searchStudentAttendance(query);
  }

  /**
   * Retrieves event scores for a specific student.
   *
   * BACKEND CONTRACT REQUIRED:
   * The backend team has not yet deployed an `event_scores` Supabase table.
   * Once provided by the backend team, this function will query Supabase directly:
   *   supabase.from('event_scores').select('*').eq('student_reg_no', studentRegNo)
   */
  async getStudentScores(
    _studentRegNo: string
  ): Promise<EventScoreRecord[]> {
    // Returning empty array until the backend team deploys the event_scores table
    return [];
  }

  /**
   * Builds a unified StudentPerformanceProfile for a given registration number.
   * Reuses the verified Attendance summary and attaches any score/profile data.
   */
  async getStudentPerformanceProfile(
    studentRegNo: string
  ): Promise<StudentPerformanceProfile | null> {
    const attendanceSummaries = await attendanceService.searchStudentAttendance(
      studentRegNo
    );

    const matchingAttendance = attendanceSummaries.find(
      (s) => s.studentRegNo.toLowerCase() === studentRegNo.trim().toLowerCase()
    );

    if (!matchingAttendance) {
      return null;
    }

    const eventScores = await this.getStudentScores(matchingAttendance.studentRegNo);

    return {
      studentRegNo: matchingAttendance.studentRegNo,
      studentName: matchingAttendance.studentName,
      department: matchingAttendance.department,
      year: matchingAttendance.year,
      section: matchingAttendance.section,
      attendance: matchingAttendance,
      eventScores,
      // External profiles and academic history await backend team contracts
      socialLinks: undefined,
      academicContext: undefined,
    };
  }
}

export const performanceService = new PerformanceService();

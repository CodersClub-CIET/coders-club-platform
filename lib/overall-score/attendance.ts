import type { StudentAttendanceSummary } from "../../lib/attendance/types";

/**
 * Converts an Attendance summary into the
 * normalized Attendance score used by Overall Score.
 *
 * The Attendance module already provides attendanceRate
 * as a percentage from 0 to 100.
 */
export function calculateAttendanceScore(
  summary: Pick<StudentAttendanceSummary, "attendanceRate">,
): number {
  const attendanceRate = summary.attendanceRate;

  if (!Number.isFinite(attendanceRate)) {
    throw new Error(
      "Attendance rate must be a finite number",
    );
  }

  if (attendanceRate < 0 || attendanceRate > 100) {
    throw new Error(
      "Attendance rate must be between 0 and 100",
    );
  }

  return Number(attendanceRate.toFixed(2));
}
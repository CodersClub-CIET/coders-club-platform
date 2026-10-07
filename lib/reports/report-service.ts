/**
 * Reports Module - Report Aggregation Service
 *
 * Implements report queries, cross-module aggregations, and performance metrics
 * by consuming the existing Attendance, Score Management, and Associate Allocation
 * subsystems.
 *
 * All operations are read-only and strictly conform to existing contracts without
 * modifying external modules or inventing unapproved backend APIs.
 */

import { attendanceService } from "@/lib/attendance/attendance-service";
import { allocationService } from "@/lib/allocation/service";
import { DEPARTMENTS } from "@/lib/attendance/types";
import type {
  AttendanceRecord,
  AttendanceSession,
  Department,
  StudentAttendanceSummary,
} from "@/lib/attendance/types";
import type { EventScoreRecord } from "@/app/types/score";
import type { AssociateAllocation } from "@/lib/allocation/types";
import { calculatePercentage } from "@/app/lib/score-validation";
import type {
  AttendanceReportQuery,
  ScoreReportQuery,
  AssociateDutyReportQuery,
  DepartmentReportSummary,
  StudentPerformanceProfile,
  EventReportSummary,
  AssociateDutyReportSummary,
} from "./types";

export class ReportService {
  /**
   * Filters attendance records across sessions based on the provided query criteria.
   */
  async filterAttendanceRecords(
    query?: AttendanceReportQuery
  ): Promise<AttendanceRecord[]> {
    const [allRecords, sessions] = await Promise.all([
      attendanceService.getAllRecords(),
      attendanceService.getSessions(),
    ]);

    const sessionMap = new Map<string, AttendanceSession>(
      sessions.map((s) => [s.id, s])
    );

    if (!query) {
      return allRecords;
    }

    const searchLower = query.search?.trim().toLowerCase();

    return allRecords.filter((record) => {
      const session = sessionMap.get(record.sessionId);

      // Session ID filter
      if (query.sessionId && record.sessionId !== query.sessionId) {
        return false;
      }

      // Event ID filter
      if (query.eventId && session?.eventId !== query.eventId) {
        return false;
      }

      // Sub-event ID filter
      if (query.subEventId && session?.subEventId !== query.subEventId) {
        return false;
      }

      // Session Period filter (morning / afternoon)
      if (query.period && query.period !== "all") {
        if (session?.period !== query.period) {
          return false;
        }
      }

      // Department filter
      if (query.department && query.department !== "all") {
        if (
          !record.studentDepartment ||
          record.studentDepartment.trim().toLowerCase() !==
            query.department.trim().toLowerCase()
        ) {
          return false;
        }
      }

      // Academic Study Year filter (1, 2, 3, 4)
      if (query.year !== undefined && query.year !== "all") {
        if (record.studentYear !== query.year) {
          return false;
        }
      }

      // Section filter
      if (query.section && query.section !== "all") {
        if (
          !record.studentSection ||
          record.studentSection.trim().toLowerCase() !==
            query.section.trim().toLowerCase()
        ) {
          return false;
        }
      }

      // Attendee type filter (student / associate)
      if (query.attendeeType && query.attendeeType !== "all") {
        if (record.attendeeType !== query.attendeeType) {
          return false;
        }
      }

      // Attendance status filter (present / late / excused)
      if (query.status && query.status !== "all") {
        if (record.status !== query.status) {
          return false;
        }
      }

      // Date range filtering on markedAt timestamp
      if (query.startDate) {
        const recordDate = new Date(record.markedAt).getTime();
        const start = new Date(query.startDate).getTime();
        if (recordDate < start) {
          return false;
        }
      }

      if (query.endDate) {
        const recordDate = new Date(record.markedAt).getTime();
        const end = new Date(query.endDate).getTime();
        // If query is an ISO date string without time, consider end of that day
        const endBoundary = query.endDate.length === 10 ? end + 86400000 : end;
        if (recordDate > endBoundary) {
          return false;
        }
      }

      // Search query across student name, reg number, associate name, and associate ID
      if (searchLower) {
        const nameMatch = record.studentName?.toLowerCase().includes(searchLower);
        const regMatch = record.studentRegNo?.toLowerCase().includes(searchLower);
        const assocNameMatch = record.associateName?.toLowerCase().includes(searchLower);
        const assocIdMatch = record.associateUserId?.toLowerCase().includes(searchLower);

        if (!nameMatch && !regMatch && !assocNameMatch && !assocIdMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Pure utility to filter score records against criteria.
   */
  filterScoreRecords(
    records: EventScoreRecord[],
    query: ScoreReportQuery
  ): EventScoreRecord[] {
    const searchLower = query.search?.trim().toLowerCase();

    return records.filter((record) => {
      if (query.eventId && record.eventId !== query.eventId) {
        return false;
      }

      if (query.subEventId && record.subEventId !== query.subEventId) {
        return false;
      }

      if (query.department && query.department !== "all") {
        if (
          record.department.trim().toLowerCase() !==
          query.department.trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (query.year !== undefined && query.year !== "all") {
        if (record.year !== query.year) {
          return false;
        }
      }

      if (query.section && query.section !== "all") {
        if (
          record.section.trim().toLowerCase() !==
          query.section.trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (typeof query.minScore === "number" && record.score < query.minScore) {
        return false;
      }

      if (typeof query.maxScore === "number" && record.score > query.maxScore) {
        return false;
      }

      if (searchLower) {
        const nameMatch = record.studentName.toLowerCase().includes(searchLower);
        const regMatch = record.studentRegNo.toLowerCase().includes(searchLower);
        const idMatch = record.studentId.toLowerCase().includes(searchLower);

        if (!nameMatch && !regMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Aggregates attendance records and optional score records into department-level
   * intelligence and On-Duty (OD) summaries across all official CIET departments.
   */
  async getDepartmentReportSummaries(
    query?: AttendanceReportQuery,
    scoreRecords?: EventScoreRecord[]
  ): Promise<DepartmentReportSummary[]> {
    const [filteredRecords, sessions] = await Promise.all([
      this.filterAttendanceRecords(query),
      attendanceService.getSessions(),
    ]);

    const sessionMap = new Map<string, AttendanceSession>(
      sessions.map((s) => [s.id, s])
    );

    // Only student records are considered for academic departmental attendance
    const studentRecords = filteredRecords.filter(
      (r) => r.attendeeType === "student" && !!r.studentDepartment
    );

    // Total active/relevant sessions count for calculating student attendance rate
    const totalSessionsCount = sessions.length > 0 ? sessions.length : 1;

    // Collect all departments to evaluate (official CIET departments + any in records)
    const departmentsToEvaluate = new Set<string>(DEPARTMENTS);
    for (const r of studentRecords) {
      if (r.studentDepartment) {
        departmentsToEvaluate.add(r.studentDepartment.trim());
      }
    }

    const summaries: DepartmentReportSummary[] = [];

    for (const dept of departmentsToEvaluate) {
      const deptRecords = studentRecords.filter(
        (r) =>
          r.studentDepartment?.trim().toLowerCase() === dept.trim().toLowerCase()
      );

      // Group records by unique student register number
      const studentMap = new Map<string, AttendanceRecord[]>();
      const distinctEvents = new Set<string>();

      for (const r of deptRecords) {
        if (!r.studentRegNo) continue;
        const list = studentMap.get(r.studentRegNo) || [];
        list.push(r);
        studentMap.set(r.studentRegNo, list);

        const session = sessionMap.get(r.sessionId);
        if (session?.eventId) {
          distinctEvents.add(session.eventId);
        }
      }

      const totalStudents = studentMap.size;
      const totalAttendanceRecords = deptRecords.length;

      let odEligibleCount = 0;
      let totalAttendanceRateSum = 0;

      for (const [, recordsOfStudent] of studentMap) {
        // Attendance rate = (sessions attended / total sessions available) * 100
        const studentRate = Math.min(
          100,
          Math.round(
            (recordsOfStudent.length / totalSessionsCount) * 100 * 100
          ) / 100
        );

        totalAttendanceRateSum += studentRate;

        // CIET official OD threshold: >= 75%
        if (studentRate >= 75) {
          odEligibleCount++;
        }
      }

      const averageAttendanceRate =
        totalStudents > 0
          ? Math.round((totalAttendanceRateSum / totalStudents) * 100) / 100
          : 0;

      // Optional score aggregation for this department
      let averageScore: number | undefined;
      let averageScorePercentage: number | undefined;

      if (scoreRecords && scoreRecords.length > 0) {
        const deptScores = scoreRecords.filter(
          (s) =>
            s.department?.trim().toLowerCase() === dept.trim().toLowerCase()
        );

        if (deptScores.length > 0) {
          const totalScoreSum = deptScores.reduce((acc, s) => acc + s.score, 0);
          averageScore =
            Math.round((totalScoreSum / deptScores.length) * 100) / 100;

          const totalPercentageSum = deptScores.reduce(
            (acc, s) => acc + calculatePercentage(s.score, s.maxScore),
            0
          );
          averageScorePercentage =
            Math.round((totalPercentageSum / deptScores.length) * 100) / 100;
        }
      }

      summaries.push({
        department: dept as Department,
        totalStudents,
        totalAttendanceRecords,
        averageAttendanceRate,
        odEligibleCount,
        totalEventsParticipated: distinctEvents.size,
        averageScore,
        averageScorePercentage,
      });
    }

    // Sort departments by total attendance records descending
    return summaries.sort(
      (a, b) => b.totalAttendanceRecords - a.totalAttendanceRecords
    );
  }

  /**
   * Retrieves an individual student's consolidated profile, combining attendance
   * participation logs, OD eligibility, and event scores.
   */
  async getStudentPerformanceProfile(
    studentRegNo: string,
    scoreRecords?: EventScoreRecord[]
  ): Promise<StudentPerformanceProfile | null> {
    const trimmedReg = studentRegNo.trim();
    if (!trimmedReg) return null;

    const [allRecords, sessions] = await Promise.all([
      attendanceService.getAllRecords(),
      attendanceService.getSessions(),
    ]);

    const sessionMap = new Map<string, AttendanceSession>(
      sessions.map((s) => [s.id, s])
    );

    // Find all attendance records for this student
    const studentRecords = allRecords.filter(
      (r) =>
        r.attendeeType === "student" &&
        r.studentRegNo?.trim().toLowerCase() === trimmedReg.toLowerCase()
    );

    // Also look up in score records if provided
    const matchingScores =
      scoreRecords?.filter(
        (s) => s.studentRegNo.trim().toLowerCase() === trimmedReg.toLowerCase()
      ) || [];

    // If student has no attendance and no score records, profile does not exist
    if (studentRecords.length === 0 && matchingScores.length === 0) {
      return null;
    }

    // Derive student details from records
    const canonicalRecord = studentRecords[0];
    const canonicalScore = matchingScores[0];

    const studentName =
      canonicalRecord?.studentName || canonicalScore?.studentName || "Student";
    const department =
      canonicalRecord?.studentDepartment || canonicalScore?.department || "CSE";
    const year = canonicalRecord?.studentYear || canonicalScore?.year || 1;
    const section =
      canonicalRecord?.studentSection || canonicalScore?.section || "A";

    const totalSessions = sessions.length > 0 ? sessions.length : 1;
    const attendedSessions = studentRecords.length;

    const attendanceRate = Math.min(
      100,
      Math.round((attendedSessions / totalSessions) * 100 * 100) / 100
    );
    const isOdEligible = attendanceRate >= 75;

    // Map detailed history
    const attendanceHistory: StudentAttendanceSummary["history"] =
      studentRecords.map((r) => {
        const session = sessionMap.get(r.sessionId);
        return {
          sessionId: r.sessionId,
          sessionName: session?.sessionName || "Attendance Session",
          eventName: session?.eventName || "CIET Coders Club Event",
          period: session?.period || "morning",
          markedAt: r.markedAt,
          status: r.status,
          verificationMethod: r.verificationMethod,
        };
      });

    // Score calculations
    let overallAveragePercentage = 0;
    let topScore: StudentPerformanceProfile["topScore"] = undefined;

    if (matchingScores.length > 0) {
      let highestPercent = -1;
      let totalPercentageSum = 0;

      for (const s of matchingScores) {
        const percent = calculatePercentage(s.score, s.maxScore);
        totalPercentageSum += percent;

        if (percent > highestPercent) {
          highestPercent = percent;
          topScore = {
            eventId: s.eventId,
            eventName: s.eventName,
            subEventName: s.subEventName,
            score: s.score,
            maxScore: s.maxScore,
            percentage: percent,
          };
        }
      }

      overallAveragePercentage =
        Math.round((totalPercentageSum / matchingScores.length) * 100) / 100;
    }

    return {
      studentRegNo: canonicalRecord?.studentRegNo || trimmedReg,
      studentName,
      department,
      year,
      section,
      totalSessions,
      attendedSessions,
      attendanceRate,
      isOdEligible,
      attendanceHistory,
      scoreRecords: matchingScores,
      totalEventsScored: matchingScores.length,
      overallAveragePercentage,
      topScore,
    };
  }

  /**
   * Aggregates event participation, department distribution, and competition score metrics.
   */
  async getEventReportSummary(
    eventId: string,
    scoreRecords?: EventScoreRecord[]
  ): Promise<EventReportSummary | null> {
    const [allRecords, sessions] = await Promise.all([
      attendanceService.getAllRecords(),
      attendanceService.getSessions(),
    ]);

    const matchingSessions = sessions.filter((s) => s.eventId === eventId);
    if (matchingSessions.length === 0) {
      return null;
    }

    const sessionIds = new Set(matchingSessions.map((s) => s.id));
    const eventRecords = allRecords.filter((r) => sessionIds.has(r.sessionId));

    const canonicalSession = matchingSessions[0];
    const eventName = canonicalSession.eventName;
    const subEventId = canonicalSession.subEventId;
    const subEventName = canonicalSession.subEventName;

    const studentRecords = eventRecords.filter(
      (r) => r.attendeeType === "student"
    );
    const associateRecords = eventRecords.filter(
      (r) => r.attendeeType === "associate"
    );

    // Department breakdown
    const departmentBreakdown: Record<string, number> = {};
    for (const r of studentRecords) {
      const dept = r.studentDepartment || "Unassigned";
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
    }

    // Year breakdown
    const yearBreakdown: Record<number, number> = {};
    for (const r of studentRecords) {
      const yr = r.studentYear || 1;
      yearBreakdown[yr] = (yearBreakdown[yr] || 0) + 1;
    }

    // Score statistics
    let scoreStatistics: EventReportSummary["scoreStatistics"] = undefined;
    const matchingScores =
      scoreRecords?.filter((s) => s.eventId === eventId) || [];

    if (matchingScores.length > 0) {
      const totalScored = matchingScores.length;
      let highestScore = matchingScores[0].score;
      let lowestScore = matchingScores[0].score;
      let totalScoreSum = 0;
      let totalPercentageSum = 0;
      const maxPossibleScore = matchingScores[0].maxScore;

      for (const s of matchingScores) {
        if (s.score > highestScore) highestScore = s.score;
        if (s.score < lowestScore) lowestScore = s.score;
        totalScoreSum += s.score;
        totalPercentageSum += calculatePercentage(s.score, s.maxScore);
      }

      scoreStatistics = {
        totalScored,
        highestScore,
        lowestScore,
        averageScore: Math.round((totalScoreSum / totalScored) * 100) / 100,
        averagePercentage:
          Math.round((totalPercentageSum / totalScored) * 100) / 100,
        maxPossibleScore,
      };
    }

    return {
      eventId,
      eventName,
      subEventId,
      subEventName,
      totalRegisteredOrAttended: eventRecords.length,
      studentAttendanceCount: studentRecords.length,
      associateAttendanceCount: associateRecords.length,
      departmentBreakdown,
      yearBreakdown,
      scoreStatistics,
    };
  }

  /**
   * Aggregates Associate duty assignments and on-site verified check-ins.
   */
  async getAssociateDutySummaries(
    query?: AssociateDutyReportQuery
  ): Promise<AssociateDutyReportSummary[]> {
    const [allocations, coordinatorRecords] = await Promise.all([
      allocationService.getAllocations(),
      attendanceService.getCoordinatorRecords(),
    ]);

    // Group allocations by associate
    const associateMap = new Map<
      string,
      {
        associateName: string;
        associateEmail: string;
        department: string;
        allocations: AssociateAllocation[];
      }
    >();

    for (const alloc of allocations) {
      const existing = associateMap.get(alloc.associateId) || {
        associateName: alloc.associateName,
        associateEmail: alloc.associateEmail,
        department: alloc.associateDepartment,
        allocations: [],
      };
      existing.allocations.push(alloc);
      associateMap.set(alloc.associateId, existing);
    }

    const summaries: AssociateDutyReportSummary[] = [];
    const searchLower = query?.search?.trim().toLowerCase();

    for (const [assocId, data] of associateMap) {
      // Apply filters if provided
      if (query?.associateId && assocId !== query.associateId) {
        continue;
      }

      if (
        query?.department &&
        query.department !== "all" &&
        data.department.trim().toLowerCase() !==
          query.department.trim().toLowerCase()
      ) {
        continue;
      }

      if (searchLower) {
        const nameMatch = data.associateName.toLowerCase().includes(searchLower);
        const emailMatch = data.associateEmail.toLowerCase().includes(searchLower);
        const idMatch = assocId.toLowerCase().includes(searchLower);

        if (!nameMatch && !emailMatch && !idMatch) {
          continue;
        }
      }

      // Count verified check-ins by matching associateUserId or associateName
      const verifiedCount = coordinatorRecords.filter(
        (r) =>
          r.associateUserId === assocId ||
          r.associateName?.toLowerCase() === data.associateName.toLowerCase()
      ).length;

      const activeAllocations = data.allocations.filter(
        (a) => a.status === "active"
      ).length;

      const completedAllocations = data.allocations.filter(
        (a) => a.status === "completed"
      ).length;

      const allocatedEvents = data.allocations.map((a) => ({
        eventId: a.eventId,
        eventName: a.eventName,
        subEventName: a.subEventName,
        status: a.status,
        attendanceAccess: a.attendanceAccess,
      }));

      summaries.push({
        associateId: assocId,
        associateName: data.associateName,
        associateEmail: data.associateEmail,
        department: data.department,
        totalAllocations: data.allocations.length,
        activeAllocations,
        completedAllocations,
        verifiedAttendances: verifiedCount,
        allocatedEvents,
      });
    }

    return summaries.sort((a, b) => b.totalAllocations - a.totalAllocations);
  }
}

export const reportService = new ReportService();

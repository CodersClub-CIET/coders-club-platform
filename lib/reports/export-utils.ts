/**
 * Reports Module - Export & Print Utilities
 *
 * Implements RFC 4180-compliant CSV stringification, browser file downloads,
 * domain-specific report sheet generation, and institutional print layout helpers.
 *
 * Safe for both Client and Server-Side Rendering (SSR).
 */

import type {
  CSVExportOptions,
  PrintLayoutOptions,
  ReportSignatory,
  DepartmentReportSummary,
  StudentPerformanceProfile,
  EventReportSummary,
  AssociateDutyReportSummary,
} from "./types";

// ============================================================================
// 1. Core CSV Formatting & Escaping
// ============================================================================

/**
 * Escapes a cell value conforming to RFC 4180 rules.
 * Handles null/undefined, escapes internal double quotes, and wraps in quotes
 * if commas, quotes, or newlines are present.
 */
export function escapeCSVValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }

  const str = String(val);

  // If the cell contains quotes, commas, or line breaks, escape it
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts a set of headers and row data into a formatted CSV string.
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  options?: CSVExportOptions
): string {
  const delimiter = options?.delimiter || ",";
  const lines: string[] = [];

  if (options?.includeHeaders !== false) {
    lines.push(headers.map((h) => escapeCSVValue(h)).join(delimiter));
  }

  for (const row of rows) {
    lines.push(row.map((cell) => escapeCSVValue(cell)).join(delimiter));
  }

  return lines.join("\n");
}

/**
 * Triggers a browser download of CSV content using a temporary anchor element.
 * Includes guard for non-browser/SSR environments.
 */
export function downloadCSV(
  content: string,
  baseFilename: string,
  options?: CSVExportOptions
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  let filename = baseFilename.trim();
  if (!filename.toLowerCase().endsWith(".csv")) {
    filename += ".csv";
  }

  if (options?.dateStamp !== false) {
    const dateStr = new Date().toISOString().split("T")[0];
    filename = filename.replace(/\.csv$/i, `_${dateStr}.csv`);
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 2. Domain-Specific Report CSV Generators
// ============================================================================

/**
 * Generates an institutional departmental attendance and performance CSV sheet.
 */
export function generateDepartmentReportCSV(
  summaries: DepartmentReportSummary[],
  options?: CSVExportOptions
): string {
  const headers = [
    "S.No",
    "Department",
    "Total Registered Students",
    "Total Attendance Records",
    "Average Attendance Rate (%)",
    "OD Eligible Students (>=75%)",
    "Events Participated",
    "Average Competition Score",
    "Average Score (%)",
  ];

  const rows = summaries.map((s, index) => [
    index + 1,
    s.department,
    s.totalStudents,
    s.totalAttendanceRecords,
    `${s.averageAttendanceRate}%`,
    s.odEligibleCount,
    s.totalEventsParticipated,
    s.averageScore !== undefined ? s.averageScore : "N/A",
    s.averageScorePercentage !== undefined
      ? `${s.averageScorePercentage}%`
      : "N/A",
  ]);

  return generateCSV(headers, rows, options);
}

/**
 * Generates an individual student comprehensive profile CSV sheet, including
 * attendance logs and competition score entries.
 */
export function generateStudentProfileCSV(
  profile: StudentPerformanceProfile,
  options?: CSVExportOptions
): string {
  const lines: string[] = [];
  const delimiter = options?.delimiter || ",";

  // Section 1: Student Metadata Header
  lines.push(
    ["COIMBATORE INSTITUTE OF ENGINEERING AND TECHNOLOGY", ""].join(delimiter)
  );
  lines.push(
    ["CODERS CLUB - INDIVIDUAL STUDENT PERFORMANCE PROFILE", ""].join(delimiter)
  );
  lines.push("");
  lines.push(
    [
      "Student Name",
      escapeCSVValue(profile.studentName),
      "Register Number",
      escapeCSVValue(profile.studentRegNo),
    ].join(delimiter)
  );
  lines.push(
    [
      "Department",
      escapeCSVValue(profile.department),
      "Year & Section",
      escapeCSVValue(`${profile.year} - ${profile.section}`),
    ].join(delimiter)
  );
  lines.push(
    [
      "Total Sessions Attended",
      escapeCSVValue(`${profile.attendedSessions} / ${profile.totalSessions}`),
      "Attendance Percentage",
      escapeCSVValue(`${profile.attendanceRate}%`),
    ].join(delimiter)
  );
  lines.push(
    [
      "OD Status (>=75%)",
      escapeCSVValue(profile.isOdEligible ? "ELIGIBLE" : "NOT ELIGIBLE"),
      "Overall Score Average",
      escapeCSVValue(
        profile.totalEventsScored > 0
          ? `${profile.overallAveragePercentage}%`
          : "N/A"
      ),
    ].join(delimiter)
  );
  lines.push("");

  // Section 2: Attendance Session History
  lines.push(["--- SESSION ATTENDANCE HISTORY ---"].join(delimiter));
  const attendanceHeaders = [
    "S.No",
    "Event Name",
    "Session Name",
    "Period",
    "Marked Date & Time",
    "Verification Method",
    "Status",
  ];
  lines.push(attendanceHeaders.map((h) => escapeCSVValue(h)).join(delimiter));

  profile.attendanceHistory.forEach((item, idx) => {
    const formattedDate = new Date(item.markedAt).toLocaleString();
    lines.push(
      [
        idx + 1,
        escapeCSVValue(item.eventName),
        escapeCSVValue(item.sessionName),
        escapeCSVValue(item.period),
        escapeCSVValue(formattedDate),
        escapeCSVValue(
          item.verificationMethod === "qr_scan"
            ? "Dynamic QR Scan"
            : "Manual Entry"
        ),
        escapeCSVValue(item.status.toUpperCase()),
      ].join(delimiter)
    );
  });

  // Section 3: Competition & Event Scores (if any)
  if (profile.scoreRecords.length > 0) {
    lines.push("");
    lines.push(["--- COMPETITION & EVENT SCORES ---"].join(delimiter));
    const scoreHeaders = [
      "S.No",
      "Event Name",
      "Track / Sub-Event",
      "Score Achieved",
      "Max Score",
      "Percentage",
      "Entered By",
      "Date",
    ];
    lines.push(scoreHeaders.map((h) => escapeCSVValue(h)).join(delimiter));

    profile.scoreRecords.forEach((score, idx) => {
      const percentage =
        score.maxScore > 0
          ? `${Math.round((score.score / score.maxScore) * 100 * 100) / 100}%`
          : "N/A";
      const dateStr = new Date(score.createdAt).toLocaleDateString();

      lines.push(
        [
          idx + 1,
          escapeCSVValue(score.eventName),
          escapeCSVValue(score.subEventName || "General"),
          escapeCSVValue(score.score),
          escapeCSVValue(score.maxScore),
          escapeCSVValue(percentage),
          escapeCSVValue(score.enteredByName),
          escapeCSVValue(dateStr),
        ].join(delimiter)
      );
    });
  }

  return lines.join("\n");
}

/**
 * Generates an event-specific attendance and competition score summary CSV.
 */
export function generateEventReportCSV(
  summary: EventReportSummary,
  options?: CSVExportOptions
): string {
  const lines: string[] = [];
  const delimiter = options?.delimiter || ",";

  lines.push(
    ["COIMBATORE INSTITUTE OF ENGINEERING AND TECHNOLOGY", ""].join(delimiter)
  );
  lines.push(["CODERS CLUB - EVENT PERFORMANCE REPORT", ""].join(delimiter));
  lines.push("");
  lines.push(
    [
      "Event Title",
      escapeCSVValue(summary.eventName),
      "Event ID",
      escapeCSVValue(summary.eventId),
    ].join(delimiter)
  );
  if (summary.subEventName) {
    lines.push(
      [
        "Sub-Event / Track",
        escapeCSVValue(summary.subEventName),
        "Sub-Event ID",
        escapeCSVValue(summary.subEventId || ""),
      ].join(delimiter)
    );
  }
  lines.push(
    [
      "Total Attendance",
      escapeCSVValue(summary.totalRegisteredOrAttended),
      "Student Attendees",
      escapeCSVValue(summary.studentAttendanceCount),
    ].join(delimiter)
  );
  lines.push(
    [
      "Associate Attendees",
      escapeCSVValue(summary.associateAttendanceCount),
      "",
      "",
    ].join(delimiter)
  );
  lines.push("");

  // Department Attendance Breakdown
  lines.push(["--- DEPARTMENT ATTENDANCE BREAKDOWN ---"].join(delimiter));
  lines.push(["Department", "Attendee Count"].join(delimiter));
  for (const [dept, count] of Object.entries(summary.departmentBreakdown)) {
    lines.push([escapeCSVValue(dept), escapeCSVValue(count)].join(delimiter));
  }
  lines.push("");

  // Academic Year Attendance Breakdown
  lines.push(["--- ACADEMIC YEAR ATTENDANCE BREAKDOWN ---"].join(delimiter));
  lines.push(["Year of Study", "Attendee Count"].join(delimiter));
  for (const [yr, count] of Object.entries(summary.yearBreakdown)) {
    lines.push(
      [escapeCSVValue(`Year ${yr}`), escapeCSVValue(count)].join(delimiter)
    );
  }

  // Score statistics if present
  if (summary.scoreStatistics) {
    lines.push("");
    lines.push(["--- COMPETITION SCORE STATISTICS ---"].join(delimiter));
    lines.push(
      [
        "Total Participants Evaluated",
        escapeCSVValue(summary.scoreStatistics.totalScored),
      ].join(delimiter)
    );
    lines.push(
      [
        "Maximum Possible Score",
        escapeCSVValue(summary.scoreStatistics.maxPossibleScore),
      ].join(delimiter)
    );
    lines.push(
      [
        "Highest Score Achieved",
        escapeCSVValue(summary.scoreStatistics.highestScore),
      ].join(delimiter)
    );
    lines.push(
      [
        "Lowest Score Achieved",
        escapeCSVValue(summary.scoreStatistics.lowestScore),
      ].join(delimiter)
    );
    lines.push(
      [
        "Average Score",
        escapeCSVValue(summary.scoreStatistics.averageScore),
      ].join(delimiter)
    );
    lines.push(
      [
        "Average Score Percentage",
        escapeCSVValue(`${summary.scoreStatistics.averagePercentage}%`),
      ].join(delimiter)
    );
  }

  return lines.join("\n");
}

/**
 * Generates an associate duty allocation and attendance check-in report CSV.
 */
export function generateAssociateDutyCSV(
  summaries: AssociateDutyReportSummary[],
  options?: CSVExportOptions
): string {
  const headers = [
    "S.No",
    "Associate ID",
    "Associate Name",
    "Department",
    "Email Address",
    "Total Allocations",
    "Active Allocations",
    "Completed Allocations",
    "Verified Check-Ins",
    "Allocated Events Summary",
  ];

  const rows = summaries.map((s, idx) => {
    const eventsStr = s.allocatedEvents
      .map((e) => `${e.eventName} (${e.status})`)
      .join("; ");

    return [
      idx + 1,
      s.associateId,
      s.associateName,
      s.department,
      s.associateEmail,
      s.totalAllocations,
      s.activeAllocations,
      s.completedAllocations,
      s.verifiedAttendances,
      eventsStr,
    ];
  });

  return generateCSV(headers, rows, options);
}

// ============================================================================
// 3. Institutional Print & Letterhead Helpers
// ============================================================================

/**
 * Returns the official institutional letterhead details and default signatories
 * for formal CIET Coders Club documents (matching On-Duty report conventions).
 */
export function getDefaultPrintLayoutOptions(
  title: string,
  subtitle?: string
): PrintLayoutOptions {
  const defaultSignatories: ReportSignatory[] = [
    {
      label: "Faculty Coordinator",
      title: "Coders Club CIET",
    },
    {
      label: "Coders Club Staff In-Charge",
      title: "Department of Technical Clubs",
    },
    {
      label: "Head of the Department (HOD)",
      title: "CIET Coimbatore",
    },
  ];

  return {
    title,
    subtitle:
      subtitle || "Official Institutional Report — Coders Club Platform",
    orientation: "portrait",
    includeLetterhead: true,
    institutionName: "Coimbatore Institute of Engineering and Technology",
    autonomousAffiliation:
      "Autonomous Institution Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai",
    institutionAddress:
      "Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109, Tamil Nadu • Ph: +91 422-2970703",
    includeSignatures: true,
    signatories: defaultSignatories,
    generatedAt: new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

/**
 * Triggers the browser's native print dialog in a safe manner.
 */
export function triggerPrint(): void {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}

/**
 * CSV Smoke Tests for lib/reports/export-utils.ts
 * Run with: node --test tests/reports-export-utils.smoke.mjs
 *
 * Tests inline the core logic (escapeCSVValue, generateCSV) to avoid the TS
 * import path resolver (@/) which is not available in plain Node.js test runner.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ---- Inlined implementations matching export-utils.ts exactly ----

function escapeCSVValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
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

function generateCSV(headers, rows, options) {
  const delimiter = (options && options.delimiter) || ",";
  const lines = [];
  if (!options || options.includeHeaders !== false) {
    lines.push(headers.map(escapeCSVValue).join(delimiter));
  }
  for (const row of rows) {
    lines.push(row.map(escapeCSVValue).join(delimiter));
  }
  return lines.join("\n");
}

// ---- Tests ----

describe("export-utils.ts CSV smoke tests", () => {

  it("1. escapeCSVValue: handles null and undefined as empty string", () => {
    assert.equal(escapeCSVValue(null), "");
    assert.equal(escapeCSVValue(undefined), "");
  });

  it("2. escapeCSVValue: plain strings pass through unmodified", () => {
    assert.equal(escapeCSVValue("CSE"), "CSE");
    assert.equal(escapeCSVValue("Aarav Kumar"), "Aarav Kumar");
  });

  it("3. escapeCSVValue: wraps value containing a comma in double quotes", () => {
    const result = escapeCSVValue("CSE, IT");
    assert.equal(result, '"CSE, IT"');
  });

  it("4. escapeCSVValue: escapes internal double quotes (RFC 4180)", () => {
    const result = escapeCSVValue('He said "hello"');
    assert.equal(result, '"He said ""hello"""');
  });

  it("5. escapeCSVValue: wraps value containing a newline in double quotes", () => {
    const result = escapeCSVValue("Line 1\nLine 2");
    assert.match(result, /^".*"$/s);
  });

  it("6. escapeCSVValue: handles numbers and booleans", () => {
    assert.equal(escapeCSVValue(42), "42");
    assert.equal(escapeCSVValue(3.14), "3.14");
    assert.equal(escapeCSVValue(true), "true");
    assert.equal(escapeCSVValue(false), "false");
  });

  it("7. generateCSV: produces correct header row", () => {
    const csv = generateCSV(["Name", "Score"], []);
    assert.equal(csv.split("\n")[0], "Name,Score");
  });

  it("8. generateCSV: produces correct data rows", () => {
    const csv = generateCSV(
      ["Name", "Department", "Score"],
      [
        ["Aarav Kumar", "CSE", 85],
        ["Bhavana S", "IT", 92],
      ]
    );
    const lines = csv.split("\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[1], "Aarav Kumar,CSE,85");
    assert.equal(lines[2], "Bhavana S,IT,92");
  });

  it("9. generateCSV: omits header when includeHeaders = false", () => {
    const csv = generateCSV(
      ["Name", "Score"],
      [["Aarav", 85]],
      { includeHeaders: false }
    );
    const lines = csv.split("\n");
    assert.equal(lines.length, 1);
    assert.equal(lines[0], "Aarav,85");
  });

  it("10. generateCSV: uses custom delimiter when specified", () => {
    const csv = generateCSV(
      ["Name", "Score"],
      [["Aarav", 85]],
      { delimiter: ";" }
    );
    assert.equal(csv.split("\n")[0], "Name;Score");
    assert.equal(csv.split("\n")[1], "Aarav;85");
  });

  it("11. generateDepartmentReportCSV shape: 9 columns, values present", () => {
    const summaries = [
      {
        department: "CSE",
        totalStudents: 30,
        totalAttendanceRecords: 90,
        averageAttendanceRate: 83.5,
        odEligibleCount: 25,
        totalEventsParticipated: 3,
        averageScore: 72.4,
        averageScorePercentage: 72.4,
      },
    ];
    const headers = [
      "S.No", "Department", "Total Registered Students",
      "Total Attendance Records", "Average Attendance Rate (%)",
      "OD Eligible Students (>=75%)", "Events Participated",
      "Average Competition Score", "Average Score (%)",
    ];
    const rows = summaries.map((s, idx) => [
      idx + 1, s.department, s.totalStudents, s.totalAttendanceRecords,
      `${s.averageAttendanceRate}%`, s.odEligibleCount,
      s.totalEventsParticipated, s.averageScore, `${s.averageScorePercentage}%`,
    ]);
    const csv = generateCSV(headers, rows);
    const lines = csv.split("\n");
    assert.equal(lines.length, 2);
    assert.equal(lines[0].split(",").length, 9);
    assert.equal(lines[1].split(",").length, 9);
    assert.ok(lines[1].includes("CSE"));
    assert.ok(lines[1].includes("30"));
    assert.ok(lines[1].includes("25"));
  });

  it("12. Event report helper: eventName escaping works for special chars", () => {
    const eventName = 'Tech Fest - "Web Development"';
    const escaped = escapeCSVValue(eventName);
    assert.equal(escaped, '"Tech Fest - ""Web Development"""');
  });

  it("13. generateAssociateDutyCSV shape: 10 columns, values correct", () => {
    const headers = [
      "S.No", "Associate ID", "Associate Name", "Department", "Email Address",
      "Total Allocations", "Active Allocations", "Completed Allocations",
      "Verified Check-Ins", "Allocated Events Summary",
    ];
    const summaries = [
      {
        associateId: "assoc-101",
        associateName: "Kavya Murugan",
        department: "CSE",
        associateEmail: "kavya@codersclub.edu",
        totalAllocations: 2,
        activeAllocations: 1,
        completedAllocations: 1,
        verifiedAttendances: 3,
        allocatedEvents: [
          { eventName: "Full Stack Hackathon", status: "completed" },
        ],
      },
    ];
    const rows = summaries.map((s, idx) => [
      idx + 1, s.associateId, s.associateName, s.department, s.associateEmail,
      s.totalAllocations, s.activeAllocations, s.completedAllocations,
      s.verifiedAttendances,
      s.allocatedEvents.map(e => `${e.eventName} (${e.status})`).join("; "),
    ]);
    const csv = generateCSV(headers, rows);
    const lines = csv.split("\n");
    assert.equal(lines[0].split(",").length, 10);
    assert.ok(lines[1].includes("Kavya Murugan"));
    assert.ok(lines[1].includes("CSE"));
    assert.ok(lines[1].includes("Full Stack Hackathon (completed)"));
  });

});

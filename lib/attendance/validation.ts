import {
  AssociateAttendanceSubmission,
  AttendanceRecord,
  AttendanceValidationResult,
  CreateSessionInput,
  StudentAttendanceSubmission,
} from "./types";

/**
 * Validates registration number format (CIET 12-digit format or alphanumeric fallback).
 */
export function validateRegistrationNumber(regNo: string): boolean {
  if (!regNo) return false;
  const trimmed = regNo.trim();
  // Standard Anna University / CIET 12-digit format: e.g. 917621104001 or min 8 chars
  return /^\d{8,12}$/.test(trimmed) || /^[A-Z0-9]{8,15}$/i.test(trimmed);
}

/**
 * Validates input for creating a new attendance session.
 */
export function validateCreateSessionInput(
  input: CreateSessionInput
): AttendanceValidationResult {
  const errors: string[] = [];

  if (!input.eventId || input.eventId.trim() === "") {
    errors.push("Event selection is required.");
  }

  if (!input.sessionName || input.sessionName.trim().length < 3) {
    errors.push("Session name must be at least 3 characters long.");
  }

  if (input.period !== "morning" && input.period !== "afternoon") {
    errors.push("Attendance period must be either 'morning' or 'afternoon'.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates student submission form fields on the client before calling the backend handshake.
 */
export function validateStudentSubmission(
  submission: StudentAttendanceSubmission
): AttendanceValidationResult {
  const errors: string[] = [];

  if (!submission.challengeToken || submission.challengeToken.trim() === "") {
    errors.push("Missing security challenge token. Please re-scan the QR code.");
  }

  if (!validateRegistrationNumber(submission.studentRegNo)) {
    errors.push("Please enter a valid Registration Number (8-12 digits).");
  }

  if (!submission.studentName || submission.studentName.trim().length < 2) {
    errors.push("Please enter your full name.");
  }

  if (!submission.department || submission.department.trim() === "") {
    errors.push("Please select your department.");
  }

  if (!submission.year || submission.year < 1 || submission.year > 4) {
    errors.push("Year must be between 1 and 4.");
  }

  if (!submission.section || submission.section.trim() === "") {
    errors.push("Section is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates associate submission form fields on the client.
 */
export function validateAssociateSubmission(
  submission: AssociateAttendanceSubmission
): AttendanceValidationResult {
  const errors: string[] = [];

  if (!submission.challengeToken || submission.challengeToken.trim() === "") {
    errors.push("Missing security challenge token. Please re-scan the QR code.");
  }

  if (!submission.associateUserId || submission.associateUserId.trim().length < 3) {
    errors.push("Please enter a valid Associate ID or Registration Number (at least 3 characters).");
  }

  if (!submission.associateName || submission.associateName.trim().length < 2) {
    errors.push("Please enter your full name.");
  }

  if (!submission.department || submission.department.trim() === "") {
    errors.push("Please select your department.");
  }

  if (!submission.role || submission.role.trim() === "") {
    errors.push("Please select your club role.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if a student or associate has already recorded attendance in the given session records.
 * Provides client-side instant detection, while the server enforces the definitive DB unique constraint.
 */
export function checkDuplicateAttendance(
  records: AttendanceRecord[],
  identifier: { studentRegNo?: string; associateUserId?: string }
): boolean {
  if (identifier.studentRegNo) {
    const targetReg = identifier.studentRegNo.trim().toLowerCase();
    return records.some(
      (r) =>
        r.studentRegNo?.trim().toLowerCase() === targetReg &&
        r.attendeeType === "student"
    );
  }

  if (identifier.associateUserId) {
    const targetAssoc = identifier.associateUserId.trim().toLowerCase();
    return records.some(
      (r) =>
        r.associateUserId?.trim().toLowerCase() === targetAssoc &&
        r.attendeeType === "associate"
    );
  }

  return false;
}


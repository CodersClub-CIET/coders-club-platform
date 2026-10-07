import type {
  CreateStudentInput,
  UpdateStudentInput,
  AcademicYearLevel,
} from "./types";

export interface ValidationResult {
  valid: boolean;
  message: string;
}

const VALID_YEARS: AcademicYearLevel[] = ["I", "II", "III", "IV"];

export function validateRegistrationNumber(regNo: string): string {
  if (!regNo || !regNo.trim()) {
    return "Registration number is required.";
  }
  const trimmed = regNo.trim();
  if (!/^[a-zA-Z0-9]{5,20}$/.test(trimmed)) {
    return "Registration number must be 5-20 alphanumeric characters.";
  }
  return "";
}

export function validateCreateStudentInput(
  input: CreateStudentInput
): ValidationResult {
  const regError = validateRegistrationNumber(input.registrationNumber);
  if (regError) return { valid: false, message: regError };

  if (!input.name || !input.name.trim()) {
    return { valid: false, message: "Student name is required." };
  }

  if (!input.department || !input.department.trim()) {
    return { valid: false, message: "Department is required." };
  }

  if (!input.year || !VALID_YEARS.includes(input.year)) {
    return { valid: false, message: "Valid year level (I, II, III, IV) is required." };
  }

  if (!input.section || !input.section.trim()) {
    return { valid: false, message: "Class/Section is required." };
  }

  if (!input.academicYear || !input.academicYear.trim()) {
    return { valid: false, message: "Academic year (e.g., 2025-2026) is required." };
  }

  if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
    return { valid: false, message: "Invalid contact email address." };
  }

  return { valid: true, message: "" };
}

export function validateUpdateStudentInput(
  input: UpdateStudentInput
): ValidationResult {
  if (input.name !== undefined && !input.name.trim()) {
    return { valid: false, message: "Student name cannot be empty." };
  }

  if (input.department !== undefined && !input.department.trim()) {
    return { valid: false, message: "Department cannot be empty." };
  }

  if (input.year !== undefined && !VALID_YEARS.includes(input.year)) {
    return { valid: false, message: "Invalid year level specified." };
  }

  if (input.section !== undefined && !input.section.trim()) {
    return { valid: false, message: "Class/Section cannot be empty." };
  }

  if (
    input.contactEmail !== undefined &&
    input.contactEmail.trim() !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)
  ) {
    return { valid: false, message: "Invalid contact email address." };
  }

  return { valid: true, message: "" };
}
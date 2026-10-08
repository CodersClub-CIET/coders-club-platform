/**
 * Student Management Module - Data Contracts & Types
 *
 * Single source of truth for student entity, inputs, and query filters.
 */

export type AcademicYearLevel = "I" | "II" | "III" | "IV";

export interface Student {
  id: string;
  registrationNumber: string;
  name: string;
  department: string;
  year: AcademicYearLevel;
  section: string;
  contactEmail?: string;
  contactPhone?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  attendanceRate?: number;
  eventPerformanceScore?: number;
  githubScore?: number;
  linkedinScore?: number;
  overallScore?: number;
  isArchived: boolean;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  registrationNumber: string;
  name: string;
  department: string;
  year: AcademicYearLevel;
  section: string;
  contactEmail?: string;
  contactPhone?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  academicYear: string;
}

export interface UpdateStudentInput {
  name?: string;
  department?: string;
  year?: AcademicYearLevel;
  section?: string;
  contactEmail?: string;
  contactPhone?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  academicYear?: string;
  isArchived?: boolean;
}

export interface StudentFilter {
  search?: string;
  department?: string;
  year?: AcademicYearLevel;
  section?: string;
  academicYear?: string;
  isArchived?: boolean;
}

export interface StudentListResponse {
  students: Student[];
  total: number;
}
import { createClient } from "@/lib/supabase/client";
import type {
  Student,
  AcademicYearLevel,
  StudentFilter,
  StudentListResponse,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapYearToLevel(year: number | null | undefined): AcademicYearLevel {
  switch (year) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    default:
      return "I";
  }
}

function mapRowToStudent(row: Record<string, any>): Student {
  const enrollment = Array.isArray(row.student_enrollments)
    ? row.student_enrollments.find((e: any) => e.is_current) ?? row.student_enrollments[0]
    : row.student_enrollments;

  const section = Array.isArray(enrollment?.class_sections)
    ? enrollment.class_sections[0]
    : enrollment?.class_sections;

  const program = Array.isArray(section?.programs)
    ? section.programs[0]
    : section?.programs;

  const academicYear = Array.isArray(section?.academic_years)
    ? section.academic_years[0]?.name
    : section?.academic_years?.name;

  return {
    id: row.id,
    registrationNumber: row.register_number,
    name: row.name,
    department: program?.code ?? program?.name ?? "",
    year: mapYearToLevel(section?.year_of_study),
    section: section?.section ?? "",
    contactEmail: row.email ?? undefined,
    contactPhone: row.phone ?? undefined,
    isArchived: !row.is_active,
    academicYear: academicYear ?? "",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export const studentService = {
  async getStudents(filters?: StudentFilter): Promise<StudentListResponse> {
    const supabase = createClient();

    let query = supabase
      .from("students")
      .select(
        `
        id,
        name,
        register_number,
        email,
        phone,
        is_active,
        created_at,
        updated_at,
        student_enrollments!inner (
          is_current,
          class_sections!inner (
            year_of_study,
            section,
            academic_years!inner (name),
            programs!inner (code, name)
          )
        )
      `,
        { count: "exact" }
      )
      .eq("student_enrollments.is_current", true);

    if (filters?.isArchived !== undefined) {
      query = query.eq("is_active", !filters.isArchived);
    } else {
      query = query.eq("is_active", true);
    }

    if (filters?.search?.trim()) {
      const safe = filters.search.trim().replace(/,/g, " ").replace(/%/g, "").replace(/_/g, "");
      query = query.or(`name.ilike.%${safe}%,register_number.ilike.%${safe}%`);
    }

    if (filters?.department) {
      query = query.eq("student_enrollments.class_sections.programs.code", filters.department);
    }

    if (filters?.section) {
      query = query.eq("student_enrollments.class_sections.section", filters.section);
    }

    if (filters?.academicYear) {
      query = query.eq("student_enrollments.class_sections.academic_years.name", filters.academicYear);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Supabase students query failed:", error.message);
      return { students: [], total: 0 };
    }

    const students = (data ?? []).map(mapRowToStudent);
    return { students, total: count ?? students.length };
  },

  async getStudentById(id: string): Promise<Student | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        name,
        register_number,
        email,
        phone,
        is_active,
        created_at,
        updated_at,
        student_enrollments (
          is_current,
          class_sections (
            year_of_study,
            section,
            academic_years (name),
            programs (code, name)
          )
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToStudent(data);
  },

  async getStudentByRegNo(regNo: string): Promise<Student | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        name,
        register_number,
        email,
        phone,
        is_active,
        created_at,
        updated_at,
        student_enrollments (
          is_current,
          class_sections (
            year_of_study,
            section,
            academic_years (name),
            programs (code, name)
          )
        )
      `
      )
      .ilike("register_number", regNo.trim())
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToStudent(data);
  },
};
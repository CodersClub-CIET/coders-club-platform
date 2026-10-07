import { apiClient } from "@/lib/api/client";
import type {
  Student,
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilter,
  StudentListResponse,
} from "./types";
import { validateCreateStudentInput, validateUpdateStudentInput } from "./validation";

export const studentService = {
  async getStudents(filters?: StudentFilter): Promise<StudentListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.department) params.append("department", filters.department);
    if (filters?.year) params.append("year", filters.year);
    if (filters?.section) params.append("section", filters.section);
    if (filters?.academicYear) params.append("academic_year", filters.academicYear);
    if (filters?.isArchived !== undefined) {
      params.append("is_archived", String(filters.isArchived));
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient<StudentListResponse>(`/students/${query}`);
  },

  async getStudentById(id: string): Promise<Student> {
    return apiClient<Student>(`/students/${id}/`);
  },

  async getStudentByRegNo(regNo: string): Promise<Student> {
    return apiClient<Student>(`/students/by-reg/${encodeURIComponent(regNo)}/`);
  },

  async createStudent(input: CreateStudentInput): Promise<Student> {
    const validation = validateCreateStudentInput(input);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    return apiClient<Student>("/students/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateStudent(id: string, input: UpdateStudentInput): Promise<Student> {
    const validation = validateUpdateStudentInput(input);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    return apiClient<Student>(`/students/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async archiveStudent(id: string): Promise<Student> {
    return apiClient<Student>(`/students/${id}/archive/`, {
      method: "POST",
    });
  },

  async deleteStudent(id: string): Promise<void> {
    return apiClient<void>(`/students/${id}/`, {
      method: "DELETE",
    });
  },
};
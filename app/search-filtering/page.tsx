"use client";

import { useEffect, useState } from "react";
import { Users, GraduationCap } from "lucide-react";
import SearchBar from "@/components/search-filtering/SearchBar";
import FilterPanel from "@/components/search-filtering/FilterPanel";
import ResultsTable, { Student } from "@/components/search-filtering/ResultsTable";
import Pagination from "@/components/search-filtering/Pagination";
import { createClient } from "@/lib/supabase/client";
import { ManagementGuard } from "@/components/auth/management-guard";
import { PageHeader } from "@/components/ui/cyberpunk";

const ITEMS_PER_PAGE = 20;

type StudentEnrollment = {
  is_current: boolean;
  class_sections: Array<{
    year_of_study: number;
    section: string;
    academic_years: Array<{ name: string }>;
    programs: Array<{ code: string; name: string }>;
  }>;
};

type SupabaseStudent = {
  id: string;
  name: string;
  register_number: string;
  student_enrollments: StudentEnrollment[];
};

type AcademicYear = { name: string };
type Program = { code: string; name: string };
type ClassSection = { section: string };

export default function StudentDirectory() {
  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");

  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState("");

  // Load filter options from Supabase
  useEffect(() => {
    async function loadFilterOptions() {
      setLoadingFilters(true);
      const supabase = createClient();

      const [academicYearResult, programResult, sectionResult] = await Promise.all([
        supabase.from("academic_years").select("name").order("name", { ascending: false }),
        supabase.from("programs").select("code, name").eq("is_active", true).order("code", { ascending: true }),
        supabase.from("class_sections").select("section").eq("is_active", true).order("section", { ascending: true }),
      ]);

      if (academicYearResult.error) console.error("Academic year filter error:", academicYearResult.error);
      if (programResult.error) console.error("Program filter error:", programResult.error);
      if (sectionResult.error) console.error("Section filter error:", sectionResult.error);

      const academicYearData = (academicYearResult.data ?? []) as AcademicYear[];
      const programData = (programResult.data ?? []) as Program[];
      const sectionData = (sectionResult.data ?? []) as ClassSection[];

      setAcademicYears(Array.from(new Set(academicYearData.map((item) => item.name).filter(Boolean))));
      setClasses(Array.from(new Set(programData.map((item) => item.code).filter(Boolean))));
      setSections(Array.from(new Set(sectionData.map((item) => item.section).filter(Boolean))));
      setLoadingFilters(false);
    }

    void loadFilterOptions();
  }, []);

  // Load students based on search and filters
  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      setError("");
      const supabase = createClient();

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("students")
        .select(
          `id, name, register_number,
          student_enrollments!inner (
            is_current,
            class_sections!inner (
              year_of_study, section,
              academic_years!inner (name),
              programs!inner (code, name)
            )
          )`,
          { count: "exact" }
        )
        .eq("is_active", true)
        .eq("student_enrollments.is_current", true);

      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        const safeSearch = trimmedSearch.replace(/,/g, " ").replace(/%/g, "").replace(/_/g, "");
        query = query.or(`name.ilike.%${safeSearch}%,register_number.ilike.%${safeSearch}%`);
      }

      if (academicYear) {
        query = query.eq("student_enrollments.class_sections.academic_years.name", academicYear);
      }
      if (section) {
        query = query.eq("student_enrollments.class_sections.section", section);
      }
      if (className) {
        query = query.eq("student_enrollments.class_sections.programs.code", className);
      }

      const { data, error: queryError, count } = await query.range(from, to);

      if (queryError) {
        console.error(queryError);
        setError("Unable to load student records.");
        setStudents([]);
        setTotalStudents(0);
        setLoading(false);
        return;
      }

      const mappedStudents: Student[] = ((data ?? []) as SupabaseStudent[]).map((student) => {
        const enrollment = student.student_enrollments[0];
        const classSection = enrollment?.class_sections?.[0];
        return {
          id: student.id,
          name: student.name,
          registerNumber: student.register_number,
          className: classSection?.programs?.[0]?.code ?? "",
          section: classSection?.section ?? "",
          academicYear: classSection?.academic_years?.[0]?.name ?? "",
        };
      });

      setStudents(mappedStudents);
      setTotalStudents(count ?? 0);
      setLoading(false);
    }

    void loadStudents();
  }, [search, academicYear, className, section, currentPage]);

  const totalPages = Math.ceil(totalStudents / ITEMS_PER_PAGE);

  function handleSearchChange(value: string) { setSearch(value); setCurrentPage(1); }
  function handleAcademicYearChange(value: string) { setAcademicYear(value); setCurrentPage(1); }
  function handleClassChange(value: string) { setClassName(value); setCurrentPage(1); }
  function handleSectionChange(value: string) { setSection(value); setCurrentPage(1); }
  function handleClearFilters() { setSearch(""); setAcademicYear(""); setClassName(""); setSection(""); setCurrentPage(1); }

  return (
    <ManagementGuard>
      <div className="space-y-6">
        {/* Editorial Page header */}
        <PageHeader
          moduleCode="STUDENTS // 01"
          category="DIRECTORY"
          title="Student Registry"
          description="Institutional repository of student enrollments, academic years, programmes, and verified register numbers."
          icon={GraduationCap}
        />

        {/* Search bar */}
        <div className="bg-[#0D0F12] border border-[#292D33] rounded p-5">
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>

        {/* Filter panel */}
        <FilterPanel
          academicYear={academicYear}
          className={className}
          section={section}
          academicYears={academicYears}
          classes={classes}
          sections={sections}
          onAcademicYearChange={handleAcademicYearChange}
          onClassChange={handleClassChange}
          onSectionChange={handleSectionChange}
          onClear={handleClearFilters}
        />

        {/* Results header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#F3F1EC] font-display">Student Records</h2>
            <p className="mt-0.5 text-sm font-mono text-[#9B9EA6]">
              {loading || loadingFilters
                ? "Loading…"
                : `${totalStudents} ${totalStudents === 1 ? "student" : "students"} found`}
            </p>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="rounded-xl border border-[#FF2A1A]/20 bg-[#FF2A1A]/5 p-6 text-center text-sm font-mono text-[#FF2A1A]">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-[#292D33] bg-[#111318] p-12 text-center">
            <div className="flex flex-col items-center gap-3 text-[#9B9EA6]">
              <div className="size-6 border-2 border-[#FF2A1A] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-mono">Loading student records…</p>
            </div>
          </div>
        ) : (
          <>
            <ResultsTable students={students} />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>
    </ManagementGuard>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import SearchBar from "@/components/search-filtering/SearchBar";
import FilterPanel from "@/components/search-filtering/FilterPanel";
import ResultsTable, {
  Student,
} from "@/components/search-filtering/ResultsTable";
import Pagination from "@/components/search-filtering/Pagination";
import { createClient } from "@/lib/supabase/client";

const ITEMS_PER_PAGE = 3;

type StudentEnrollment = {
  is_current: boolean;
  class_sections: {
    year_of_study: number;
    section: string;
    academic_years: {
      name: string;
    };
    programs: {
      code: string;
      name: string;
    };
  };
};

type SupabaseStudent = {
  id: string;
  name: string;
  register_number: string;
  student_enrollments: StudentEnrollment[];
};

type AcademicYear = {
  name: string;
};

type Program = {
  code: string;
  name: string;
};

type ClassSection = {
  section: string;
};

export default function Home() {
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

  const supabase = createClient();

  // Load filter options from Supabase
  useEffect(() => {
    async function loadFilterOptions() {
      setLoadingFilters(true);

      const [
        academicYearResult,
        programResult,
        sectionResult,
      ] = await Promise.all([
        supabase
          .from("academic_years")
          .select("name")
          .order("name", { ascending: false }),

        supabase
          .from("programs")
          .select("code, name")
          .eq("is_active", true)
          .order("code", { ascending: true }),

        supabase
          .from("class_sections")
          .select("section")
          .eq("is_active", true)
          .order("section", { ascending: true }),
      ]);

      if (academicYearResult.error) {
        console.error(
          "Academic year filter error:",
          academicYearResult.error
        );
      }

      if (programResult.error) {
        console.error(
          "Program filter error:",
          programResult.error
        );
      }

      if (sectionResult.error) {
        console.error(
          "Section filter error:",
          sectionResult.error
        );
      }

      const academicYearData =
        (academicYearResult.data ?? []) as AcademicYear[];

      const programData =
        (programResult.data ?? []) as Program[];

      const sectionData =
        (sectionResult.data ?? []) as ClassSection[];

      setAcademicYears(
        Array.from(
          new Set(
            academicYearData
              .map((item) => item.name)
              .filter(Boolean)
          )
        )
      );

      setClasses(
        Array.from(
          new Set(
            programData
              .map((item) => item.code)
              .filter(Boolean)
          )
        )
      );

      setSections(
        Array.from(
          new Set(
            sectionData
              .map((item) => item.section)
              .filter(Boolean)
          )
        )
      );

      setLoadingFilters(false);
    }

    loadFilterOptions();
  }, []);

  // Load students based on search and filters
  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      setError("");

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("students")
        .select(
          `
          id,
          name,
          register_number,
          student_enrollments!inner (
            is_current,
            class_sections!inner (
              year_of_study,
              section,
              academic_years!inner (
                name
              ),
              programs!inner (
                code,
                name
              )
            )
          )
        `,
          { count: "exact" }
        )
        .eq("is_active", true)
        .eq("student_enrollments.is_current", true);

      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        const safeSearch = trimmedSearch
          .replace(/,/g, " ")
          .replace(/%/g, "")
          .replace(/_/g, "");

        query = query.or(
          `name.ilike.%${safeSearch}%,register_number.ilike.%${safeSearch}%`
        );
      }

      if (academicYear) {
        query = query.eq(
          "student_enrollments.class_sections.academic_years.name",
          academicYear
        );
      }

      if (section) {
        query = query.eq(
          "student_enrollments.class_sections.section",
          section
        );
      }

      if (className) {
        query = query.eq(
          "student_enrollments.class_sections.programs.code",
          className
        );
      }

      const {
        data,
        error: queryError,
        count,
      } = await query.range(from, to);

      if (queryError) {
        console.error(queryError);

        setError("Unable to load student records.");
        setStudents([]);
        setTotalStudents(0);
        setLoading(false);

        return;
      }

      const mappedStudents: Student[] = (
        (data ?? []) as SupabaseStudent[]
      ).map((student) => {
        const enrollment =
          student.student_enrollments[0];

        const classSection =
          enrollment?.class_sections;

        return {
          id: student.id,
          name: student.name,
          registerNumber: student.register_number,
          className:
            classSection?.programs?.code ?? "",
          section:
            classSection?.section ?? "",
          academicYear:
            classSection?.academic_years?.name ?? "",
        };
      });

      setStudents(mappedStudents);
      setTotalStudents(count ?? 0);
      setLoading(false);
    }

    loadStudents();
  }, [
    search,
    academicYear,
    className,
    section,
    currentPage,
  ]);

  const totalPages = Math.ceil(
    totalStudents / ITEMS_PER_PAGE
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleAcademicYearChange(value: string) {
    setAcademicYear(value);
    setCurrentPage(1);
  }

  function handleClassChange(value: string) {
    setClassName(value);
    setCurrentPage(1);
  }

  function handleSectionChange(value: string) {
    setSection(value);
    setCurrentPage(1);
  }

  function handleClearFilters() {
    setSearch("");
    setAcademicYear("");
    setClassName("");
    setSection("");
    setCurrentPage(1);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm">
              <Users size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Search & Filtering
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Find student records quickly using search and filters.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SearchBar
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <FilterPanel
            academicYear={academicYear}
            className={className}
            section={section}
            academicYears={academicYears}
            classes={classes}
            sections={sections}
            onAcademicYearChange={
              handleAcademicYearChange
            }
            onClassChange={handleClassChange}
            onSectionChange={handleSectionChange}
            onClear={handleClearFilters}
          />

          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Student Records
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading students..."
                  : `${totalStudents} ${
                      totalStudents === 1
                        ? "student"
                        : "students"
                    } found`}
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Loading student records...
              </p>
            </div>
          ) : (
            <>
              <ResultsTable students={students} />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
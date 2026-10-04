"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import SearchBar from "@/components/search-filtering/SearchBar";
import FilterPanel from "@/components/search-filtering/FilterPanel";
import ResultsTable, {
  Student,
} from "@/components/search-filtering/ResultsTable";
import Pagination from "@/components/search-filtering/Pagination";

const students: Student[] = [
  {
    id: 1,
    name: "Arun Kumar",
    registerNumber: "23CSE001",
    className: "III CSE",
    section: "A",
    academicYear: "2026",
  },
  {
    id: 2,
    name: "Dhivya",
    registerNumber: "23CSE002",
    className: "III CSE",
    section: "A",
    academicYear: "2026",
  },
  {
    id: 3,
    name: "Harini",
    registerNumber: "23CSE003",
    className: "III CSE",
    section: "B",
    academicYear: "2026",
  },
  {
    id: 4,
    name: "Karthik",
    registerNumber: "23CSE004",
    className: "II CSE",
    section: "A",
    academicYear: "2025",
  },
  {
    id: 5,
    name: "Priya",
    registerNumber: "24CSE005",
    className: "II CSE",
    section: "B",
    academicYear: "2025",
  },
];

const ITEMS_PER_PAGE = 3;

export default function Home() {
  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        student.name.toLowerCase().includes(searchValue) ||
        student.registerNumber.toLowerCase().includes(searchValue);

      const matchesAcademicYear =
        !academicYear || student.academicYear === academicYear;

      const matchesClass =
        !className || student.className === className;

      const matchesSection =
        !section || student.section === section;

      return (
        matchesSearch &&
        matchesAcademicYear &&
        matchesClass &&
        matchesSection
      );
    });
  }, [search, academicYear, className, section]);

  const totalPages = Math.ceil(
    filteredStudents.length / ITEMS_PER_PAGE
  );

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
            onAcademicYearChange={handleAcademicYearChange}
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
                {filteredStudents.length}{" "}
                {filteredStudents.length === 1
                  ? "student"
                  : "students"}{" "}
                found
              </p>
            </div>
          </div>

          <ResultsTable students={paginatedStudents} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </section>
      </div>
    </main>
  );
}

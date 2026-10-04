"use client";

import { useMemo, useState } from "react";
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
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Search & Filtering
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Search and filter student records.
          </p>
        </div>

        <div className="space-y-6">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
          />

          <FilterPanel
            academicYear={academicYear}
            className={className}
            section={section}
            onAcademicYearChange={handleAcademicYearChange}
            onClassChange={handleClassChange}
            onSectionChange={handleSectionChange}
            onClear={handleClearFilters}
          />

          <div className="text-sm text-gray-600">
            Showing {paginatedStudents.length} of{" "}
            {filteredStudents.length} students
          </div>

          <ResultsTable students={paginatedStudents} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </main>
  );
}

"use client";

import { SlidersHorizontal } from "lucide-react";

type FilterPanelProps = {
  academicYear: string;
  className: string;
  section: string;
  onAcademicYearChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onClear: () => void;
};

export default function FilterPanel({
  academicYear,
  className,
  section,
  onAcademicYearChange,
  onClassChange,
  onSectionChange,
  onClear,
}: FilterPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <SlidersHorizontal size={18} className="text-gray-600" />

        <h2 className="text-sm font-semibold text-gray-800">
          Filters
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label
            htmlFor="academic-year"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Academic Year
          </label>

          <select
            id="academic-year"
            value={academicYear}
            onChange={(event) =>
              onAcademicYearChange(event.target.value)
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="class"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Class
          </label>

          <select
            id="class"
            value={className}
            onChange={(event) => onClassChange(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
          >
            <option value="">All Classes</option>
            <option value="III CSE">III CSE</option>
            <option value="II CSE">II CSE</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="section"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Section
          </label>

          <select
            id="section"
            value={section}
            onChange={(event) => onSectionChange(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
          >
            <option value="">All Sections</option>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-lg border border-gray-200 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}
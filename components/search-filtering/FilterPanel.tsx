"use client";

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
    <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
      <div>
        <label
          htmlFor="academic-year"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Academic Year
        </label>

        <select
          id="academic-year"
          value={academicYear}
          onChange={(event) => onAcademicYearChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
        >
          <option value="">All Years</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="class"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Class
        </label>

        <select
          id="class"
          value={className}
          onChange={(event) => onClassChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
        >
          <option value="">All Classes</option>
          <option value="III CSE">III CSE</option>
          <option value="II CSE">II CSE</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="section"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Section
        </label>

        <select
          id="section"
          value={section}
          onChange={(event) => onSectionChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
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
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
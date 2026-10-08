"use client";

import { SlidersHorizontal } from "lucide-react";

type FilterPanelProps = {
  academicYear: string;
  className: string;
  section: string;

  academicYears: string[];
  classes: string[];
  sections: string[];

  onAcademicYearChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onClear: () => void;
};

export default function FilterPanel({
  academicYear,
  className,
  section,
  academicYears,
  classes,
  sections,
  onAcademicYearChange,
  onClassChange,
  onSectionChange,
  onClear,
}: FilterPanelProps) {
  return (
    <div className="rounded-xl border border-[#292D33] bg-[#111318] p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <SlidersHorizontal size={18} className="text-[#9B9EA6]" />

        <h2 className="text-sm font-bold text-[#F3F1EC] uppercase tracking-wider font-mono">
          Filters
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label
            htmlFor="academic-year"
            className="mb-2 block text-[11px] font-mono uppercase tracking-widest text-[#9B9EA6]"
          >
            Academic Year
          </label>

          <select
            id="academic-year"
            value={academicYear}
            onChange={(event) =>
              onAcademicYearChange(event.target.value)
            }
            className="w-full rounded-lg border border-[#292D33] bg-[#0D0F12] px-3 py-2.5 text-sm text-[#F3F1EC] outline-none transition focus:border-[#FF2A1A]/50"
          >
            <option value="">All Years</option>

            {academicYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="class"
            className="mb-2 block text-[11px] font-mono uppercase tracking-widest text-[#9B9EA6]"
          >
            Class
          </label>

          <select
            id="class"
            value={className}
            onChange={(event) => onClassChange(event.target.value)}
            className="w-full rounded-lg border border-[#292D33] bg-[#0D0F12] px-3 py-2.5 text-sm text-[#F3F1EC] outline-none transition focus:border-[#FF2A1A]/50"
          >
            <option value="">All Classes</option>

            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="section"
            className="mb-2 block text-[11px] font-mono uppercase tracking-widest text-[#9B9EA6]"
          >
            Section
          </label>

          <select
            id="section"
            value={section}
            onChange={(event) => onSectionChange(event.target.value)}
            className="w-full rounded-lg border border-[#292D33] bg-[#0D0F12] px-3 py-2.5 text-sm text-[#F3F1EC] outline-none transition focus:border-[#FF2A1A]/50"
          >
            <option value="">All Sections</option>

            {sections.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-lg bg-[#FF2A1A] hover:bg-[#C51D16] px-4 py-2.5 text-[11px] uppercase tracking-wider font-mono font-bold text-white transition"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}
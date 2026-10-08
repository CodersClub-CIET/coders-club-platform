"use client";

import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div>
      <label
        htmlFor="student-search"
        className="mb-2 block text-[11px] uppercase tracking-wider font-mono text-[#9B9EA6]"
      >
        Search Students
      </label>

      <div className="relative">
        <Search
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#686C74]"
        />

        <input
          id="student-search"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by name or register number..."
          className="w-full rounded-lg border border-[#292D33] bg-[#0D0F12] py-3 pl-11 pr-4 text-sm text-[#F3F1EC] shadow-sm outline-none transition placeholder:text-[#686C74] focus:border-[#FF2A1A]/50"
        />
      </div>
    </div>
  );
}
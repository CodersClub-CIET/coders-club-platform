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
        className="mb-2 block text-sm font-semibold text-gray-800"
      >
        Search Students
      </label>

      <div className="relative">
        <Search
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          id="student-search"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by name or register number..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100"
        />
      </div>
    </div>
  );
}
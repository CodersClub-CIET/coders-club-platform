"use client";

import { UserRound } from "lucide-react";

export type Student = {
  id: string;
  name: string;
  registerNumber: string;
  className: string;
  section: string;
  academicYear: string;
};

type ResultsTableProps = {
  students: Student[];
};

export default function ResultsTable({
  students,
}: ResultsTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-[#292D33] bg-[#111318] p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0D0F12] border border-[#3A3E45]">
          <UserRound size={22} className="text-[#9B9EA6]" />
        </div>

        <h2 className="mt-4 text-base font-bold text-[#F3F1EC] font-display">
          No students found
        </h2>

        <p className="mt-1 text-sm text-[#686C74] font-mono">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#292D33] bg-[#111318] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-[#292D33] bg-[#0D0F12]">
            <tr>
              <th className="px-5 py-4 text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                Student
              </th>

              <th className="px-5 py-4 text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                Register Number
              </th>

              <th className="px-5 py-4 text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                Class
              </th>

              <th className="px-5 py-4 text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                Section
              </th>

              <th className="px-5 py-4 text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                Academic Year
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#292D33]">
            {students.map((student) => (
              <tr
                key={student.id}
                className="transition hover:bg-[#1D2026]"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D0F12] border border-[#292D33] text-xs font-mono font-bold text-[#F3F1EC]">
                      {student.name
                        .split(" ")
                        .map((name) => name[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <span className="font-bold text-[#F3F1EC]">
                      {student.name}
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 font-mono text-xs text-[#9B9EA6]">
                  {student.registerNumber}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-md bg-[#0D0F12] border border-[#292D33] px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#F3F1EC]">
                    {student.className}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#0D0F12] border border-[#292D33] px-2 text-[11px] font-mono font-bold text-[#F3F1EC]">
                    {student.section}
                  </span>
                </td>

                <td className="px-5 py-4 text-[#9B9EA6] font-mono text-xs">
                  {student.academicYear}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
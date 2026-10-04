"use client";

import { UserRound } from "lucide-react";

export type Student = {
  id: number;
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
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <UserRound size={22} className="text-gray-500" />
        </div>

        <h2 className="mt-4 text-base font-semibold text-gray-800">
          No students found
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-4 font-semibold text-gray-600">
                Student
              </th>

              <th className="px-5 py-4 font-semibold text-gray-600">
                Register Number
              </th>

              <th className="px-5 py-4 font-semibold text-gray-600">
                Class
              </th>

              <th className="px-5 py-4 font-semibold text-gray-600">
                Section
              </th>

              <th className="px-5 py-4 font-semibold text-gray-600">
                Academic Year
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr
                key={student.id}
                className="transition hover:bg-gray-50"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                      {student.name
                        .split(" ")
                        .map((name) => name[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <span className="font-medium text-gray-800">
                      {student.name}
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 font-mono text-xs text-gray-600">
                  {student.registerNumber}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {student.className}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-700">
                    {student.section}
                  </span>
                </td>

                <td className="px-5 py-4 text-gray-600">
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
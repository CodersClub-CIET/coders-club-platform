"use client";

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
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          No students found
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-semibold text-gray-700">
              Name
            </th>
            <th className="px-4 py-3 font-semibold text-gray-700">
              Register Number
            </th>
            <th className="px-4 py-3 font-semibold text-gray-700">
              Class
            </th>
            <th className="px-4 py-3 font-semibold text-gray-700">
              Section
            </th>
            <th className="px-4 py-3 font-semibold text-gray-700">
              Academic Year
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">
                {student.name}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {student.registerNumber}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {student.className}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {student.section}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {student.academicYear}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
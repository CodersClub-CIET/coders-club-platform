import { formatYear } from "@/lib/team-management/validation";
import type { TeamMember } from "@/lib/team-management/types";

export function TeamMembersPanel({ members }: { members: TeamMember[] }) {
  return (
    <section
      aria-label="Team members"
      className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5"
    >
      <h3 className="text-base font-bold text-slate-900 mb-3">Team Members</h3>

      {members.length === 0 ? (
        <p className="text-sm text-slate-500">
          No members are assigned to this team.
        </p>
      ) : (
        <>
          {/* Tablet / desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th scope="col" className="py-2 pr-4 font-semibold">Member</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Reg. No.</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Department</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Year</th>
                  <th scope="col" className="py-2 font-semibold">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.studentId}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{m.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-600">{m.regNo}</td>
                    <td className="py-2 pr-4 text-slate-700">{m.department}</td>
                    <td className="py-2 pr-4 text-slate-700">{m.year === null ? "Unavailable" : formatYear(m.year)}</td>
                    <td className="py-2 text-slate-700">{m.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="md:hidden space-y-2">
            {members.map((m) => (
              <li
                key={m.studentId}
                className="rounded-xl border border-slate-200 p-3"
              >
                <p className="font-medium text-slate-900">{m.name}</p>
                <p className="font-mono text-xs text-slate-500">{m.regNo}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {m.department} &bull; Year {m.year === null ? "Unavailable" : formatYear(m.year)} &bull; Section{" "}
                  {m.section}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

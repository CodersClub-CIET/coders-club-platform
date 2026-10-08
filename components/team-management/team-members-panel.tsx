import { formatYear } from "@/lib/team-management/validation";
import type { TeamMember } from "@/lib/team-management/types";

export function TeamMembersPanel({ members }: { members: TeamMember[] }) {
  return (
    <section
      aria-label="Team members"
      className="rounded-xl border border-[#292D33] bg-[#111318] p-5"
    >
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-4">
        Team Members
      </h3>

      {members.length === 0 ? (
        <p className="text-sm text-[#686C74] font-mono py-4 text-center">
          No members are assigned to this team.
        </p>
      ) : (
        <>
          {/* Tablet / desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#292D33]">
                  <th scope="col" className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#686C74] font-semibold">Member</th>
                  <th scope="col" className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#686C74] font-semibold">Reg. No.</th>
                  <th scope="col" className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#686C74] font-semibold">Department</th>
                  <th scope="col" className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#686C74] font-semibold">Year</th>
                  <th scope="col" className="pb-2 font-mono text-[10px] uppercase tracking-wider text-[#686C74] font-semibold">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292D33]/50">
                {members.map((m) => (
                  <tr key={m.studentId} className="hover:bg-[#171A20] transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-[#F3F1EC] text-sm">{m.name}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-[#9B9EA6]">{m.regNo}</td>
                    <td className="py-2.5 pr-4 text-[#9B9EA6] text-sm">{m.department}</td>
                    <td className="py-2.5 pr-4 text-[#9B9EA6] text-sm">{m.year === null ? "N/A" : formatYear(m.year)}</td>
                    <td className="py-2.5 text-[#9B9EA6] text-sm">{m.section}</td>
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
                className="rounded-xl border border-[#292D33] bg-[#0D0F12] p-3"
              >
                <p className="font-medium text-[#F3F1EC] text-sm">{m.name}</p>
                <p className="font-mono text-xs text-[#9B9EA6] mt-0.5">{m.regNo}</p>
                <p className="mt-1.5 text-xs text-[#686C74] font-mono">
                  {m.department} &bull; Year {m.year === null ? "N/A" : formatYear(m.year)} &bull; Section{" "}
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

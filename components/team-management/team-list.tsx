"use client";

import { Search, Users } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import type { TeamSummary } from "@/lib/team-management/types";

interface TeamListProps {
  teams: TeamSummary[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (teamId: string) => void;
}

export function TeamList({
  teams,
  loading,
  error,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: TeamListProps) {
  const query = search.trim().toLowerCase();
  const visible = query
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.description ?? "").toLowerCase().includes(query)
      )
    : teams;

  return (
    <section
      aria-label="Teams"
      className="border border-[#292D33] bg-[#0D0F12] p-5 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-[#292D33] pb-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#9B9EA6]">
          TEAM ROSTER // DIRECTORY
        </h3>
        <span className="font-mono text-[10px] text-[#686C74]">
          {visible.length} TEAMS
        </span>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#686C74]"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter teams..."
          aria-label="Search teams"
          className="w-full rounded border border-[#292D33] bg-[#08090B] py-2 pl-9 pr-3 text-xs text-[#F3F1EC] placeholder:text-[#686C74] focus:outline-none focus:border-[#FF2A1A]/50 font-mono"
        />
      </div>

      {loading ? (
        <Loading label="Loading teams..." />
      ) : error ? (
        <p role="alert" className="p-4 text-xs text-[#FF2A1A] font-mono text-center">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <p className="p-4 text-xs text-[#686C74] font-mono text-center">
          No teams found.
        </p>
      ) : (
        <ul className="divide-y divide-[#292D33] max-h-[32rem] overflow-y-auto">
          {visible.map((team, idx) => {
            const selected = team.id === selectedId;
            return (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => onSelect(team.id)}
                  aria-pressed={selected}
                  className={`group relative w-full text-left py-3.5 px-3 transition-all focus:outline-none ${
                    selected
                      ? "bg-[#171A20] border-l-2 border-[#FF2A1A]"
                      : "hover:bg-[#111318] border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase text-[#686C74]">
                        TEAM {String(idx + 1).padStart(2, "0")}
                      </p>
                      <h4 className="font-display text-base font-normal text-[#F3F1EC] group-hover:text-white transition-colors">
                        {team.name}
                      </h4>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[#9B9EA6] uppercase tracking-wider">
                      {team.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-[#9B9EA6] font-mono">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#686C74]">
                      <Users aria-hidden="true" className="size-3" />
                      {team.memberCount}{" "}
                      {team.memberCount === 1 ? "Member" : "Members"}
                    </span>
                    <span className="text-[11px]">
                      SCORE:{" "}
                      <span className="font-bold text-[#F2B84B]">
                        {team.score.toLocaleString("en-IN", { maximumFractionDigits: 20 })}
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

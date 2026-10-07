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
          t.teamCode.toLowerCase().includes(query)
      )
    : teams;

  return (
    <section
      aria-label="Teams"
      className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search teams..."
          aria-label="Search teams"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <Loading label="Loading teams..." />
      ) : error ? (
        <p role="alert" className="p-4 text-sm text-red-600 text-center">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <p className="p-4 text-sm text-slate-500 text-center">
          No teams found.
        </p>
      ) : (
        <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
          {visible.map((team) => {
            const selected = team.id === selectedId;
            return (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => onSelect(team.id)}
                  aria-pressed={selected}
                  className={`w-full text-left rounded-xl border p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    selected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 break-words">
                      {team.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-500">
                      {team.teamCode}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Users aria-hidden="true" className="size-3.5" />
                      {team.memberCount}{" "}
                      {team.memberCount === 1 ? "Member" : "Members"}
                    </span>
                    <span>
                      Score:{" "}
                      <span className="font-semibold text-slate-900">
                        {team.score.toLocaleString("en-IN")}
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

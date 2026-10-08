"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import {
  getCurrentTeamRole,
  getTeamDetail,
  listTeams,
} from "@/lib/team-management/service";
import {
  TeamServiceError,
  type TeamDetail,
  type TeamRole,
  type TeamSummary,
} from "@/lib/team-management/types";
import { useTeamRealtime } from "@/lib/team-management/use-team-realtime";
import { TeamList } from "./team-list";
import { TeamMembersPanel } from "./team-members-panel";
import {
  TeamCoinPanel,
  TeamDetailsPanel,
  TeamScorePanel,
} from "./team-editors";

/**
 * Read-only module for both roles. The service resolves the active database
 * profile; existing RLS remains authoritative for team and related-data access.
 */
export function TeamManagementView() {
  // undefined = still resolving, null = no Team Management access
  const [role, setRole] = useState<TeamRole | null | undefined>(undefined);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Guards against an older response overwriting a newer selection.
  const detailRequest = useRef(0);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await listTeams();
      setTeams(data);
      setListError(null);
    } catch {
      setListError("Unable to load team information.");
    } finally {
      setListLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (teamId: string) => {
    const requestId = ++detailRequest.current;
    try {
      const data = await getTeamDetail(teamId);
      if (requestId !== detailRequest.current) return;
      setDetail(data);
      setDetailError(null);
    } catch (error) {
      if (requestId !== detailRequest.current) return;
      setDetail(null);
      setDetailError(
        error instanceof TeamServiceError && error.kind === "not_found"
          ? "This team no longer exists."
          : "Unable to load team information."
      );
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getCurrentTeamRole()
      .then((r) => {
        if (!active) return;
        setRole(r);
        if (r === null) {
          setListLoading(false);
        } else {
          void fetchTeams();
        }
      })
      .catch(() => {
        if (!active) return;
        setRole(null);
        setListLoading(false);
        setListError("Unable to load team information.");
      });

    return () => {
      active = false;
    };
  }, [fetchTeams]);

  const refreshAll = useCallback(() => {
    void fetchTeams();
    if (selectedId) void fetchDetail(selectedId);
  }, [fetchTeams, fetchDetail, selectedId]);

  useTeamRealtime(refreshAll, role === "admin" || role === "associate");

  function handleSelect(teamId: string) {
    setSelectedId(teamId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    void fetchDetail(teamId);
  }

  if (role === undefined) {
    return <Loading label="Loading teams..." />;
  }

  if (role === null) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-[#FF2A1A]/30 bg-[#FF2A1A]/5 p-6 text-sm text-[#FF2A1A] font-mono"
      >
        {listError ?? "You do not have permission to view Team Management."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="note"
        className="inline-flex items-center gap-2 rounded-full border border-[#292D33] bg-[#0D0F12] px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#686C74]"
      >
        <Lock aria-hidden="true" className="size-3.5 text-[#FF2A1A]" />
        READ ONLY
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] gap-6">
        <TeamList
          teams={teams}
          loading={listLoading}
          error={listError}
          search={search}
          onSearchChange={setSearch}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        <div className="space-y-4 min-w-0">
          {!selectedId ? (
            <p className="rounded-xl border border-[#292D33] bg-[#111318] p-6 text-sm text-[#686C74] font-mono">
              Select a team from the list to view details.
            </p>
          ) : detailLoading ? (
            <Loading label="Loading team details..." />
          ) : detailError || !detail ? (
            <p
              role="alert"
              className="rounded-xl border border-[#FF2A1A]/30 bg-[#FF2A1A]/5 p-6 text-sm text-[#FF2A1A] font-mono"
            >
              {detailError ?? "Unable to load team information."}
            </p>
          ) : (
            <>
              <TeamDetailsPanel team={detail} />
              <TeamMembersPanel members={detail.members} />
              <TeamScorePanel team={detail} />
              <TeamCoinPanel team={detail} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

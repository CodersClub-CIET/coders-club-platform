"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import {
  getCurrentTeamRole,
  getTeamDetail,
  listTeams,
  type UpdatedTeamFields,
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
 * One reusable module for both roles. `role` comes from the database
 * (public.current_app_role) and only decides what is RENDERED; RLS and the
 * mutation functions enforce what is ALLOWED.
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

  // Apply the server's confirmed values (no optimistic guesswork to roll back).
  function applyTeamPatch(patch: UpdatedTeamFields) {
    setDetail((d) => (d ? { ...d, ...patch } : d));
    setTeams((list) =>
      list.map((t) => (t.id === selectedId ? { ...t, ...patch } : t))
    );
  }

  function applyCoinPatch(coinTypeId: string, balance: number) {
    setDetail((d) =>
      d
        ? {
            ...d,
            coins: d.coins.map((c) =>
              c.coinTypeId === coinTypeId ? { ...c, balance } : c
            ),
          }
        : d
    );
  }

  function handleMutationError(error: unknown) {
    if (error instanceof TeamServiceError) {
      toast.error(error.message);
      if (error.kind === "conflict" || error.kind === "not_found") {
        refreshAll();
      }
      return;
    }
    toast.error("Unable to save changes.");
  }

  if (role === undefined) {
    return <Loading label="Loading teams..." />;
  }

  if (role === null) {
    return (
      <p
        role="alert"
        className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-700"
      >
        You do not have permission to view Team Management.
      </p>
    );
  }

  const canEdit = role === "associate";

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div
          role="note"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
        >
          <Lock aria-hidden="true" className="size-3.5" />
          READ ONLY
        </div>
      )}

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
            <p className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
              Select a team to view details.
            </p>
          ) : detailLoading ? (
            <Loading label="Loading teams..." />
          ) : detailError || !detail ? (
            <p
              role="alert"
              className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-red-600"
            >
              {detailError ?? "Unable to load team information."}
            </p>
          ) : (
            <>
              <TeamDetailsPanel
                team={detail}
                canEdit={canEdit}
                onTeamUpdated={applyTeamPatch}
                onMutationError={handleMutationError}
              />
              <TeamMembersPanel members={detail.members} />
              <TeamScorePanel
                team={detail}
                canEdit={canEdit}
                onTeamUpdated={applyTeamPatch}
                onMutationError={handleMutationError}
              />
              <TeamCoinPanel
                team={detail}
                canEdit={canEdit}
                onCoinUpdated={applyCoinPatch}
                onMutationError={handleMutationError}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

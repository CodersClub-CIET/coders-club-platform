import { createClient } from "@/lib/supabase/client";
import {
  TeamServiceError,
  type CoinBalance,
  type TeamDetail,
  type TeamMember,
  type TeamRole,
  type TeamSummary,
} from "./types";

/**
 * Team Management data access. Talks to Supabase directly (Next.js -> Supabase).
 *
 * READS use plain table/view selects; RLS decides what the caller can see.
 * WRITES go ONLY through the SECURITY DEFINER RPCs created in
 * 20261006000200_team_management.sql. There is deliberately no .update(),
 * .insert() or .delete() on any Team Management table here: the database would
 * reject them for every client role anyway.
 */

interface TeamRow {
  id: string;
  team_code: string;
  name: string;
  score: number;
  version: number;
  team_members?: { count: number }[] | null;
}

interface MemberRow {
  student_id: string;
  reg_no: string;
  name: string;
  department: string;
  year: number;
  section: string;
}

interface CoinTypeRow {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

interface BalanceRow {
  coin_type_id: string;
  balance: number;
}

interface PostgrestLikeError {
  code?: string;
  message: string;
}

function toServiceError(error: PostgrestLikeError): TeamServiceError {
  switch (error.code) {
    case "42501":
      return new TeamServiceError(
        "forbidden",
        "You do not have permission to perform this action."
      );
    case "40001":
      return new TeamServiceError(
        "conflict",
        "This was changed by someone else. The latest values have been loaded."
      );
    case "22023":
      return new TeamServiceError("validation", "The submitted value is not valid.");
    case "P0002":
      return new TeamServiceError("not_found", "This team or coin type no longer exists.");
    case "22000":
      return new TeamServiceError("inactive_coin", "This coin type is not active.");
    default:
      return new TeamServiceError("unknown", "Unable to save changes.");
  }
}

function toSummary(row: TeamRow): TeamSummary {
  return {
    id: row.id,
    teamCode: row.team_code,
    name: row.name,
    score: row.score,
    version: row.version,
    memberCount: row.team_members?.[0]?.count ?? 0,
  };
}

/** Role as the DATABASE sees it (same function RLS uses). UX hint only. */
export async function getCurrentTeamRole(): Promise<TeamRole | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("current_app_role");

  if (error) {
    throw new Error("Unable to determine your access level.");
  }

  return data === "admin" || data === "associate" ? data : null;
}

export async function listTeams(): Promise<TeamSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_code, name, score, version, team_members(count)")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Unable to load team information.");
  }

  return ((data ?? []) as TeamRow[]).map(toSummary);
}

export async function getTeamDetail(teamId: string): Promise<TeamDetail> {
  const supabase = createClient();

  const [teamRes, memberRes, coinTypeRes, balanceRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, name, score, version")
      .eq("id", teamId)
      .maybeSingle(),
    supabase
      .from("team_member_details")
      .select("student_id, reg_no, name, department, year, section")
      .eq("team_id", teamId)
      .order("name", { ascending: true }),
    supabase
      .from("coin_types")
      .select("id, code, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("team_coin_balances")
      .select("coin_type_id, balance")
      .eq("team_id", teamId),
  ]);

  if (teamRes.error || memberRes.error || coinTypeRes.error || balanceRes.error) {
    throw new Error("Unable to load team information.");
  }
  if (!teamRes.data) {
    throw new TeamServiceError("not_found", "This team no longer exists.");
  }

  const team = teamRes.data as TeamRow;

  const members: TeamMember[] = ((memberRes.data ?? []) as MemberRow[]).map(
    (m) => ({
      studentId: m.student_id,
      regNo: m.reg_no,
      name: m.name,
      department: m.department,
      year: m.year,
      section: m.section,
    })
  );

  const balanceByType = new Map<string, number>(
    ((balanceRes.data ?? []) as BalanceRow[]).map((b) => [
      b.coin_type_id,
      b.balance,
    ])
  );

  // Every configured, active coin type is shown; a missing row means 0.
  const coins: CoinBalance[] = ((coinTypeRes.data ?? []) as CoinTypeRow[]).map(
    (c) => ({
      coinTypeId: c.id,
      code: c.code,
      name: c.name,
      balance: balanceByType.get(c.id) ?? 0,
      sortOrder: c.sort_order,
    })
  );

  return {
    id: team.id,
    teamCode: team.team_code,
    name: team.name,
    score: team.score,
    version: team.version,
    members,
    coins,
  };
}

export interface UpdatedTeamFields {
  name: string;
  score: number;
  version: number;
}

function toUpdatedFields(row: TeamRow): UpdatedTeamFields {
  return { name: row.name, score: row.score, version: row.version };
}

export async function updateTeamDetails(
  teamId: string,
  name: string,
  expectedVersion: number
): Promise<UpdatedTeamFields> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("team_update_details", {
    p_team_id: teamId,
    p_name: name,
    p_expected_version: expectedVersion,
  });

  if (error) throw toServiceError(error);
  return toUpdatedFields(data as TeamRow);
}

export async function updateTeamScore(
  teamId: string,
  score: number,
  expectedVersion: number
): Promise<UpdatedTeamFields> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("team_update_score", {
    p_team_id: teamId,
    p_score: score,
    p_expected_version: expectedVersion,
  });

  if (error) throw toServiceError(error);
  return toUpdatedFields(data as TeamRow);
}

export async function setCoinBalance(
  teamId: string,
  coinTypeId: string,
  balance: number,
  expectedBalance: number
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("team_set_coin_balance", {
    p_team_id: teamId,
    p_coin_type_id: coinTypeId,
    p_balance: balance,
    p_expected_balance: expectedBalance,
  });

  if (error) throw toServiceError(error);
  return (data as BalanceRow).balance;
}

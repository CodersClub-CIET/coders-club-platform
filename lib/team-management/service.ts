import { createClient } from "@/lib/supabase/client";
import {
  TeamServiceError,
  type CoinBalance,
  type TeamDetail,
  type TeamMember,
  type TeamMemberPlacement,
  type TeamRole,
  type TeamStatus,
  type TeamSummary,
} from "./types";

/** Read-only session client. The existing database RLS decides resource access. */
const PAGE_SIZE = 200;
const TEAM_COLUMNS =
  "id, academic_year_id, name, description, team_score, status, created_at, updated_at";

type Relation<T> = T | T[] | null;

interface TeamRow {
  id: string;
  academic_year_id: string;
  name: string;
  description: string | null;
  team_score: number | string;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  team_members?: { count: number }[] | null;
}

interface ClassSectionRow {
  academic_year_id: string;
  program_id: string;
  year_of_study: number;
  section: string;
  programs: Relation<{ name: string }>;
}

interface EnrollmentRow {
  is_current: boolean;
  class_sections: Relation<ClassSectionRow>;
}

interface StudentRow {
  register_number: string;
  name: string;
  student_enrollments: EnrollmentRow[] | null;
}

interface MemberRow {
  id: string;
  student_id: string;
  students: Relation<StudentRow>;
}

interface CoinTypeRow {
  id: string;
  code: string;
  name: string;
}

interface BalanceRow {
  coin_type_id: string;
  balance: number | string;
}

function one<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function checkError(error: { code?: string } | null, message: string): void {
  if (error) {
    throw new TeamServiceError(
      error.code === "42501" ? "forbidden" : "unknown",
      message
    );
  }
}

function numeric(value: number | string): number {
  const result = typeof value === "number" || (typeof value === "string" && value.trim() !== "")
    ? Number(value)
    : NaN;
  if (!Number.isFinite(result)) {
    throw new TeamServiceError("unknown", "A stored numeric value cannot be displayed.");
  }
  return result;
}

function toSummary(row: TeamRow): TeamSummary {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    name: row.name,
    description: row.description,
    score: numeric(row.team_score),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: row.team_members?.[0]?.count ?? 0,
  };
}

/** Profile-derived application access; resource authorization remains in RLS. */
async function resolveTeamRole(
  supabase: ReturnType<typeof createClient>
): Promise<TeamRole | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    throw new TeamServiceError("unknown", "Unable to verify your session.");
  }
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  checkError(error, "Unable to determine your access level.");
  if (!profile?.is_active) return null;

  return profile.role === "admin" || profile.role === "associate"
    ? profile.role
    : null;
}

/** Kept under its existing name for the read UI. */
export async function getCurrentTeamRole(): Promise<TeamRole | null> {
  return resolveTeamRole(createClient());
}

async function requireReadAccess(supabase: ReturnType<typeof createClient>): Promise<void> {
  if (await resolveTeamRole(supabase) === null) {
    throw new TeamServiceError("forbidden", "An active Admin or Associate profile is required.");
  }
}

export async function listTeams(): Promise<TeamSummary[]> {
  const supabase = createClient();
  await requireReadAccess(supabase);
  const rows: TeamSummary[] = [];

  // Stable pagination avoids silently truncating the visible teams at the API limit.
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("teams")
      .select(`${TEAM_COLUMNS}, team_members(count)`)
      .eq("team_members.is_active", true)
      .is("team_members.left_at", null)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    checkError(error, "Unable to load team information.");
    const page = (data ?? []) as unknown as TeamRow[];
    rows.push(...page.map(toSummary));
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getTeamDetail(teamId: string): Promise<TeamDetail> {
  const supabase = createClient();
  await requireReadAccess(supabase);
  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .eq("id", teamId)
    .maybeSingle();

  checkError(teamError, "Unable to load team information.");
  if (!teamData) {
    throw new TeamServiceError(
      "not_found",
      "This team is unavailable or you no longer have access."
    );
  }
  const team = teamData as TeamRow;

  const memberRows: MemberRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("team_members")
      .select(
        "id, student_id, students(register_number, name, student_enrollments(is_current, class_sections(academic_year_id, program_id, year_of_study, section, programs(name))))"
      )
      .eq("team_id", teamId)
      .eq("is_active", true)
      .is("left_at", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    checkError(error, "Unable to load team members.");
    const page = (data ?? []) as unknown as MemberRow[];
    memberRows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const coinTypes: CoinTypeRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("coin_types")
      .select("id, code, name")
      .eq("is_enabled", true)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    checkError(error, "Unable to load enabled coin types.");
    const page = (data ?? []) as CoinTypeRow[];
    coinTypes.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const balances: BalanceRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("team_coin_balances")
      .select("coin_type_id, balance")
      .eq("team_id", teamId)
      .order("coin_type_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    checkError(error, "Unable to load coin balances.");
    const page = (data ?? []) as BalanceRow[];
    balances.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  // Left embeds preserve memberships when student/enrollment RLS hides details.
  const members: TeamMember[] = memberRows.map((row) => {
    const student = one(row.students);
    const placements: TeamMemberPlacement[] =
      (student?.student_enrollments ?? []).flatMap((enrollment) => {
        const section = one(enrollment.class_sections);
        if (!section || section.academic_year_id !== team.academic_year_id) return [];
        return [{
          programId: section.program_id,
          department: one(section.programs)?.name ?? null,
          year: section.year_of_study,
          section: section.section,
          isCurrent: enrollment.is_current,
        }];
      });
    const current = placements.filter((placement) => placement.isCurrent);
    const candidates = current.length > 0 ? current : placements;
    // Do not arbitrarily choose between multiple matching academic placements.
    const placement = candidates.length === 1 ? candidates[0] : null;
    return {
      membershipId: row.id,
      studentId: row.student_id,
      regNo: student?.register_number ?? null,
      name: student?.name ?? null,
      department: placement?.department ?? null,
      year: placement?.year ?? null,
      section: placement?.section ?? null,
      placements,
    };
  }).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const balanceByType = new Map(
    balances.map((balance) => [balance.coin_type_id, numeric(balance.balance)])
  );
  const coins: CoinBalance[] = coinTypes.map((coin) => ({
    coinTypeId: coin.id,
    code: coin.code,
    name: coin.name,
    balance: balanceByType.get(coin.id) ?? 0,
  }));

  return { ...toSummary(team), memberCount: members.length, members, coins };
}

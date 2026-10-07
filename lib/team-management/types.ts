/** Read-only projections of the existing shared Supabase tables. */
export type TeamRole = "admin" | "associate";
export type TeamStatus = "active" | "inactive" | "disbanded" | "archived";

export interface TeamSummary {
  id: string;
  academicYearId: string;
  name: string;
  description: string | null;
  /** Display alias for the stored teams.team_score; never calculated here. */
  score: number;
  status: TeamStatus;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface TeamMemberPlacement {
  programId: string;
  /** Existing programs.name, not a duplicated department field. */
  department: string | null;
  year: number;
  section: string;
  isCurrent: boolean;
}

export interface TeamMember {
  membershipId: string;
  studentId: string;
  /** Null means the related student is unavailable under the caller's RLS. */
  regNo: string | null;
  name: string | null;
  /** Scalar placement fields are null when no single placement is unambiguous. */
  department: string | null;
  year: number | null;
  section: string | null;
  placements: TeamMemberPlacement[];
}

export interface CoinBalance {
  coinTypeId: string;
  code: string;
  name: string;
  /** 0 when no balance row is visible for this enabled coin type. */
  balance: number;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
  coins: CoinBalance[];
}

/** Retained because the existing validation module imports this type. */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/** Existing error-handler vocabulary retained; this service performs no writes. */
export type TeamServiceErrorKind =
  | "forbidden"
  | "conflict"
  | "validation"
  | "not_found"
  | "inactive_coin"
  | "unknown";

export class TeamServiceError extends Error {
  kind: TeamServiceErrorKind;

  constructor(kind: TeamServiceErrorKind, message: string) {
    super(message);
    this.name = "TeamServiceError";
    this.kind = kind;
  }
}

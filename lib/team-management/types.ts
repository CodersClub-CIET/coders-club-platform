/**
 * Team Management - data contracts.
 *
 * Students are NOT owned here: TeamMember is a read-only projection of the
 * existing student record (see StudentReference in app/types/score.ts, which
 * uses the same field names).
 *
 * Coin types are NOT owned here either: CoinBalance is whatever the coin-type
 * source returns, merged with this team's balance. No coin name appears in code.
 */

/** Server-trusted role, as reported by public.current_app_role(). */
export type TeamRole = "admin" | "associate";

export interface TeamSummary {
  id: string;
  teamCode: string;
  name: string;
  score: number;
  version: number;
  memberCount: number;
}

export interface TeamMember {
  studentId: string;
  regNo: string;
  name: string;
  department: string;
  year: number;
  section: string;
}

export interface CoinBalance {
  coinTypeId: string;
  code: string;
  name: string;
  /** 0 when the team has no stored row for this coin type. */
  balance: number;
  sortOrder: number;
}

export interface TeamDetail {
  id: string;
  teamCode: string;
  name: string;
  score: number;
  version: number;
  members: TeamMember[];
  coins: CoinBalance[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

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

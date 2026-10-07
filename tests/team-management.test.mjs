import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  validateTeamName,
  validateTeamScore,
  validateCoinBalance,
  parseWholeNumber,
  formatYear,
  MAX_TEAM_NAME_LENGTH,
  MAX_TEAM_SCORE,
  MAX_COIN_BALANCE,
} from "../lib/team-management/validation.ts";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
// Source with comments removed, so guards check code and not explanations.
const code = (rel) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (dir) =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );

const teamSql = read("supabase/migrations/20261006000200_team_management.sql");
const depsSql = read("supabase/migrations/20261006000100_team_management_dependencies.sql");
const authzSql = read("supabase/migrations/20261006000000_team_management_authz.sql");
const clientFiles = [
  ...walk("lib/team-management"),
  ...walk("components/team-management"),
  ...walk("app/team-management"),
];

describe("Team Management - validation", () => {
  it("accepts valid and rejects invalid team names", () => {
    assert.equal(validateTeamName("Alpha").isValid, true);
    assert.equal(validateTeamName("   ").isValid, false);
    assert.equal(validateTeamName("").isValid, false);
    assert.equal(validateTeamName("x".repeat(MAX_TEAM_NAME_LENGTH)).isValid, true);
    assert.equal(validateTeamName("x".repeat(MAX_TEAM_NAME_LENGTH + 1)).isValid, false);
  });

  it("validates score as a bounded whole number", () => {
    assert.equal(validateTeamScore(0).isValid, true);
    assert.equal(validateTeamScore(1250).isValid, true);
    assert.equal(validateTeamScore(MAX_TEAM_SCORE).isValid, true);
    assert.equal(validateTeamScore(-1).isValid, false);
    assert.equal(validateTeamScore(1.5).isValid, false);
    assert.equal(validateTeamScore(MAX_TEAM_SCORE + 1).isValid, false);
    assert.equal(validateTeamScore(NaN).isValid, false);
    assert.equal(validateTeamScore(Infinity).isValid, false);
  });

  it("never allows negative coin balances", () => {
    assert.equal(validateCoinBalance(0).isValid, true);
    assert.equal(validateCoinBalance(8).isValid, true);
    assert.equal(validateCoinBalance(-1).isValid, false);
    assert.equal(validateCoinBalance(2.2).isValid, false);
    assert.equal(validateCoinBalance(MAX_COIN_BALANCE + 1).isValid, false);
  });

  it("parses typed numbers strictly", () => {
    assert.equal(parseWholeNumber("1300"), 1300);
    assert.equal(parseWholeNumber(" 1,300 "), 1300);
    assert.equal(parseWholeNumber("0"), 0);
    assert.equal(parseWholeNumber("12abc"), null);
    assert.equal(parseWholeNumber("1e3"), null);
    assert.equal(parseWholeNumber(""), null);
    assert.equal(parseWholeNumber("  "), null);
    assert.equal(parseWholeNumber("1.5"), null);
    assert.equal(parseWholeNumber("99999999999999999999"), null);
  });

  it("formats year as roman numerals", () => {
    assert.deepEqual([1, 2, 3, 4].map(formatYear), ["I", "II", "III", "IV"]);
    assert.equal(formatYear(5), "5");
  });

  it("keeps TS limits in sync with SQL CHECK constraints", () => {
    assert.match(teamSql, new RegExp(`BETWEEN 1 AND ${MAX_TEAM_NAME_LENGTH}`));
    assert.match(teamSql, new RegExp(`score BETWEEN 0 AND ${MAX_TEAM_SCORE}`));
    assert.match(teamSql, new RegExp(`balance BETWEEN 0 AND ${MAX_COIN_BALANCE}`));
  });
});

describe("Team Management - database security (static checks)", () => {
  it("defines no INSERT/UPDATE/DELETE/ALL policies on Team Management tables", () => {
    const policies = [...teamSql.matchAll(/CREATE POLICY[\s\S]*?;/g)].map((m) => m[0]);
    assert.ok(policies.length >= 4);
    for (const p of policies) {
      assert.match(p, /FOR SELECT/, `non-SELECT policy found:\n${p}`);
    }
  });

  it("never uses permissive USING (true) policies", () => {
    for (const sql of [teamSql, depsSql, authzSql]) {
      assert.doesNotMatch(sql, /USING\s*\(\s*true\s*\)/i);
      assert.doesNotMatch(sql, /WITH CHECK\s*\(\s*true\s*\)/i);
    }
  });

  it("enables RLS on every Team Management table", () => {
    for (const t of ["teams", "team_members", "team_coin_balances", "audit_logs"]) {
      assert.match(teamSql, new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`));
    }
  });

  it("grants clients SELECT only and revokes writes", () => {
    assert.match(teamSql, /REVOKE ALL ON public\.teams[\s\S]*?FROM anon, authenticated/);
    assert.doesNotMatch(teamSql, /GRANT\s+(INSERT|UPDATE|DELETE|ALL)[^;]*TO\s+(anon|authenticated)/i);
  });

  it("does not trust editable user_metadata for authorization", () => {
    for (const sql of [teamSql, depsSql, authzSql]) {
      const code = sql.replace(/--.*$/gm, "");
      assert.doesNotMatch(code, /user_metadata/);
    }
  });

  it("rejects non-associates (admins) inside every mutation function", () => {
    for (const fn of ["team_update_details", "team_update_score", "team_set_coin_balance"]) {
      const body = teamSql.slice(teamSql.indexOf(`FUNCTION public.${fn}(`));
      const end = body.indexOf("$$;", body.indexOf("$$;") + 1);
      assert.match(body.slice(0, end), /team_require_associate\(\)/, `${fn} must require associate`);
    }
    assert.match(teamSql, /FORBIDDEN_ROLE/);
    assert.match(teamSql, /IS DISTINCT FROM 'associate'/);
  });

  it("writes the audit row inside each mutation function (same transaction)", () => {
    for (const action of ["team_updated", "team_score_updated", "team_coin_balance_updated"]) {
      assert.match(teamSql, new RegExp(`'${action}'`));
    }
    assert.equal((teamSql.match(/INSERT INTO public\.audit_logs/g) ?? []).length, 3);
  });

  it("revokes public/anon execute on mutation functions", () => {
    assert.match(teamSql, /REVOKE ALL ON FUNCTION public\.team_update_score[^;]*FROM PUBLIC, anon/);
    assert.match(authzSql, /REVOKE ALL ON FUNCTION public\.current_app_role\(\) FROM PUBLIC, anon/);
  });

  it("student membership references students by FK and copies no student data", () => {
    const members = teamSql.slice(
      teamSql.indexOf("CREATE TABLE IF NOT EXISTS public.team_members"),
      teamSql.indexOf("CREATE INDEX IF NOT EXISTS idx_team_members_student")
    );
    assert.match(members, /REFERENCES public\.students\(id\)/);
    assert.doesNotMatch(members, /\b(department|section|reg_no|year)\b/i);
  });

  it("has no per-coin columns (generic coin model)", () => {
    assert.doesNotMatch(teamSql, /\b(solo|dual|boss)_coins?\b/i);
  });
});

describe("Team Management - client code boundaries (static checks)", () => {
  it("never references a service-role key", () => {
    for (const f of clientFiles) {
      assert.doesNotMatch(read(f), /service_role|SERVICE_ROLE/i, f);
    }
  });

  it("does not hard-code coin type names in the client", () => {
    for (const f of clientFiles) {
      assert.doesNotMatch(read(f), /\b(solo|dual|boss)(Coins?|_coins?)\b/i, f);
    }
  });

  it("performs no direct table writes (mutations only via RPC)", () => {
    for (const f of clientFiles) {
      assert.doesNotMatch(code(f), /\.(insert|update|upsert|delete)\(/, f);
    }
  });

  it("derives role from the database, not email/user_metadata/localStorage", () => {
    for (const f of clientFiles) {
      const code = read(f);
      assert.doesNotMatch(code, /user_metadata|localStorage|includes\(["']admin["']\)/, f);
    }
    assert.match(read("lib/team-management/service.ts"), /rpc\("current_app_role"\)/);
  });

  it("introduces no Django or custom backend", () => {
    for (const f of clientFiles) {
      assert.doesNotMatch(read(f), /django|express|NEXT_PUBLIC_API_URL|apiClient/i, f);
    }
  });

  it("renders no edit controls unless canEdit", () => {
    const editors = read("components/team-management/team-editors.tsx");
    assert.match(editors, /canEdit\s*&&/);
    assert.match(read("components/team-management/team-management-view.tsx"), /role === "associate"/);
  });
});

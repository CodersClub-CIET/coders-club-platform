import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const read = (rel) =>
  fs.readFileSync(path.join(root, rel), "utf8");

const code = (rel) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const teamFiles = [
  "lib/team-management/service.ts",
  "lib/team-management/types.ts",
  "lib/team-management/validation.ts",
  "lib/team-management/use-submit-guard.ts",
  "lib/team-management/use-team-realtime.ts",
  "components/team-management/team-editors.tsx",
  "components/team-management/team-list.tsx",
  "components/team-management/team-management-view.tsx",
  "components/team-management/team-members-panel.tsx",
  "app/team-management/page.tsx",
];

describe("Team Management - shared schema boundaries", () => {
  it("uses the real teams schema fields", () => {
    const service = read("lib/team-management/service.ts");

    for (const field of [
      "academic_year_id",
      "name",
      "description",
      "team_score",
      "status",
      "created_at",
      "updated_at",
    ]) {
      assert.match(service, new RegExp(`\\b${field}\\b`));
    }

    assert.doesNotMatch(service, /\bteam_code\b/);
    assert.doesNotMatch(service, /\bversion\b/);
  });

  it("uses the real team membership relationships", () => {
    const service = read("lib/team-management/service.ts");

    assert.match(service, /\.from\("team_members"\)/);
    assert.match(service, /students\(/);
    assert.match(service, /student_enrollments/);
    assert.match(service, /class_sections/);
    assert.match(service, /programs\(name\)/);
  });

  it("uses the real generic coin schema", () => {
    const service = read("lib/team-management/service.ts");

    assert.match(service, /\.from\("coin_types"\)/);
    assert.match(service, /is_enabled/);
    assert.match(service, /\.from\("team_coin_balances"\)/);
    assert.doesNotMatch(service, /\bsort_order\b/);
    assert.doesNotMatch(service, /\b(solo|dual|boss)_coins?\b/i);
  });

  it("resolves the application role from user_profiles", () => {
    const service = read("lib/team-management/service.ts");

    assert.match(service, /\.from\("user_profiles"\)/);
    assert.match(service, /select\("role, is_active"\)/);
    assert.doesNotMatch(service, /rpc\("current_app_role"\)/);
    assert.doesNotMatch(service, /user_metadata/);
    assert.doesNotMatch(service, /localStorage/);
  });
});

describe("Team Management - read-only client boundaries", () => {
  it("contains no direct table mutations", () => {
    for (const file of teamFiles) {
      assert.doesNotMatch(
        code(file),
        /\.(insert|update|upsert|delete)\(/,
        file
      );
    }
  });

  it("contains no service-role credentials", () => {
    for (const file of teamFiles) {
      assert.doesNotMatch(
        read(file),
        /service_role|SERVICE_ROLE|SUPABASE_SERVICE_ROLE/i,
        file
      );
    }
  });

  it("contains no obsolete temporary-schema RPCs", () => {
    for (const file of teamFiles) {
      assert.doesNotMatch(
        read(file),
        /team_update_details|team_update_score|team_set_coin_balance|current_app_role/,
        file
      );
    }
  });

  it("keeps Team Management read-only in the UI", () => {
    const editors = read("components/team-management/team-editors.tsx");
    const view = read("components/team-management/team-management-view.tsx");

    assert.doesNotMatch(editors, /onTeamUpdated|onCoinUpdated|canEdit/);
    assert.doesNotMatch(view, /onTeamUpdated|onCoinUpdated|canEdit/);
    assert.match(view, /READ ONLY/);
  });
});

describe("Team Management - validation", () => {
  it("retains the existing validation module", () => {
    const validation = read("lib/team-management/validation.ts");

    for (const name of [
      "validateTeamName",
      "validateTeamScore",
      "validateCoinBalance",
      "parseWholeNumber",
      "formatYear",
    ]) {
      assert.match(validation, new RegExp(`\\b${name}\\b`));
    }
  });
});

# Team Management Contract (Next.js → Supabase)

Module owner: Mithin. Backend: **Supabase only** (no Django, no custom backend).
Supersedes the Django-era notes in `docs/foundation.md` / `docs/auth-contract.md` for this module.

## 1. Architecture

    Next.js (/team-management)
      ├─ reads  → Supabase tables/views   (RLS decides visibility)
      ├─ writes → Supabase RPC functions  (SECURITY DEFINER; the ONLY write path)
      └─ live   → Supabase Realtime       (postgres_changes, RLS-filtered)

## 2. Authorization (server-trusted)

* `public.user_roles(user_id, role, approved, active)` — not writable by any client.
* `public.current_app_role()` returns `'admin' | 'associate' | NULL`.
  Associates must be `approved`; both must be `active`.
* The UI asks the **database** (`rpc('current_app_role')`) so UI and RLS agree.
  `user_metadata`, email text and localStorage are never used by this module.
* Bootstrap an account (as DB owner):
  `INSERT INTO public.user_roles (user_id, role, approved) VALUES ('<auth.users.id>', 'admin', true);`
* **Other owners:** if Associate Management ships a profiles/roles table, change only
  the body of `current_app_role()`; Team Management depends on nothing else.

> Existing policies in `20261003000000_dynamic_qr.sql` still trust
> `user_metadata.role`, which any signed-in user can edit about themselves. That is
> outside this module and was not changed, but it should be fixed by its owner.

## 3. Tables (migrations `20261006000000` … `20261006000200`)

| Table | Owner | Notes |
|---|---|---|
| `user_roles` | Team Mgmt (shared) | role source for RLS |
| `students` | **Student Management** | *shim, see §6* |
| `coin_types` | **Coin Management** | *shim, see §6* |
| `teams` | Team Mgmt | `team_code` (protected), `name`, `score`, `version` |
| `team_members` | Team Mgmt | `(team_id, student_id → students.id)`; no student data copied |
| `team_coin_balances` | Team Mgmt | `(team_id, coin_type_id → coin_types.id, balance)` |
| `audit_logs` | shared, generic | reusable by any module |
| `team_member_details` (view) | Team Mgmt | `security_invoker`; projection of existing students |

## 4. Access matrix

| | anon | no role | admin | associate |
|---|---|---|---|---|
| SELECT teams / members / balances | ✗ | ✗ (0 rows) | ✓ | ✓ |
| SELECT audit_logs | ✗ | ✗ | ✓ | ✗ |
| Direct INSERT/UPDATE/DELETE | ✗ | ✗ | ✗ | ✗ |
| RPC mutations | ✗ | ✗ | ✗ `FORBIDDEN_ROLE` | ✓ |

Clients hold **no** write grant and there is **no** write policy on any Team Management
table; a future permissive policy would still hit the REVOKE.

## 5. Mutation RPCs

| Function | Effect | Audit action |
|---|---|---|
| `team_update_details(team, name, expected_version)` | rename (team code and membership are NOT editable) | `team_updated` |
| `team_update_score(team, score, expected_version)` | set score | `team_score_updated` |
| `team_set_coin_balance(team, coin_type, balance, expected_balance)` | set one balance | `team_coin_balance_updated` |

Each one, in a single transaction: requires an approved active associate → validates →
locks the team row → rejects stale edits → writes audit row → updates.

Error codes: `42501` forbidden/unauthenticated · `22023` validation · `P0002` not found ·
`40001` version conflict · `22000` inactive coin type. No-op edits write nothing.

Audit row: `occurred_at, actor_id, actor_role, action, entity_type='team', entity_id,
field, before_value, after_value, metadata{team_code, team_name, coin_type_*}`.

## 6. Open dependencies — need a team decision

1. **Student Management has not shipped a `students` table.** Team members must be real
   foreign keys, so `20261006000100_team_management_dependencies.sql` creates a minimal
   `students(id, reg_no, name, department, year, section)` with `IF NOT EXISTS` and
   read-only RLS. If the owner's table differs, adapt `team_member_details`.
2. **Coin Configuration has not shipped `coin_types`.** Same shim
   (`id, code, name, is_active, sort_order`). Team Management never creates or edits coin
   types; the UI shows every *active* type, with `0` where no row exists, so new types
   appear with no code change. No coin names are defined in code or in any migration.
3. **Score ownership.** `teams.score` is treated as the authoritative team score and is
   edited only by associates. If Score Management owns team score, replace the source in
   `getTeamDetail`/`team_update_score`.
4. **Membership editing is deliberately not implemented** (not approved in the contract).
5. **Dashboards.** No Admin/Associate dashboard or nav shell exists in this branch. The
   module is a standalone `/team-management` route like its siblings; add one link when
   the dashboards merge. One component serves both roles.
6. Open product questions: may a student be on several teams (currently allowed)? may
   associates edit any team (currently yes) or only allocated ones (needs Allocation)?

## 7. Realtime

`teams`, `team_members`, `team_coin_balances` are added to `supabase_realtime`. The client
subscribes once (shared `lib/supabase/realtime.ts`), debounces, then **re-fetches through
the normal RLS-protected queries** rather than trusting the event payload.

## 8. Verification

* `npm run test:team-management` — validation + static security/boundary guards.
* `supabase/tests/team_management_rls.sql` — runs against a dev DB (see header): anon,
  no-role, admin, associate behaviour; direct writes denied; audit rows asserted.
* `supabase/seeds/team_management_dev_seed.sql` — DEV ONLY sample data.

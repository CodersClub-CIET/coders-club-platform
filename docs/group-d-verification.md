# Group D: implementation, deployment gate and verification

## Deployment gate — NOT APPLIED in this environment
The approved Proposal 001 is included byte-for-byte as:
`supabase/migrations/20261007000000_dynamic_qr_management.sql`
SHA256: `93fbfb4bff0555b326ec3a2f5ac0e3ff1acc758d326a9c4ac1f937f8277d5773`.

No authenticated deployment connection is available; the earlier connection was
declined and has not been retried. No live SQL execution, function-existence check,
RLS test, student scan, persistence/restart test or concurrency test was performed.
Approval does not establish deployment. Do not roll out the application before the
approved migration and deployment checks succeed.

Apply ONLY this approved SQL through the project's authorized postgres deployment
mechanism. Do not bulk-apply older repository migrations: their historical schema
assumptions are not the inspected canonical schema. The new SQL transaction uses
CREATE FUNCTION rather than overwriting existing names. If it fails, preserve the
PostgreSQL error and do not improvise SQL or activate an in-memory fallback.

Expected signatures:
- private.qr_require_manager(uuid)
- public.qr_create_session(uuid,text,text,integer)
- public.qr_rotate_challenge(uuid,uuid,integer)
- public.qr_end_session(uuid)
- public.qr_scan_context(uuid,text)

Verify these signatures, postgres ownership, SECURITY DEFINER, empty search_path,
internal helper denied to client roles, management EXECUTE authenticated-only,
context EXECUTE anon/authenticated, and unchanged existing student-consumer ACL.
Proposal 002 is NOT included. No qr_consume_associate call/function is implemented.

## Architecture
The API uses a new request-scoped Supabase SSR adapter under lib/dynamic-qr. It
verifies auth.getUser (cookie or bearer identity) and the caller's own active profile;
it never trusts email, metadata, request role or actor UUID. It uses the existing
Group C configuration validation and does not modify the shared auth architecture.

Reads use the caller's client and RLS, plus explicit active Associate and active
allocation + attendance_access checks. Associate writes additionally require own
student-target sessions with creator_role associate. SQL repeats the authoritative
checks. Admin scope follows existing Admin ALL policies.

Production entry points no longer import server-store/events fixture modules or
obsolete QR RPCs/tables. Those legacy modules and types remain isolated for existing
unit tests; no assertion is removed. Per-request lookup Maps in the repository only
format rows already read from Supabase; they are never persistent authorities.

All state changes use the three approved atomic RPCs. Rotation carries the expected
latest challenge UUID; a 409 triggers a read, never a blind stale retry. Browser
reloads fetch authorized saved sessions; no localStorage session/role authority.

Public POST /api/dynamic-qr/context requires both UUID and token, calls the isolated
anon client's qr_scan_context and returns an explicit six-field allowlist. Public
POST /api/dynamic-qr/consume forwards ONLY token/register/device to the unchanged
consume_student_attendance via an isolated anon public-key client, without cookies or
caller JWT. No anon table privilege or authenticated student-RPC grant is added.

Management POSTs reject a supplied foreign Origin; non-browser bearer clients may
omit Origin. Public capability endpoints do not borrow cookie authorization.
All API replies are no-store. Public context is POST, tokens are not logged by the
adapter, scanner metadata/fetches use no-referrer. QR links remain bearer capabilities;
operators must protect them and avoid external URL/request logging.

Contexts are morning/afternoon; real event_nodes UUIDs come from an authenticated
scoped events endpoint. Arbitrary/custom event IDs and unsupported contexts are no
longer submitted. Existing cards/styles are retained. Admins can operate student QR
in this screen so the supported public student path remains usable; the shared Group
C canOperateQR helper is unchanged. Associate QR consumption is explicitly deferred
and disabled, not replaced by a fake success flow.

Realtime listens only to confirmed attendance_sessions/attendance_records publication
entries; events invalidate scoped reads, not optimistic counts. Polling every four
seconds is the fallback; failed automatic rotations back off for ten seconds. Counters come from attendance_count; record reads are bounded
at 500 and session/event lists at 100. There is no claim of exhaustive export here.
Records' optional names/register numbers are FK joins subject to caller RLS. Unavailable
student information is not fabricated or inserted.

## Tests
```sh
npm ci
npx next typegen
npx tsc --noEmit --incremental false
npm run lint
npx eslint app/api/dynamic-qr app/dynamic-qr lib/dynamic-qr tests/dynamic-qr-api.test.mjs
npm run build
npm test
node --test tests/dynamic-qr-api.test.mjs
node --test tests/auth-contract.test.mjs
node --test tests/team-management.test.mjs tests/reports-export-utils.smoke.mjs
node --import ./tests/typescript-register.mjs --test lib/overall-score/*-test.ts
```

New focused tests use the actual HTTP handler, actual principal resolver and actual
Supabase repository with explicit test-only client fixtures. They verify boundaries,
scoping, RPC parameters/error mapping, input limits and response allowlists. They do
NOT execute PL/pgSQL or establish database persistence/concurrency correctness.
The fresh-repository test proves read-through adapter behavior, NOT real server-restart
persistence. Existing 10 legacy store tests remain; their Associate fixture success is
not evidence that the deferred production Associate scanner exists.

Actual verification in this pass:
- npm ci: PASS.
- Next typegen: PASS.
- QR HTTP/adapter unit tests: 75/75 PASS.
- Existing npm test/legacy QR: 10/10 PASS.
- Auth: 25/25 PASS.
- Reports: 13/13 PASS.
- Overall Score: 7/7 PASS.
- Combined Team/Reports command: exit 0, but ONLY Reports was discovered. The supplied
  authoritative ZIP omits tests/team-management.test.mjs. Team tests: NOT RUN.
- Full TypeScript: FAIL with the same two pre-existing missing Team imports.
- Build: JavaScript compilation PASS, build FAIL at those same missing Team imports.
- QR-scoped lint: no errors; one existing unused legacy-store parameter warning.
- Full lint: four unrelated existing errors and 33 warnings; not repaired in Group D.
- Local HTTP: 15/15 expected statuses, including all signed-out management boundaries,
  public malformed-input/context restrictions and scanner/login/management page shells.
- Local Chromium: public missing-token invalid-code state and no-referrer metadata
  rendered. This is NOT successful real student attendance.

## Existing baseline omissions — untouched
The supplied ZIP contains the repaired Attendance files, valid lockfile/type-only
score import, active-profile auth/state/config/guards and existing test runner.
However it omits lib/team-management/types.ts, validation.ts and the other Team
implementation files/test. Its remaining members panel references the first two,
producing identical baseline and final TS2307 errors. Do not recreate them from old
archives or fabricate types to make this pass compile. Restore the user's approved
Team files outside this Group D patch before full build/Team acceptance testing.

Other pre-existing full-lint errors are in:
- app/associate-allocation/components/AllocationManagementTable.tsx
- app/attendance/scan/page.tsx
- components/attendance/database-status-banner.tsx
- components/attendance/qr-display-modal.tsx

No .git directory is supplied. git status --short cannot report the user's Windows
branch/index. A file-by-file snapshot manifest and unified patch document changes
instead; no commit, push, reset, restore or repository recreation occurred.

## Remaining database/security checks
- Live deployment/signatures/grants, RLS, ownership and full create-to-consume flow.
- Parallel rotations, duplicate scans, refresh/scan and end/scan.
- Real server restarts, multiple instances and deployed realtime.
- Existing student function is untouched, including transaction-time expiry semantics
  and challenge-before-session ordering. Queue-boundary expiry is not claimed fixed.
- Earlier metadata reports students.is_active while the inspected student function
  refers to students.active. Whether the current deployed student schema resolves
  that pre-existing discrepancy must be verified by a real scan; no column/function
  change is introduced here.
- Existing direct Associate table INSERT policy is looser than the new management
  RPC. Admin direct table writes and orphaned old RPC grants also remain unchanged.
- Creation has no invented idempotency constraint. After an ambiguous network result,
  reload saved sessions instead of automatically retrying creation.
- Proposal 002/Associate attendance consumption stays deferred.

Status: QR application/local boundary work implemented; Group D NOT COMPLETE until
approved migration/live checks and baseline-blocked full verification are resolved.

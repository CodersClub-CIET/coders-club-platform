# Current authentication and authorization contract

This describes the implemented Supabase architecture after Group C. Historical
Django-era notes and obsolete Team `user_roles`/RPC documentation do not define
the current application's role source. No Django service, new role table, or
new permission system was introduced.

## Identity, profile, role, data and display

1. Supabase Auth `getUser()` verifies authenticated identity. Existing
   `signInWithPassword()` and the SSR browser client's session persistence remain.
2. Read the user's own `user_profiles` row using `id = user.id` and the existing
   session/RLS. Confirm `is_active === true` and a recognized role.
3. Only that active profile's `role` supplies `admin` or `associate`. Missing,
   inactive, malformed, unknown-role or unreadable profiles do not grant access.
4. Role entry guards are UX boundaries, not backend authorization. Existing RLS
   remains authoritative for real database resources. API authorization is not
   repaired by this group and remains required work in Group D.
5. Display names prefer profile `display_name`. A string metadata name is an
   optional display-only fallback. Metadata roles/email spelling/browser storage
   are never application permission inputs.

`useAuth()` retains `user`, `loading`, `isAuthenticated`, and `role`, but `role`
is now nullable rather than a signed-out Associate default. It also exposes
`profile`, `isAuthorized`, `status`, and a safe `error` message. Identity may
exist without application authorization. The helper `getCurrentUser()` returns
that distinction explicitly in `AuthUser` rather than conflating it with a role.

One shared auth subscription serves mounted hook consumers. Async requests and
old subscription generations are invalidated on sign-out/unmount/account change.
Supabase reads triggered by auth events are deferred outside the auth callback.
Management children are keyed by identity and role and never rendered while
initial verification is pending or has failed. Same-account token/focus events
revalidate the last verified profile in the background without destroying live
UI state; lookup failure still revokes access. No auth/profile role is persisted in browser storage.

## Route entry matrix

All management screens reject signed-out, inactive, missing-profile, unsupported
or unreadable-profile users. Signed-out users navigate to `/login`; denied users
receive an access message rather than a redirect loop.

| Route | Active Admin | Active Associate | Limit |
| --- | --- | --- | --- |
| `/protected` and `/protected/attendance` | Entry | Entry | Data/mutation permissions remain separate |
| `/attendance` | Entry | Entry | Guard is page-only; scan child stays public |
| `/team-management` | Read-only entry | Read-only entry | Existing Team service and RLS unchanged |
| `/associate-allocation` | Entry | Denied current screen | Current UI loads all local allocations; supplied RLS only supports Associate's own rows. A future scoped Associate view is Group E, not a new role permission |
| `/event-management` | Entry | Entry | No narrower validated entry policy in current source; does not grant resource permissions |
| `/scores` | Entry | Entry | Same limitation; local scores are not real authorized integration |
| `/reports` | Entry | Entry | Same limitation; local/global source caches remain a privacy risk |
| `/dynamic-qr` | Associate-QR operation | Student-QR operation | Matches existing operator contract; backend ownership/permission checks unresolved |

**Events/Scores/Reports role-specific resource access is NOT certified by this
matrix.** Their current local-only/unscoped implementation needs the real backend
permission contract and owner review in Group E. Client gating does not make
these services secure, persistent or allocation-aware.

Public routes: `/`, `/login`, `/attendance/scan`, `/dynamic-qr/scan`.
Student scanning requires no platform account. Only the Associate attendance
branch of Dynamic QR scanning requires a verified active Associate profile;
identity/email alone cannot authorize it. Existing RPC behavior is unchanged.

## Configuration

Copy `.env.example` to `.env.local` and fill in the existing project's public URL
and publishable (or legacy anon) key. Restart the application after changing
configuration. No fallback project or hardcoded key exists in Next config.
Missing/malformed/placeholder configuration produces an explicit error at client
creation rather than silently targeting another project. Explicit localhost HTTP
is allowed for local Supabase; remote URLs require HTTPS. Browser secret/service
role keys are rejected. These key readiness checks are not user authorization.
The existing `createBrowserClient` architecture is retained. Realtime creation is
lazy so importing public routes does not require configured backend credentials.

Login remains password-based, prevents duplicate submission, does not update an
unmounted component, uses safe messages and preserves sign-in navigation. The
unused development login Test Toast was removed. Logout reports failure rather
than pretending success and only redirects after successful sign-out.

## Cache boundaries and known risks

Auth identity/profile state is cleared when subscriptions stop or auth changes;
management component state is discarded on account change. This is a limited
auth-boundary fix, **not per-account resource cache isolation**.

Attendance sessions/records/challenges, remembered student/device data, Events
and Allocation use shared localStorage keys; some also retain module memory.
Reports derive data from those sources. Auth guards cannot prevent an authorized
second account from reading global cached resources. Existing BroadcastChannel
and storage notifications are also not account-scoped. They require Group E
cache/data design and cannot be treated as RLS-protected. No offline data was
indiscriminately erased or migrated in Group C. No IndexedDB usage was found.

## Verification

```sh
npm ci
npx next typegen
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm test
node --test tests/auth-contract.test.mjs
node --test tests/team-management.test.mjs tests/reports-export-utils.smoke.mjs
node --import ./tests/typescript-register.mjs --test lib/overall-score/*-test.ts
```

Auth tests use explicit unit fixtures and no live project. They do not prove
profile SELECT permissions or real session persistence in the deployed database.
Real-account login, Admin/Associate data scopes and RLS are NOT RUN until an
authorized real environment is available. Do not apply migrations to run them.

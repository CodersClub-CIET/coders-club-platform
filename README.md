This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Role-Based Management Dashboard

- Signed-out visitors see the Coders Club landing page at `/`.
- After login, users are redirected to `/admin/dashboard` or `/associate/dashboard` based on the active `user_profiles.role`.
- `/protected` renders a role-aware dashboard for:
  - **Admin**: Attendance, Events, Teams, Students, Associates, Scores, Reports, Configure Platform
  - **Associate**: Attendance, Events, Teams, Scores, Reports
- Route protection is enforced with `ManagementGuard`:
  - Admin-only routes: `/associates`, `/associate-allocation`, `/search-filtering`, `/protected/configure`
  - Shared manager routes (admin + associate): `/attendance`, `/event-management`, `/team-management`, `/scores`, `/reports`
- The authenticated workspace uses a responsive shell with role-aware sidebar navigation and mobile navigation.
- The Associate dashboard uses active Supabase allocations and event nodes for its assigned-activity view. It does not display local demo events or fabricated metrics.
- Associate access to the broad Students directory remains intentionally restricted until a scoped student query is verified against the existing RLS policies.
- Associate Attendance and Events routes verify an active Supabase allocation; Attendance additionally requires `attendance_access`. This uses the existing allocation schema and does not introduce a new permission table or migration.
- Associate onboarding uses the persistent `associate_access_requests` table from `supabase/migrations/20261008000000_associate_access_requests.sql`. Anonymous visitors can submit requests, while only active Admin profiles can read and review them.
- Admin approval uses server-only `SUPABASE_SERVICE_ROLE_KEY` to send a Supabase Auth invitation, create the matching `user_profiles` and `associates` records, and link the approved request. This key must never be prefixed with `NEXT_PUBLIC_` or exposed to browser code.
- The public request flow does not collect or store passwords. If `SUPABASE_SERVICE_ROLE_KEY` is not configured in the deployment environment, requests can still be submitted and reviewed, but approval reports an explicit server-configuration error instead of creating a partial or fake account.
- Apply the associate access request migration in the connected Supabase project before using `/associate-request`. If PostgREST returns `PGRST202`, the local migration exists but has not been applied (or its schema cache has not refreshed).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

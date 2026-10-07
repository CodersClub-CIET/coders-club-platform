# Local verification

Install the existing locked dependencies with `npm ci`. Use Node 22.15+ on the
22.x line, or Node 23.5+ (verified here on Node 24.14.1). The test loader uses
Node's synchronous module hooks and the existing `typescript` dependency;
it adds no dependency and is not used by application routes.

## Type checking and build

```sh
npx next typegen
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

`next typegen` generates the normal Next.js route types (including
`LayoutProps`) after a fresh checkout. Do not replace application types or
suppress compiler errors when these generated files are absent.

## Existing tests

```sh
npm test
node --test tests/team-management.test.mjs tests/reports-export-utils.smoke.mjs
node --test tests/dynamic-qr-security.test.mjs
node --import ./tests/typescript-register.mjs --test lib/overall-score/*-test.ts
```

`npm test` retains the original script and suite. Its Dynamic QR test registers
`tests/typescript-register.mjs` before dynamically importing the TypeScript
store. The same repository-owned loader runs the seven existing Overall Score
scripts. It compiles source in memory using TypeScript and resolves relative,
extensionless imports only within `lib`, `app/lib`, and `app/types`. It does not
change application imports, emit files, or provide data/backend test doubles.
Test assertions remain unchanged.

Transpilation is not type checking; always run the separate TypeScript check.
Passing these suites does not establish deployed Supabase schema/RLS correctness
or prove live authenticated user flows. Do not apply migrations to run them.

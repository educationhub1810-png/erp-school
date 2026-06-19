<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing

The suite lives in `test/` (Vitest) and `e2e/` (Playwright). Full guide: `test/README.md`.
Run `npm test` (fast, mocked) and `npm run e2e` (real browser, needs `npm run db:seed`).

**Keep tests current — when you add or change functionality, update tests in the same change:**

- **New API route** (`app/api/**/route.ts`) → add `test/api/<name>.test.ts`. Cover, at minimum:
  401 signed-out, 403 for disallowed roles (use `expectRbac` from `test/helpers/rbac.ts`),
  a 400 validation case, and the happy path. Assert the Prisma `where`/`select`/`data` args
  for tenancy scoping and PII rules — Prisma is mocked (`test/mocks/prisma.ts`).
- **New form / interactive component** → add `test/components/<name>.test.tsx` (Testing Library):
  renders, required-field validation, and submit calls the right endpoint/handler.
- **New `lib/` helper** → add `test/unit/<name>.test.ts`.
- **New role page or user-facing flow** → add/extend an `e2e/*.spec.ts`. New roles go in
  `e2e/credentials.ts`.

Before finishing, run `npm test` and make sure it's green. The same suite is runnable from the
app UI at **Super Admin → Tests**.

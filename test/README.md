# Test Suite

Three layers, run two ways (terminal **or** the in-app dashboard).

| Layer | Tool | Location | Database |
|-------|------|----------|----------|
| Unit (pure `lib/` logic) | Vitest (node) | `test/unit/` | — |
| API route handlers (RBAC, validation, CRUD) | Vitest (node) | `test/api/` | Prisma **mocked** |
| Components / forms | Vitest (jsdom) + Testing Library | `test/components/` | — |
| End-to-end (real browser) | Playwright | `e2e/` | **real**, seeded |

## Running

```bash
npm test            # all Vitest tests once (unit + api + components)
npm run test:watch  # watch mode
npm run test:ui     # Vitest browser dashboard (green/red, click into failures)
npm run test:cov    # coverage report -> ./coverage/index.html

npm run e2e         # Playwright (boots the dev server itself)
npm run e2e:ui      # Playwright interactive runner
npm run e2e:report  # open the last Playwright HTML report (traces + screenshots)

npm run test:all    # Vitest then Playwright
```

In-app: sign in as **Super Admin → Tests** to run the Vitest suite from the UI
and see a pass/fail summary plus **analytics** (pass rate, avg duration) and a
chart/table of the **last 5 runs**. Run history is stored in the **test**
database (`neontestdb`, via `TEST_DATABASE_URL`) — never production — in a
standalone `test_runs` table (raw SQL, see `lib/test-db.ts`; not part of the
Prisma schema, so the prod DB is untouched). (E2E is not runnable from the
browser — use the CLI.)

## How the mocks work

- `test/mocks/prisma.ts` — a deep-mocked Prisma client swapped in via
  `vi.mock("@/lib/prisma")`. Set return values per test:
  `prismaMock.student.findMany.mockResolvedValue([...])`. `$transaction(cb)` runs
  the callback against the same mock so writes are assertable.
- `test/mocks/auth.ts` — mocks NextAuth's `auth()`. Drive the current user with
  `setSession(sessionFor("TEACHER"))` or `setSession(null)`.
- Both reset automatically before every test (`test/setup.ts`).

Because Prisma is mocked, the **API tests prove handler logic** (auth gating,
validation, branching, response shape) but **not** real SQL. DB-enforced rules
(true multi-tenant isolation, unique constraints) are covered by the Playwright
E2E layer against the seeded database.

## Helpers

- `test/helpers/request.ts` — `buildRequest`, `callRoute`, `paramsCtx` for
  invoking App Router handlers directly (no HTTP server).
- `test/helpers/rbac.ts` — `expectRbac(handler, allowedRoles, makeReq)` asserts
  401 when signed out and 403 for every role outside `allowedRoles`.
- `test/helpers/factories.ts` — fake entity builders.

## Before running E2E

```bash
npm run db:seed     # creates the per-role logins used by e2e/credentials.ts
```

## Adding tests for new functionality

See the "Testing" section in `AGENTS.md` — every new route/form/page gets a test.

import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the REAL app in a browser.
//
// Local runs (the normal case) boot a dev server that sources `.env.test`, so
// E2E ALWAYS talks to the `neontestdb` test database — never production. Run
// them with `make e2e` (which frees port 3000 first):
//   make e2e            — headless
//   npm run e2e:ui      — interactive runner
//   npm run e2e:report  — open the last HTML report
//
// To instead test an already-deployed environment, set E2E_BASE_URL and no
// local server is started (the test DB is irrelevant then):
//   E2E_BASE_URL=https://staging.example.com npx playwright test
const PORT = process.env.E2E_PORT ?? "3000";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const useExternalServer = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // When testing a local build, Playwright owns the dev server and points it at
  // the test database by sourcing .env.test. reuseExistingServer is false so we
  // never accidentally reuse a production-pointed server — `make e2e` runs
  // `stop` first to free the port.
  webServer: useExternalServer
    ? undefined
    : {
        command: `bash -c 'set -a && . ./.env.test && set +a && npm run dev -- --port ${PORT}'`,
        url: `${BASE_URL}/login`,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});

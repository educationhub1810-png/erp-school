import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the REAL app in a browser against a seeded database.
// Before running: `npm run db:seed` so the per-role logins exist.
//   npm run e2e          — run headless
//   npm run e2e:ui       — interactive runner
//   npm run e2e:report   — open the last HTML report
const PORT = process.env.E2E_PORT ?? "3000";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Reuse a running dev server if present; otherwise start one.
  webServer: {
    command: "npm run dev",
    // Probe a concrete 200 page so an already-running dev server is reused
    // (the root path 307-redirects, which the reuse check won't treat as ready).
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

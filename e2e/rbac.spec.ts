import { test, expect } from "@playwright/test";
import { byRole } from "./credentials";
import { login } from "./helpers";

// The middleware (auth.config.ts) is the real RBAC gate — verify it in-browser.
test.describe("route guards", () => {
  test("unauthenticated users are redirected to /login with a callbackUrl", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("callbackUrl");
  });

  test("a teacher cannot enter the super-admin area and is bounced to their dashboard", async ({ page }) => {
    await login(page, byRole("TEACHER"));
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 30_000 });

    await page.goto("/super-admin/users");
    await expect(page).toHaveURL(/\/teacher\/dashboard/);
  });

  test("a signed-in user visiting /login is redirected to their dashboard", async ({ page }) => {
    await login(page, byRole("SCHOOL_ADMIN"));
    await expect(page).toHaveURL(/\/school-admin\/dashboard/, { timeout: 30_000 });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/school-admin\/dashboard/);
  });
});

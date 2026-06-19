import { test, expect } from "@playwright/test";
import { byRole } from "./credentials";
import { login } from "./helpers";

// Smoke-tests the highest-traffic built-out module end to end. Extend with the
// create-student flow once the form's selectors are stable.
test.describe("students module", () => {
  test("super admin can open the students list", async ({ page }) => {
    await login(page, byRole("SUPER_ADMIN"));
    await expect(page).toHaveURL(/\/super-admin\/dashboard/, { timeout: 15_000 });

    await page.goto("/super-admin/students");
    await expect(page).toHaveURL(/\/super-admin\/students/);
    // The page renders without redirecting away (RBAC) or erroring.
    await expect(page.locator("body")).not.toContainText(/internal server error/i);
  });

  test("school admin can open their students list", async ({ page }) => {
    await login(page, byRole("SCHOOL_ADMIN"));
    // Wait for the post-login redirect to settle (session cookie is set) before
    // navigating, otherwise the guard bounces us back to /login.
    await expect(page).toHaveURL(/\/school-admin\/dashboard/, { timeout: 15_000 });
    await page.goto("/school-admin/students");
    await expect(page).toHaveURL(/\/school-admin\/students/);
  });
});

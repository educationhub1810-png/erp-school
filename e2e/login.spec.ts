import { test, expect } from "@playwright/test";
import { CREDENTIALS } from "./credentials";
import { login } from "./helpers";

// Every seeded role should sign in and land on its own dashboard.
test.describe("login → role dashboard", () => {
  for (const cred of CREDENTIALS) {
    test(`${cred.role} signs in and reaches ${cred.dashboard}`, async ({ page }) => {
      await login(page, cred);
      await expect(page).toHaveURL(new RegExp(cred.dashboard.replace(/\//g, "\\/")), { timeout: 30_000 });
    });
  }
});

test.describe("login failures", () => {
  test("rejects bad super-admin credentials with an inline error", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await page.selectOption("#role", "SUPER_ADMIN");
    await page.fill("#username", "superadmin");
    await page.fill("#password", "wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test("rejects a correct login under the wrong selected role", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    // Real super-admin credentials, but the user picked the Teacher role.
    await page.selectOption("#role", "TEACHER");
    await page.fill("#username", "superadmin");
    await page.fill("#password", "admin123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});

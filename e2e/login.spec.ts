import { test, expect } from "@playwright/test";
import { CREDENTIALS } from "./credentials";
import { login } from "./helpers";

// Every seeded role should sign in and land on its own dashboard.
test.describe("login → role dashboard", () => {
  for (const cred of CREDENTIALS) {
    test(`${cred.role} signs in and reaches ${cred.dashboard}`, async ({ page }) => {
      await login(page, cred);
      await expect(page).toHaveURL(new RegExp(cred.dashboard.replace(/\//g, "\\/")), { timeout: 15_000 });
    });
  }
});

test.describe("login failures", () => {
  test("rejects bad super-admin credentials with an inline error", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
    await page.fill("#username", "superadmin");
    await page.fill("#password", "wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});

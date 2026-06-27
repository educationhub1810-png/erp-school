import { test, expect } from "@playwright/test";
import { CREDENTIALS } from "./credentials";
import { login } from "./helpers";

// Temporarily removed from the role dropdown in app/login/login-form.tsx —
// these accounts can't sign in via the form at all while hidden there.
const ROLES_HIDDEN_FROM_LOGIN = new Set([
  "ACCOUNTANT",
  "LIBRARIAN",
  "TRANSPORT_MANAGER",
  "HR_MANAGER",
  "WARDEN_MANAGER",
  "MESS_MANAGER",
]);

// Every seeded, selectable role should sign in and land on its own dashboard.
test.describe("login → role dashboard", () => {
  for (const cred of CREDENTIALS.filter((c) => !ROLES_HIDDEN_FROM_LOGIN.has(c.role))) {
    test(`${cred.role} signs in and reaches ${cred.dashboard}`, async ({ page }) => {
      await login(page, cred);
      await expect(page).toHaveURL(new RegExp(cred.dashboard.replace(/\//g, "\\/")), { timeout: 30_000 });
    });
  }
});

test.describe("login → role dashboard (hidden roles)", () => {
  test("the role dropdown does not offer the hidden roles at all", async ({ page }) => {
    await page.goto("/login");
    for (const role of ROLES_HIDDEN_FROM_LOGIN) {
      expect(await page.locator(`#role option[value="${role}"]`).count()).toBe(0);
    }
  });
});

test.describe("login failures", () => {
  test("rejects a wrong authenticator code for Super Admin with an inline error", async ({ page }) => {
    // Super Admin has no email/password field at all — code-only login.
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await page.selectOption("#role", "SUPER_ADMIN");
    await expect(page.locator("#username")).toHaveCount(0);
    await page.fill("#totp", "000000");
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

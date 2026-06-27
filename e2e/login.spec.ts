import { test, expect } from "@playwright/test";
import { CREDENTIALS, SCHOOL_CODE, byRole } from "./credentials";
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

test.describe("code + DOB login (Principal, Teacher, Parent)", () => {
  // Student already logs in with studentCode + DOB. Principal, Teacher and
  // Parent now use the same pattern via their own code (Staff.employeeId,
  // Teacher.employeeId, ParentProfile.parentCode) — see the matching lookup
  // paths in auth.ts. These accounts can still log in with email/mobile +
  // their real password instead, if they have one on file.
  test("a teacher logs in via employee code + DOB password", async ({ page }) => {
    await page.goto("/login");
    await page.selectOption("#role", "TEACHER");
    await page.fill("#username", "D-TCH00001");
    await page.fill("#password", "12031990");
    await page.getByRole("button", { name: /login to dashboard/i }).click();
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 30_000 });
  });

  test("a parent logs in via parent code + DOB password", async ({ page }) => {
    await page.goto("/login");
    await page.selectOption("#role", "PARENT");
    await page.fill("#username", "D-PAR00001");
    await page.fill("#password", "10051982");
    await page.getByRole("button", { name: /login to dashboard/i }).click();
    await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 30_000 });
  });

  // Regression test for a real incident: a Principal created with no email
  // and no mobile on file got "Invalid credentials" forever, because
  // auth.ts only resolved non-student logins by email/mobile. This exercises
  // the code+DOB path end to end against an account with no contact info.
  test("a principal with no email/mobile on file logs in via employee code + DOB password", async ({ page }) => {
    await login(page, byRole("SUPER_ADMIN"));
    await expect(page).toHaveURL(/\/super-admin\/dashboard/, { timeout: 30_000 });

    // Issue these as real in-page fetch() calls (not page.request.*) so the
    // browser sends a same-origin Origin header — auth.config.ts's CSRF
    // defense 403s any mutation whose Origin doesn't match Host.
    const { data: schools } = await page.evaluate(() => fetch("/api/v1/schools").then((r) => r.json()));
    const school = schools.find((s: { code: string }) => s.code === SCHOOL_CODE);

    const createJson = await page.evaluate(
      ([schoolId]) =>
        fetch("/api/v1/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId, role: "PRINCIPAL", name: "No Contact Principal", dob: "1980-04-15" }),
        }).then((r) => r.json().then((j) => ({ ok: r.ok, json: j }))),
      [school.id],
    );
    expect(createJson.ok, JSON.stringify(createJson.json)).toBeTruthy();
    const { data: created } = createJson.json;

    // /login redirects an authenticated session straight back to its
    // dashboard (auth.config.ts), so drop the Super Admin session first.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.selectOption("#role", "PRINCIPAL");
    await page.fill("#username", created.employeeId);
    await page.fill("#password", "15041980");
    await page.getByRole("button", { name: /login to dashboard/i }).click();
    await expect(page).toHaveURL(/\/principal\/dashboard/, { timeout: 30_000 });
  });
});

test.describe("login failures", () => {
  test("rejects a wrong password for Super Admin with an inline error", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /login to dashboard/i })).toBeVisible();
    await page.selectOption("#role", "SUPER_ADMIN");
    await page.fill("#username", "superadmin");
    await page.fill("#password", "wrong-password");
    await page.getByRole("button", { name: /login to dashboard/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test("rejects a correct login under the wrong selected role", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /login to dashboard/i })).toBeVisible();
    // Real super-admin credentials, but the user picked the Teacher role.
    await page.selectOption("#role", "TEACHER");
    await page.fill("#username", "superadmin");
    await page.fill("#password", "admin123");
    await page.getByRole("button", { name: /login to dashboard/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});

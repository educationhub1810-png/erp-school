import { expect, type Page } from "@playwright/test";
import type { Credential } from "./credentials";

// Drive the real login form. Leaves the school dropdown empty for super admin.
export async function login(page: Page, cred: Credential) {
  await page.goto("/login");
  // Wait for the schools dropdown to finish loading (button is disabled until then).
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();

  if (cred.schoolCode) {
    await page.selectOption("#schoolCode", cred.schoolCode);
  }
  await page.fill("#username", cred.username);
  await page.fill("#password", cred.password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

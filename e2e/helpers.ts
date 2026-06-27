import { expect, type Page } from "@playwright/test";
import type { Credential } from "./credentials";

// Drive the real login form: pick the role, then enter username + password.
export async function login(page: Page, cred: Credential) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /login to dashboard/i })).toBeVisible();

  await page.selectOption("#role", cred.role);
  await page.fill("#username", cred.username);
  await page.fill("#password", cred.password);

  await page.getByRole("button", { name: /login to dashboard/i }).click();
}

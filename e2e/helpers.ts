import { expect, type Page } from "@playwright/test";
import type { Credential } from "./credentials";
import { ROLE_LABELS } from "../lib/roles";

// Drive the real login form: pick the role, then enter username + password.
// The role field is a custom (non-native) Select, so it's driven by opening
// the popup and clicking the option rather than Playwright's selectOption
// (which only works on a native <select>).
export async function login(page: Page, cred: Credential) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /login to dashboard/i })).toBeVisible();

  await page.getByRole("combobox", { name: /role/i }).click();
  await page.getByRole("option", { name: ROLE_LABELS[cred.role] }).click();
  await page.fill("#username", cred.username);
  await page.fill("#password", cred.password);

  await page.getByRole("button", { name: /login to dashboard/i }).click();
}

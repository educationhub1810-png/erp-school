import { expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";
import type { Credential } from "./credentials";

// Drive the real login form: pick the role, then either enter
// username + password, or — for Super Admin / School Admin, who have no
// email/password field at all — a freshly computed authenticator code.
export async function login(page: Page, cred: Credential) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /login to dashboard/i })).toBeVisible();

  await page.selectOption("#role", cred.role);

  if (cred.totpSecret) {
    await page.fill("#totp", authenticator.generate(cred.totpSecret));
  } else {
    await page.fill("#username", cred.username);
    await page.fill("#password", cred.password);
  }

  await page.getByRole("button", { name: /login to dashboard/i }).click();
}

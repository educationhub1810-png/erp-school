import { test, expect } from "@playwright/test";
import { byRole } from "./credentials";
import { login } from "./helpers";

test.describe("public mailbox submissions → Super Admin mailbox", () => {
  test("a contact form submission lands in the mailbox and can be read and replied to", async ({ page }) => {
    const unique = `E2E Contact ${Date.now()}`;
    const email = `e2e-contact-${Date.now()}@example.com`;

    await page.goto("/");
    await page.locator("#contact-name").fill(unique);
    await page.locator("#contact-email").fill(email);
    await page.locator("#contact-message").fill("Do you support multiple campuses?");
    await page.locator("#contact").getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/thanks — message received/i)).toBeVisible();

    await login(page, byRole("SUPER_ADMIN"));
    await expect(page).toHaveURL(/\/super-admin\/dashboard/, { timeout: 30_000 });

    await page.goto("/super-admin/mailbox");
    await expect(page.getByText(unique)).toBeVisible();

    await page.getByText(unique).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/do you support multiple campuses\?/i)).toBeVisible();

    // Marked read on open.
    await expect(dialog.getByText("Read")).toBeVisible();

    // Stub the outbound reply email — E2E has no real SMTP inbox to read, so
    // this only proves the UI reflects a sent reply, not real delivery.
    await page.route("**/api/v1/mailbox/*/reply", async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ body: "Yes, we support multiple campuses!" });
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          data: {
            id: "stub-id",
            source: "CONTACT",
            name: unique,
            email,
            phone: null,
            schoolName: null,
            message: "Do you support multiple campuses?",
            status: "REPLIED",
            createdAt: new Date().toISOString(),
            replyCount: 1,
            replies: [{ id: "reply-1", body: "Yes, we support multiple campuses!", sentAt: new Date().toISOString(), sentBy: { name: "Super Admin" } }],
          },
        },
      });
    });

    await page.locator("#mailbox-reply-body").fill("Yes, we support multiple campuses!");
    await dialog.getByRole("button", { name: /send reply/i }).click();

    await expect(dialog.getByText(/yes, we support multiple campuses!/i)).toBeVisible();
    await expect(dialog.getByText("Replied")).toBeVisible();
  });
});

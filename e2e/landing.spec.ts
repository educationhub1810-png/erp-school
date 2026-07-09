import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("shows the marketing page with a Login button that goes to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /run your entire school/i })).toBeVisible();

    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: /login to dashboard/i })).toBeVisible();
  });

  test("submits the demo request form and shows a confirmation", async ({ page }) => {
    await page.goto("/");

    // Stub the backend so this test never sends a real email.
    await page.route("**/api/public/demo-request", async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "9876543210",
        schoolName: "Greenwood High",
      });
      await route.fulfill({ status: 200, json: { success: true, data: { submitted: true } } });
    });

    await page.getByLabel(/full name/i).fill("Jane Doe");
    await page.getByLabel(/^email$/i).fill("jane@example.com");
    await page.getByLabel(/^phone$/i).fill("9876543210");
    await page.getByLabel(/school \/ institution name/i).fill("Greenwood High");
    await page.locator("#request-demo").getByRole("button", { name: /request a demo/i }).click();

    await expect(page.getByText(/thanks — request received/i)).toBeVisible();
  });

  test("redirects a signed-in user away from / to their dashboard", async ({ page }) => {
    // Reuses the login helper's flow inline to avoid an extra import cycle.
    await page.goto("/login");
    await page.selectOption("#role", "SCHOOL_ADMIN");
    await page.fill("#username", "admin@sch001.com");
    await page.fill("#password", "Admin@123");
    await page.getByRole("button", { name: /login to dashboard/i }).click();
    await expect(page).toHaveURL(/\/school-admin\/dashboard/, { timeout: 30_000 });

    await page.goto("/");
    await expect(page).toHaveURL(/\/school-admin\/dashboard/);
  });
});

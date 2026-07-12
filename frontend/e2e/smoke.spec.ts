import { expect, test } from "@playwright/test";

test("homepage renders a section heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("backend health endpoint responds", async ({ request }) => {
  // Served through the dev-server /api proxy — no separate backend URL needed.
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
});

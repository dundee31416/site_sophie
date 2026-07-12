import { expect, test } from "@playwright/test";

// Asserts behavior, not copy: translation strings evolve, the toggle contract doesn't.
test("language toggle switches the page language and persists it", async ({ page }) => {
  await page.goto("/");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  const frenchText = await heading.textContent();

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(heading).not.toHaveText(frenchText ?? "");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => window.localStorage.getItem("lisons.lang"))).toBe("en");

  await page.getByRole("button", { name: "FR", exact: true }).click();
  await expect(heading).toHaveText(frenchText ?? "");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("saved language wins over the browser locale on reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

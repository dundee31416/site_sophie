import { expect, test } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test("rejects bad credentials with a visible error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Nom d'utilisateur").fill("nobody");
  await page.getByLabel("Mot de passe").fill("definitely-wrong");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.locator(".error")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("admin round-trip", () => {
  test.skip(!ADMIN_PASSWORD, "E2E_ADMIN_PASSWORD not set");

  test("logs in with env credentials and logs out", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Nom d'utilisateur").fill(ADMIN_USER);
    await page.getByLabel("Mot de passe").fill(ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/admin\/authors$/);
    await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();

    await page.getByRole("button", { name: "Déconnexion" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Déconnexion" })).not.toBeVisible();
  });
});

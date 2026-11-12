import { test, expect } from "@playwright/test";

// Smoke test: the critical user path through the app.
// Home (catalogue) -> game detail -> vault.

test("home, game detail, and vault render", async ({ page }) => {
  // 1. Home: catalogue loads and game cards are rendered.
  // Target the game cards via data-roving-card so we don't match the
  // Navbar's "Open library menu" button, which also starts with "Open ".
  await page.goto("/");
  await expect(page).toHaveTitle(/GameVault/i);
  const card = page.locator("button[data-roving-card]").first();
  await expect(card).toBeVisible();

  // 2. Game detail: wait for the client-side navigation to /game/<id>
  await Promise.all([page.waitForURL(/\/game\//), card.click()]);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 3. Vault: personal library screen renders its main landmark
  await page.goto("/vault");
  await expect(page.getByRole("main")).toBeVisible();
});

test("release calendar and stats render", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByRole("main")).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByRole("main")).toBeVisible();
});

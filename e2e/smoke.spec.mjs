import { test, expect } from "@playwright/test";

// Smoke test: the critical user path through the app.
// Home (catalogue) -> game detail -> vault, with no console/page errors.

test("home, game detail, and vault render without errors", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  // 1. Home: catalogue loads and game cards are rendered
  await page.goto("/");
  await expect(page).toHaveTitle(/GameVault/i);
  const card = page.getByRole("button", { name: /^Open / }).first();
  await expect(card).toBeVisible();
  await card.click();

  // 2. Game detail: navigating from a card lands on a detail page
  await expect(page).not.toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 3. Vault: personal library screen renders its main landmark
  await page.goto("/vault");
  await expect(page.getByRole("main")).toBeVisible();

  expect(pageErrors, "no uncaught page errors").toEqual([]);
});

test("release calendar and stats render", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByRole("main")).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByRole("main")).toBeVisible();
});

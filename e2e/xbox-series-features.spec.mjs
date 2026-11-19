import { test, expect } from "@playwright/test";

test("Xbox Series game page shows Play Anywhere and Cloud Gaming rows", async ({ page }) => {
  await page.goto("/game/14593");
  const section = page.getByRole("region", { name: /Xbox Series X\|S features/i });
  await expect(section).toBeVisible();
  await expect(section.getByText("Xbox Play Anywhere")).toBeVisible();
  await expect(section.getByText("Xbox Cloud Gaming")).toBeVisible();
});

test("browse cards distinguish Xbox Cloud pill from cloud streaming icon", async ({ page }) => {
  await page.goto("/?platform=Xbox&variant=Xbox%20Series&search=Forza+Horizon+5");
  const forza = page.getByRole("link", { name: "Forza Horizon 5", exact: true }).first();
  await expect(forza).toBeVisible({ timeout: 20_000 });
  await expect(forza.getByText("Xbox Cloud", { exact: true })).toBeVisible();
  await expect(forza.getByLabel(/Cloud streaming available/i)).toBeVisible();
});

test("IGDB-only Xbox Series page resolves Play Anywhere from mocked Display Catalog", async ({ page }) => {
  await page.goto("/game/999999002");
  const section = page.getByRole("region", { name: /Xbox Series X\|S features/i });
  await expect(section).toBeVisible();
  await expect(section.getByText("Xbox Play Anywhere")).toBeVisible();
});

test("rail card Play Anywhere pill is tick-only without ellipsis at 200% zoom", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/?platform=Xbox&variant=Xbox%20Series");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const pill = page.locator("button[data-roving-card]").getByLabel("Xbox Play Anywhere, supported").first();
  await expect(pill).toBeVisible();
  await expect(pill).not.toContainText("Play Any");
  await expect(pill).not.toContainText("…");
  await expect(pill).not.toContainText("Anywhere");
});
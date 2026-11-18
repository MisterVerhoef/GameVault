import { test, expect } from "@playwright/test";

test("Xbox Series game page shows Play Anywhere and Cloud Gaming rows", async ({ page }) => {
  await page.goto("/game/14593");
  const section = page.getByRole("region", { name: /Xbox Series X\|S features/i });
  await expect(section).toBeVisible();
  await expect(section.getByText("Xbox Play Anywhere")).toBeVisible();
  await expect(section.getByText("Xbox Cloud Gaming")).toBeVisible();
});

test("Xbox Series browse cards show feature badges when supported", async ({ page }) => {
  await page.goto("/?platform=Xbox&variant=Xbox%20Series");
  await expect(page.getByTitle("Xbox Cloud Gaming").first()).toBeVisible({ timeout: 20_000 });
});
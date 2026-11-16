import { test, expect } from "@playwright/test";

test("off-catalogue similar games link to live game pages", async ({ page }) => {
  const enrich = page.waitForResponse(
    (response) =>
      response.url().includes("/api/igdb/similar-games") &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.goto("/game/423352");
  await enrich;
  const similar = page.getByRole("link", { name: /Open Soulstone Survivors/i });
  await expect(similar).toBeVisible({ timeout: 20_000 });
  await similar.click();
  await expect(page).toHaveURL(/\/game\/210585$/);
  await expect(page.getByRole("heading", { level: 1, name: /Soulstone Survivors/i })).toBeVisible();
});
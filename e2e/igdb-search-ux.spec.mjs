import { test, expect } from "@playwright/test";

test("live search shows skeleton placeholders while IGDB is delayed", async ({ page }) => {
  await page.route("**/api/igdb/search**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto("/?search=syndicate");
  await expect(page.getByRole("heading", { name: /Search results for "syndicate"/i })).toBeVisible({
    timeout: 20_000,
  });
  const skeletonCards = page.locator('section[aria-labelledby="game-wall-heading"] ul [aria-hidden="true"]');
  await expect(skeletonCards.first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Searching…")).toBeVisible();
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 20_000 });
});

test("IGDB card without cover shows initials placeholder", async ({ page }) => {
  await page.route("**/api/igdb/search**", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    const games = Array.isArray(json.games) ? [...json.games] : [];
    games.push({
      id: "8888777",
      title: "Syndicate Boyfriend: Gem Heist",
      releaseYear: 2026,
      rating: 42,
    });
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      contentType: "application/json",
      body: JSON.stringify({ games }),
    });
  });
  await page.goto("/?search=syndicate%20boyfriend");
  await expect(page.getByRole("heading", { name: /Search results for/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /Syndicate Boyfriend/i })).toBeVisible();
  await expect(page.getByText("SB", { exact: true })).toBeVisible();
});
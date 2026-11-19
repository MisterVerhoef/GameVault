import { test, expect } from "@playwright/test";

test("publisher overview is linked from a catalogue game page", async ({ page }) => {
  await page.goto("/game/405460");
  const publisherLink = page.locator('a[href="/publisher/70"]').first();
  await expect(publisherLink).toBeVisible();
  await publisherLink.click();
  await expect(page).toHaveURL(/\/publisher\/70$/);
  await expect(page.getByRole("heading", { name: "Nintendo", level: 2 })).toBeVisible();
  await expect(page.getByText(/Publisher · /)).toBeVisible();
  await expect(page.getByText(/Showing \d+ of \d+ games?/).first()).toBeVisible();
  await expect(page.getByText(/Nintendo is a publisher with/)).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Ocarina of Time/i }).first()).toBeVisible();
});

test("publisher games wall shows all-shown note after load more", async ({ page }) => {
  await page.goto("/publisher/70");
  const showing = page.getByText(/Showing \d+ of \d+ games?/).first();
  await expect(showing).toBeVisible({ timeout: 30_000 });
  const loadMore = page.getByRole("button", { name: "Load more" });
  const hasLoadMore = await loadMore.isVisible().catch(() => false);
  if (!hasLoadMore) {
    test.skip(true, "Publisher catalogue has fewer than 49 games in this environment.");
  }
  await loadMore.click();
  while (await loadMore.isVisible().catch(() => false)) {
    await loadMore.click();
  }
  await expect(page.getByText(/^All \d[\d,]* games? shown$/).first()).toBeVisible();
});

test("unknown publisher ids return not found", async ({ page }) => {
  const response = await page.goto("/publisher/not-a-real-id");
  expect(response?.status()).toBe(404);
});
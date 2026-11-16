import { test, expect } from "@playwright/test";

const MOCK_QUERY = "vaultmockexclusief";

test("live IGDB search merges results into the search wall", async ({ page }) => {
  await page.goto(`/?search=${encodeURIComponent(MOCK_QUERY)}`);
  await expect(page.getByRole("heading", { name: /Search results for/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: /Vault Mock Exclusief Spel/i })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("link", { name: /Vault Mock Exclusief Spel/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Vault Mock Exclusief Spel/i })).toBeVisible();
});

test("searching syndicate shows the 2012 Syndicate from IGDB beside catalogue hits", async ({ page }) => {
  const liveSearch = page.waitForResponse(
    (response) => response.url().includes("/api/igdb/search") && response.ok(),
    { timeout: 20_000 },
  );
  await page.goto("/?search=syndicate");
  await expect(page.getByRole("heading", { name: /Search results for "syndicate"/i })).toBeVisible({
    timeout: 20_000,
  });
  await liveSearch.catch(() => {});
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 20_000 });

  await expect(page.getByRole("link", { name: "Syndicate (1993)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Syndicate (2012)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Syndicate (1993)" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Syndicate: American Revolt/i })).toBeVisible();
});
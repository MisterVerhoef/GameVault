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
  await page.goto("/?search=syndicate");
  await expect(page.getByRole("heading", { name: /Search results for "syndicate"/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: /^Syndicate$/i }).first()).toBeVisible();
  const links = page.getByRole("link", { name: /^Syndicate$/i });
  await expect(links).toHaveCount(2, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /Syndicate: American Revolt/i })).toBeVisible();
});
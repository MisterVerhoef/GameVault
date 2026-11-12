import { test, expect } from "@playwright/test";

const MOCK_QUERY = "vaultmockexclusief";

test("live IGDB search shows results outside the catalogue", async ({
  page,
}) => {
  await page.goto(`/?search=${encodeURIComponent(MOCK_QUERY)}`);
  await expect(page.getByRole("heading", { name: "Meer op IGDB" })).toBeVisible(
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("link", { name: /Vault Mock Exclusief Spel/i }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Vault Mock Exclusief Spel/i }).click();
  await expect(page.getByText("Niet in catalogus")).toBeVisible();
  await expect(
    page.getByText(/Prijzen en vault nog niet beschikbaar/i),
  ).toBeVisible();
});

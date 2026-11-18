import { test, expect } from "@playwright/test";

test("IGDB-only game page shows screenshots and trailers from the mock fixture", async ({ page }) => {
  await page.goto("/game/999999001");
  await expect(page.getByRole("heading", { level: 1, name: /Vault Mock Exclusief Spel/i })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Screenshots" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open full-size Vault Mock Exclusief Spel screenshot/i })).toHaveCount(2);

  await expect(page.getByRole("heading", { name: "Trailers" })).toBeVisible();
  const trailerLink = page.getByRole("link", {
    name: /Watch Launch trailer on YouTube \(opens in new tab\)/i,
  });
  await expect(trailerLink).toBeVisible();
  await expect(trailerLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(trailerLink.getByTestId("external-link-indicator")).toBeVisible();
});
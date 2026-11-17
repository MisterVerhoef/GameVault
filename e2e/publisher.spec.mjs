import { test, expect } from "@playwright/test";

test("publisher overview is linked from a catalogue game page", async ({ page }) => {
  await page.goto("/game/405460");
  const publisherLink = page.locator('a[href="/publisher/70"]').first();
  await expect(publisherLink).toBeVisible();
  await publisherLink.click();
  await expect(page).toHaveURL(/\/publisher\/70$/);
  await expect(page.getByRole("heading", { name: "Nintendo", level: 2 })).toBeVisible();
  await expect(page.getByText(/Publisher · /)).toBeVisible();
  await expect(page.getByRole("link", { name: /Ocarina of Time/i }).first()).toBeVisible();
});

test("unknown publisher ids return not found", async ({ page }) => {
  const response = await page.goto("/publisher/not-a-real-id");
  expect(response?.status()).toBe(404);
});
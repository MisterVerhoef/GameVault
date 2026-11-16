import { test, expect } from "@playwright/test";

test("homepage hero cover keeps a 3:4 aspect ratio at 1440px", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 900 });
  const cover = page.locator('a[aria-label^="Open"][aria-label$="details"]').first();
  await expect(cover).toBeVisible({ timeout: 15_000 });
  await cover.scrollIntoViewIfNeeded();
  const box = await cover.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const ratio = box.width / box.height;
    expect(Math.abs(ratio - 0.75)).toBeLessThanOrEqual(0.02);
    expect(box.height).toBeLessThanOrEqual(564.5);
  }
});
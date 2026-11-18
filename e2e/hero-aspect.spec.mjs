import { test, expect } from "@playwright/test";

function heroCoverLink(page) {
  return page
    .locator("section.relative.mb-10")
    .first()
    .getByRole("link", { name: / details$/ });
}

test("homepage hero cover keeps a 3:4 aspect ratio at 1440px", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("heading", { name: "Featured Games", exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForLoadState("networkidle");

  await expect(async () => {
    const cover = heroCoverLink(page);
    await expect(cover).toBeVisible();
    await cover.scrollIntoViewIfNeeded();
    const box = await cover.boundingBox();
    expect(box).not.toBeNull();
    const ratio = box.width / box.height;
    expect(Math.abs(ratio - 0.75)).toBeLessThanOrEqual(0.02);
    expect(box.height).toBeLessThanOrEqual(564.5);
  }).toPass({ timeout: 15_000 });
});
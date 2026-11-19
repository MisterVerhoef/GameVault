import { test, expect } from "@playwright/test";

const DESKTOP_WIDTHS = [1280, 1440, 1920];

async function controlsTop(page) {
  const controls = page.getByRole("region", { name: "Deal controls" });
  await expect(controls).toBeVisible();
  const box = await controls.boundingBox();
  expect(box).toBeTruthy();
  return box.y;
}

async function firstCardTop(page) {
  const card = page.locator("main article").first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box).toBeTruthy();
  return box.y;
}

test("deal controls and grid top match between Xbox and PlayStation at desktop widths", async ({ page }) => {
  for (const width of DESKTOP_WIDTHS) {
    await page.setViewportSize({ width, height: 1080 });

    await page.goto("/deals", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Xbox deals", exact: true })).toBeVisible();
    const xboxControlsY = await controlsTop(page);
    const xboxCardY = await firstCardTop(page);

    await page.goto("/deals?platform=ps", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "PlayStation deals", exact: true })).toBeVisible();
    const psControlsY = await controlsTop(page);
    const psCardY = await firstCardTop(page);

    expect(psControlsY, `controls row at ${width}px`).toBeCloseTo(xboxControlsY, 1);
    expect(psCardY, `first deal card at ${width}px`).toBeCloseTo(xboxCardY, 1);
  }
});

test("deals platform tabs stay within the viewport on narrow mobile", async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  for (const path of ["/deals", "/deals?platform=ps"]) {
    await page.goto(path, { waitUntil: "load" });
    await expect(page.getByRole("region", { name: "Deal controls" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
import { test, expect } from "@playwright/test";

async function readSearchTitles(page) {
  return page
    .locator('section[aria-labelledby="game-wall-heading"] a[data-roving-card] span.line-clamp-2')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
}

test("single click on a search result opens the game page", async ({ page }) => {
  await page.goto("/?search=syndicate");
  await expect(page.getByRole("heading", { name: /Search results for "syndicate"/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 30_000 });
  const card = page.getByRole("link", { name: /Syndicate \(1993\)/i }).first();
  await expect(card).toBeVisible();
  const href = await card.getAttribute("href");
  expect(href).toMatch(/^\/game\/\d+$/);
  await Promise.all([page.waitForURL(href), card.click()]);
  expect(page.url()).toContain(href ?? "");
});

test("search result order stays stable after live search completes", async ({ page }) => {
  await page.route("**/api/igdb/search**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.goto("/?search=zelda");
  await expect(page.getByRole("heading", { name: /Search results for "zelda"/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 30_000 });
  const orderAfterLoad = await readSearchTitles(page);
  expect(orderAfterLoad.length).toBeGreaterThan(0);
  await page.waitForTimeout(1200);
  await expect.poll(() => readSearchTitles(page)).toEqual(orderAfterLoad);
});

test("deals load-more grows the visible grid by 48", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/deals");
  await expect(page.getByRole("heading", { name: "Xbox deals" })).toBeVisible({ timeout: 30_000 });
  const showing = page.getByRole("region", { name: "Deal controls" }).getByText(/Showing \d+ of \d+ deals/);
  await expect(showing).toBeVisible();
  const total = Number.parseInt((await showing.textContent())?.match(/of (\d+) deals/)?.[1] ?? "0", 10);
  test.skip(total <= 48, "E2E deals fixture needs more than 48 rows for pagination coverage.");
  const grid = page.locator("main article");
  await expect(grid).toHaveCount(48, { timeout: 30_000 });
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(grid).toHaveCount(96, { timeout: 15_000 });
  await expect(page.getByText(/Showing 96 of \d+ deals/)).toBeVisible();
});

test("light-mode active Deals pill matches sub-bar muted background", async ({ page }) => {
  await page.addInitScript(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/deals");
  const dealsLink = page.getByRole("banner").locator('a[href="/deals"][aria-current="page"]');
  await expect(dealsLink).toBeVisible();
  const pill = await dealsLink.evaluate((node) => {
    const styles = getComputedStyle(node);
    return {
      backgroundColor: styles.backgroundColor,
      fontWeight: styles.fontWeight,
    };
  });
  expect(Number.parseInt(pill.fontWeight, 10)).toBeGreaterThanOrEqual(500);
  expect(pill.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
});
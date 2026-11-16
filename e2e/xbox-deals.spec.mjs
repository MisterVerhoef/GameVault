import { test, expect } from "@playwright/test";

test("Xbox family shows Deals to the right of Original Xbox", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?family=Xbox");
  const breakdown = page.locator('[aria-label="Xbox platform breakdown"]');
  await expect(breakdown).toBeVisible();
  const original = breakdown.getByRole("button", { name: /Original Xbox/i });
  const deals = breakdown.getByRole("link", { name: "Deals", exact: true });
  await expect(original).toBeVisible();
  await expect(deals).toBeVisible();
  const positions = await page.evaluate(() => {
    const bar = document.querySelector('[aria-label="Xbox platform breakdown"]');
    const originalBtn = [...bar.querySelectorAll("button")].find((node) => node.textContent?.includes("Original Xbox"));
    const dealsLink = bar.querySelector('a[href="/deals"]');
    return {
      originalRight: originalBtn?.getBoundingClientRect().right ?? 0,
      dealsLeft: dealsLink?.getBoundingClientRect().left ?? 0,
    };
  });
  expect(positions.dealsLeft).toBeGreaterThan(positions.originalRight);
});

test("deals page renders, filters and sorts mocked deals", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByRole("heading", { name: "Xbox deals", exact: true })).toBeVisible();
  const countLine = page.getByRole("region", { name: "Deal controls" }).getByText("Showing 3 of 3 deals");
  await expect(countLine).toBeVisible();
  await expect(page.getByText("Alpha Deal Game")).toBeVisible();

  await page.getByRole("button", { name: "DLC", exact: true }).click();
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 1 of 3 deals")).toBeVisible();
  await expect(page.getByText("Bravo DLC Pack")).toBeVisible();
  await expect(page.getByText("Alpha Deal Game")).toHaveCount(0);

  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.locator("#xbox-deals-sort").selectOption("price-asc");
  const titles = await page.locator("article h3").allTextContents();
  expect(titles[0]).toMatch(/Charlie/);
});
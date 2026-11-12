import { test, expect } from "@playwright/test";

async function pageOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const HERO_WIDTHS = [1024, 1090, 1280, 1366, 1440, 1525, 1600];

test("homepage hero stays within the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("section h1").first()).toBeVisible();

  for (const width of HERO_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const h1 = document.querySelector("section h1");
      const next = [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === "Next featured title");
      const h1Box = h1?.getBoundingClientRect();
      const nextBox = next?.getBoundingClientRect();
      return {
        overflow: doc.scrollWidth - doc.clientWidth,
        h1Right: h1Box?.right ?? 0,
        nextRight: nextBox?.right ?? 0,
        viewport: doc.clientWidth,
      };
    });

    expect(metrics.overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  if (metrics.h1Right > 0) {
      expect(metrics.h1Right, `hero title clipped at ${width}px`).toBeLessThanOrEqual(metrics.viewport + 0.5);
    }
    if (metrics.nextRight > 0) {
      expect(metrics.nextRight, `hero next control clipped at ${width}px`).toBeLessThanOrEqual(metrics.viewport + 0.5);
    }
  }
});

test("genre carousel cards align with row headings", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("heading", { name: "Action", exact: true })).toBeVisible();

  const rows = await page.evaluate(() => {
    return [...document.querySelectorAll("section[aria-labelledby]")]
      .filter((section) => {
        const title = section.querySelector("h2")?.textContent?.trim();
        return title && title !== "Featured Games";
      })
      .map((section) => {
        const heading = section.querySelector("h2")?.getBoundingClientRect();
        const card = section.querySelector("button[data-roving-card]")?.getBoundingClientRect();
        return {
          title: section.querySelector("h2")?.textContent?.trim(),
          headingX: heading?.x ?? 0,
          cardX: card?.x ?? 0,
        };
      });
  });

  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(Math.abs(row.cardX - row.headingX), `${row.title} card inset`).toBeLessThanOrEqual(2);
  }
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
});

test("game detail store prices mark the lowest current offer", async ({ page }) => {
  await page.goto("/game/1877");
  await expect(page.getByText("Lowest", { exact: true }).first()).toBeVisible();
  const lowestCount = await page.getByText("Lowest", { exact: true }).count();
  expect(lowestCount).toBeGreaterThanOrEqual(1);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
});

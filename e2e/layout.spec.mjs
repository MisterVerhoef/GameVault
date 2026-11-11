import { test, expect } from "@playwright/test";

async function pageOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test("header does not overflow and keeps both bars intact", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();

  for (const width of [320, 480, 600, 700, 768, 900, 1024, 1100, 1200, 1280, 1366, 1440, 1536, 1600]) {
    await page.setViewportSize({ width, height: 800 });
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const nav = document.querySelector('nav[aria-label="Main"]');
      const menu = document.querySelector('button[aria-label="Menu"]');
      const logo = document.querySelector('a[aria-label="GameVault home"]')?.getBoundingClientRect();
      const discover = [...document.querySelectorAll('nav[aria-label="Main"] a')]
        .find((link) => link.textContent.trim() === "Discover")
        ?.getBoundingClientRect();
      const navVisible = Boolean(nav && getComputedStyle(nav).display !== "none");
      const discoverVisible = Boolean(discover && discover.width > 0 && discover.height > 0);
      let overlap = false;
      if (logo && discover && discoverVisible) {
        overlap = !(
          logo.right <= discover.left + 0.5
          || discover.right <= logo.left + 0.5
          || logo.bottom <= discover.top
          || discover.bottom <= logo.top
        );
      }
      return {
        overflow: doc.scrollWidth - doc.clientWidth,
        navVisible,
        discoverVisible,
        menuVisible: Boolean(menu && getComputedStyle(menu).display !== "none"),
        overlap,
        logoWidth: logo ? logo.width : 0,
      };
    });

    expect(metrics.overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    if (width >= 1024) {
      expect(metrics.navVisible, `desktop nav at ${width}px`).toBe(true);
      expect(metrics.discoverVisible, `Discover at ${width}px`).toBe(true);
      expect(metrics.menuVisible, `hamburger at ${width}px`).toBe(false);
      expect(metrics.overlap, `logo overlaps Discover at ${width}px`).toBe(false);
      expect(metrics.logoWidth, `logo collapsed at ${width}px`).toBeGreaterThan(120);
    } else {
      expect(metrics.menuVisible, `compact menu at ${width}px`).toBe(true);
      expect(metrics.navVisible, `desktop nav at ${width}px`).toBe(false);
    }
  }

  await page.setViewportSize({ width: 700, height: 800 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const mobile = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobile.getByRole("link", { name: "Discover" })).toBeVisible();
  await expect(mobile.getByRole("button", { name: "PlayStation" })).toBeVisible();
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
});

for (const theme of ["light", "dark"]) {
  test(`wishlist prices compare in two columns (${theme})`, async ({ page }) => {
    await page.addInitScript((storedTheme) => {
      localStorage.setItem("gamevault.library.v1", JSON.stringify({
        "1877": { status: "wishlist", progress: 0, updatedAt: "2026-11-10T00:00:00.000Z" },
      }));
      localStorage.setItem("gamevault-theme", storedTheme);
    }, theme);
    await page.setViewportSize({ width: theme === "light" ? 390 : 420, height: 900 });
    await page.goto("/vault?status=wishlist");
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));

    const prices = page.getByRole("list", { name: "Cyberpunk 2077 store prices" });
    await expect(prices).toBeVisible();
    await expect(prices.getByRole("listitem")).toHaveCount(5);
    const lowest = prices.getByRole("link", { name: /Lowest current price/ });
    await expect(lowest).toBeVisible();
    await expect(lowest.getByText("Lowest", { exact: true })).toBeVisible();
    await expect(lowest.locator(".tabular-nums")).toHaveText(/49,99/);
    await expect(prices.getByText(/Lowest recorded/)).toHaveCount(4);
    await expect(prices.getByText("Price unavailable")).toBeVisible();

    const boxes = await prices.getByRole("listitem").evaluateAll((items) =>
      items.slice(0, 2).map((item) => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width };
      }),
    );
    expect(Math.abs(boxes[0].y - boxes[1].y), "prices share a row").toBeLessThan(8);
    expect(boxes[1].x, "second price sits to the right").toBeGreaterThan(boxes[0].x + boxes[0].width * 0.5);

    const cover = await page.locator('[data-card-id="1877"]').boundingBox();
    const listBox = await prices.boundingBox();
    expect(cover).toBeTruthy();
    expect(listBox).toBeTruthy();
    expect(listBox.width).toBeGreaterThan(cover.width + 24);

    const priceColor = await lowest.locator(".tabular-nums").evaluate((element) => getComputedStyle(element).color);
    const background = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(priceColor).not.toBe(background);
    if (theme === "light") expect(priceColor).toBe("rgb(24, 24, 27)");
    if (theme === "dark") expect(priceColor).toBe("rgb(244, 244, 245)");
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
  });
}

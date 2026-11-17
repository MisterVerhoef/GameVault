import { test, expect } from "@playwright/test";

function clipAround(box, pad = 12) {
  return {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
}

async function accentRingPixelsDelta(page, buttonLocator, beforeBytes, afterBytes) {
  return page.evaluate(async ({ beforePng, afterPng }) => {
    const load = (bytes) => new Promise((resolve) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(ctx.getImageData(0, 0, img.width, img.height).data);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
    const before = await load(beforePng);
    const after = await load(afterPng);
    if (!before || !after || before.length !== after.length) return 0;
    let blueRingHits = 0;
    let changed = 0;
    for (let i = 0; i < after.length; i += 4) {
      const [br, bg, bb] = [before[i], before[i + 1], before[i + 2]];
      const [ar, ag, ab, aa] = [after[i], after[i + 1], after[i + 2], after[i + 3]];
      const delta = Math.abs(br - ar) + Math.abs(bg - ag) + Math.abs(bb - ab);
      if (delta > 18) {
        changed += 1;
        if (aa > 200 && ab > ar + 35 && ab > 140 && ag > 70) blueRingHits += 1;
      }
    }
    return { blueRingHits, changed };
  }, { beforePng: [...beforeBytes], afterPng: [...afterBytes] });
}

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

test("deals page nav highlights Deals only in sub-bar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/deals");
  const mainNav = page.getByRole("navigation", { name: "Main" });
  await expect(mainNav.getByRole("link", { name: "Discover" })).not.toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("banner").getByLabel("Xbox platform breakdown")).toBeVisible();
  const dealsLink = page.getByRole("banner").locator('a[href="/deals"][aria-current="page"]');
  await expect(dealsLink).toBeVisible();
});

test("deals page renders, filters and sorts mocked deals", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByRole("heading", { name: "Xbox deals", exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Deal controls" }).getByText(/Showing \d+ of \d+ deals?/),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alpha Deal Game" }).first()).toBeVisible();

  await page.getByRole("button", { name: "DLC", exact: true }).click();
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 1 of 1 deal")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bravo DLC Pack" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alpha Deal Game" })).toHaveCount(0);

  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByLabel("Sort").selectOption("price-asc");
  const titles = await page.locator("article h3").allTextContents();
  expect(titles[0]).toMatch(/Charlie/);

  await page.getByRole("button", { name: "Publisher", exact: true }).click();
  await page.getByRole("option", { name: /Alpha Interactive/ }).locator('input[type="checkbox"]').check();
  await expect(page).toHaveURL(/publisher=alpha-interactive/);
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 2 of 2 deals")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bravo DLC Pack" })).toHaveCount(0);
});

test("fresh navigation renders deals immediately without client-side follow-up", async ({ page }) => {
  const response = await page.goto("/deals", { waitUntil: "load" });
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Xbox deals", exact: true })).toBeVisible();
  await expect(page.locator("main article").first()).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Deal controls" }).getByText(/Showing \d+ of \d+ deals?/),
  ).toBeVisible();
});

test("deals omits all-shown note when everything fits the first page", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByRole("heading", { name: "Xbox deals", exact: true })).toBeVisible();
  await expect(page.getByText(/^All \d+ deals? shown$/)).toHaveCount(0);
});

test("fresh load with publisher query renders filtered deals", async ({ page }) => {
  await page.goto("/deals?publisher=alpha-interactive", { waitUntil: "load" });
  await expect(page.getByRole("button", { name: "Publisher", exact: true })).toContainText("1 publisher selected");
  await expect(page.getByRole("button", { name: "Remove Alpha Interactive" })).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 2 of 2 deals")).toBeVisible();
});

test("multi-publisher filter uses OR logic and updates URL", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "Publisher", exact: true }).click();
  await page.getByRole("option", { name: /Alpha Interactive/ }).locator('input[type="checkbox"]').check();
  await page.getByRole("option", { name: /Bravo Publishing/ }).locator('input[type="checkbox"]').check();
  await expect(page).toHaveURL(/publisher=alpha-interactive%2Cbravo-publishing|publisher=alpha-interactive,bravo-publishing/);
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 3 of 3 deals")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remove Alpha Interactive" }).click();
  await expect(page).toHaveURL(/publisher=bravo-publishing/);
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 1 of 1 deal")).toBeVisible();
});

test("fresh load with comma-separated publisher query renders combined list", async ({ page }) => {
  await page.goto("/deals?publisher=alpha-interactive,bravo-publishing", { waitUntil: "load" });
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 3 of 3 deals")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Alpha Interactive" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Bravo Publishing" })).toBeVisible();
});

test("publisher panel overlay does not shift deal controls", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/deals");
  const controls = page.getByRole("region", { name: "Deal controls" });
  const before = await controls.boundingBox();
  expect(before).toBeTruthy();
  await page.getByRole("button", { name: "Publisher", exact: true }).click();
  const after = await controls.boundingBox();
  expect(after).toBeTruthy();
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  await page.keyboard.press("Escape");
});

test("publisher chip removal moves focus for consecutive keyboard dismissals", async ({ page }) => {
  await page.goto("/deals?publisher=alpha-interactive,bravo-publishing,delta-studios", { waitUntil: "load" });
  const removeAlpha = page.getByRole("button", { name: "Remove Alpha Interactive" });
  const removeBravo = page.getByRole("button", { name: "Remove Bravo Publishing" });
  const removeDelta = page.getByRole("button", { name: "Remove Delta Studios" });
  const publisherTrigger = page.getByRole("button", { name: "Publisher", exact: true });

  await removeAlpha.focus();
  await page.keyboard.press("Enter");
  await expect(removeBravo).toBeFocused();

  await page.keyboard.press(" ");
  await expect(removeDelta).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(publisherTrigger).toBeFocused();
  await expect(page).toHaveURL(/^[^?]*\/deals$/);
});

test("type filter pills show visible accent focus ring", async ({ page }) => {
  await page.addInitScript(() => {
    document.documentElement.classList.add("dark");
  });
  await page.goto("/deals");
  const gamesButton = page.getByRole("button", { name: "Games", exact: true });
  const box = await gamesButton.boundingBox();
  expect(box).toBeTruthy();
  const clip = clipAround(box);
  await page.getByRole("button", { name: "All", exact: true }).focus();
  const beforeShot = await page.screenshot({ type: "png", clip });
  await page.keyboard.press("Tab");
  await expect(gamesButton).toBeFocused();
  const afterShot = await page.screenshot({ type: "png", clip });
  const { blueRingHits, changed } = await accentRingPixelsDelta(page, gamesButton, beforeShot, afterShot);
  expect(changed, "pixel diff around Games filter when focus-visible").toBeGreaterThanOrEqual(24);
  expect(blueRingHits, "new blue focus-ring pixels in screenshot diff").toBeGreaterThanOrEqual(4);
});
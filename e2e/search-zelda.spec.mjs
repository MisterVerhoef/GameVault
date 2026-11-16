import { test, expect } from "@playwright/test";

test("Zelda search shows one card per grouped title in catalogue results", async ({ page }) => {
  const liveSearch = page.waitForResponse(
    (response) => response.url().includes("/api/igdb/search") && response.ok(),
    { timeout: 20_000 },
  );
  await page.goto("/?search=Zelda");
  await expect(page.getByRole("heading", { name: /Search results for "Zelda"/i })).toBeVisible({
    timeout: 30_000,
  });
  await liveSearch.catch(() => {});
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 20_000 });

  const titles = await page.locator('section[aria-labelledby="game-wall-heading"] a[data-roving-card] span.line-clamp-2').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
  );
  const normalized = titles.map((title) => title.trim().toLowerCase());
  const seen = new Set();
  for (const title of normalized) {
    expect(seen.has(title), `duplicate search card title: ${title}`).toBe(false);
    seen.add(title);
  }

  const mustInclude = [
    "the legend of zelda: breath of the wild",
    "the legend of zelda: tears of the kingdom",
    "the legend of zelda: a link to the past",
  ];
  for (const title of mustInclude) {
    expect(normalized.some((entry) => entry.includes(title)), `missing ${title}`).toBe(true);
  }

  const hyruleIndex = normalized.findIndex((entry) => entry.includes("hyrule warriors"));
  const botwIndex = normalized.findIndex((entry) => entry.includes("breath of the wild"));
  const soulIndex = normalized.findIndex((entry) => entry.includes("soulcalibur"));
  if (hyruleIndex >= 0 && botwIndex >= 0) {
    expect(hyruleIndex, "Hyrule Warriors should rank after title matches").toBeGreaterThan(botwIndex);
  }
  if (hyruleIndex >= 0 && soulIndex >= 0) {
    expect(hyruleIndex, "Hyrule Warriors should rank ahead of summary-only Zelda hits").toBeLessThan(soulIndex);
  }

  const duplicateEditions = [
    "the legend of zelda: breath of the wild - nintendo switch 2 edition",
    "the legend of zelda: tears of the kingdom - nintendo switch 2 edition",
  ];
  for (const title of duplicateEditions) {
    expect(normalized.some((entry) => entry.includes(title)), `should group ${title}`).toBe(false);
  }
});
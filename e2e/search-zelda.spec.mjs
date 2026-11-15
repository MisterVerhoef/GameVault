import { test, expect } from "@playwright/test";

test("Zelda search shows one card per grouped title in catalogue results", async ({ page }) => {
  await page.goto("/?search=Zelda");
  await expect(page.getByRole("heading", { name: /Search results for "Zelda"/i })).toBeVisible({
    timeout: 30_000,
  });

  const titles = await page.locator("main ul a span.line-clamp-2").evaluateAll((nodes) =>
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

  const duplicateEditions = [
    "the legend of zelda: breath of the wild - nintendo switch 2 edition",
    "the legend of zelda: tears of the kingdom - nintendo switch 2 edition",
  ];
  for (const title of duplicateEditions) {
    expect(normalized.some((entry) => entry.includes(title)), `should group ${title}`).toBe(false);
  }
});
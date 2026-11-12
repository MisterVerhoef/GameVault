import { test, expect } from "@playwright/test";

function isCatalogueRequest(url) {
  return (
    url.includes("/catalog/browse-index.json") ||
    url.includes("/catalog/search-index.json")
  );
}

test("home paints without the catalogue, then search loads it", async ({
  page,
}) => {
  const catalogueRequests = [];
  page.on("request", (request) => {
    if (isCatalogueRequest(request.url()))
      catalogueRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.locator("button[data-roving-card]").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(catalogueRequests).toEqual([]);

  const searchIndex = page.waitForResponse(
    (response) =>
      response.url().includes("/catalog/search-index.json") && response.ok(),
  );
  await page.locator("#navbar-search").focus();
  await searchIndex;
  await page.locator("#navbar-search").fill("baldur");
  await expect(
    page.getByRole("heading", { level: 1, name: /Search results/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Baldur's Gate III/i }).first(),
  ).toBeVisible();
});

test("arrow keys still move between home cards", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator("button[data-roving-card]");
  await expect(cards.first()).toBeVisible();
  await cards.first().focus();
  const first = await cards.first().getAttribute("data-card-id");
  await page.keyboard.press("ArrowRight");
  const active = await page.evaluate(() =>
    document.activeElement?.getAttribute("data-card-id"),
  );
  expect(active).toBeTruthy();
  expect(active).not.toBe(first);
});

test("a saved playing title loads the browse index only", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "gamevault.library.v1",
      JSON.stringify({
        119171: {
          status: "playing",
          progress: 10,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
  });
  const hits = [];
  page.on("request", (request) => {
    if (request.url().includes("/catalog/")) hits.push(request.url());
  });
  await page.goto("/");
  await page.waitForResponse(
    (response) =>
      response.url().includes("/catalog/browse-index.json") && response.ok(),
  );
  await page.waitForLoadState("networkidle");
  expect(hits.some((url) => url.includes("browse-index.json"))).toBe(true);
  expect(hits.some((url) => url.includes("search-index.json"))).toBe(false);
});

import { test, expect } from "@playwright/test";

const SEARCH_CARD =
  'section[aria-labelledby="game-wall-heading"] button[data-roving-card], section[aria-labelledby="game-wall-games"] button[data-roving-card]';

async function searchCardTitles(page) {
  return page.locator(`${SEARCH_CARD} span.line-clamp-2`).evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
  );
}

test("single mouse click on a search card opens the game page", async ({ page }) => {
  await page.goto("/?search=syndicate");
  await expect(page.getByRole("heading", { name: /Search results for "syndicate"/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 20_000 });

  const card = page.getByRole("button", { name: "Syndicate (1993)" });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/game\/49$/);
});

test("search result order does not change after loading finishes", async ({ page }) => {
  await page.route("**/api/igdb/search**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });

  const liveSearch = page.waitForResponse(
    (response) => response.url().includes("/api/igdb/search") && response.ok(),
    { timeout: 25_000 },
  );

  await page.goto("/?search=zelda");
  await expect(page.getByRole("heading", { name: /Search results for "zelda"/i })).toBeVisible({
    timeout: 25_000,
  });

  await expect(page.getByRole("button", { name: /Breath of the Wild/i }).first()).toBeVisible({
    timeout: 25_000,
  });
  const orderAfterFirstResults = await searchCardTitles(page);

  await liveSearch.catch(() => {});
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 25_000 });

  const orderAfterIdle = await searchCardTitles(page);
  expect(orderAfterIdle).toEqual(orderAfterFirstResults);
});

test("arrow keys and Enter open a focused search card", async ({ page }) => {
  await page.goto("/?search=syndicate");
  await expect(page.getByText("Searching…")).toHaveCount(0, { timeout: 20_000 });

  const first = page.locator(SEARCH_CARD).first();
  await expect(first).toBeVisible();
  await first.focus();
  await expect(first).toBeFocused();

  const firstId = await first.getAttribute("data-card-id");
  await page.keyboard.press("ArrowRight");
  const activeId = await page.evaluate(
    () => document.activeElement?.getAttribute("data-card-id") ?? "",
  );
  expect(activeId, "arrow key should move roving focus").toBeTruthy();
  expect(activeId).not.toBe(firstId ?? "");

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/game\/\d+$/);
});
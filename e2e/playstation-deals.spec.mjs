import { test, expect } from "@playwright/test";

const storePlatform = (page) => page.getByTestId("deals-store-platform");

test("platform links switch URL and PlayStation deals render", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByRole("heading", { name: "Xbox deals", exact: true })).toBeVisible();
  const xboxPlatformLink = storePlatform(page).locator('a[href="/deals"]');
  const psPlatformLink = storePlatform(page).locator('a[href*="platform=ps"]');
  await expect(xboxPlatformLink).toHaveAttribute("aria-current", "page");

  await psPlatformLink.click();
  await expect(page).toHaveURL(/platform=ps/);
  await expect(psPlatformLink).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "PlayStation deals", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alpha PS Deal" }).first()).toBeVisible();
});

test("PlayStation deal card shows PS Plus line and platform tags", async ({ page }) => {
  await page.goto("/deals?platform=ps");
  const plusCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Charlie Plus Price" }) });
  await expect(plusCard.getByText(/PS Plus/)).toBeVisible();
  await expect(plusCard.getByText(/€\s*9,99/)).toBeVisible();
  await expect(plusCard.getByText("PS4", { exact: true })).toBeVisible();

  const alphaCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Alpha PS Deal" }) });
  await expect(alphaCard.getByText("PS4", { exact: true })).toBeVisible();
  await expect(alphaCard.getByText("PS5", { exact: true })).toBeVisible();
});

test("catalogue-linked PlayStation deal stays internal; others link to store", async ({ page }) => {
  await page.goto("/deals?platform=ps");
  const internal = page.getByRole("link", { name: /Alpha PS Deal.*Open in GameVault/i });
  await expect(internal).toHaveAttribute("href", "/game/42");
  const external = page.getByRole("link", { name: /Bravo PS DLC on PlayStation Store \(opens in new tab\)/i });
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external.getByTestId("external-link-indicator")).toBeVisible();
});

test("switching to PlayStation drops Xbox-only publisher filters with a notice", async ({ page }) => {
  await page.goto("/deals?publisher=delta-studios");
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 1 of 1 deal")).toBeVisible();
  await storePlatform(page).locator('a[href*="platform=ps"]').click();
  await expect(page).toHaveURL(/platform=ps/);
  await expect(page).toHaveURL(/xbox_publisher=delta-studios/);
  expect(new URL(page.url()).searchParams.get("publisher")).toBeNull();
  await expect(page.getByRole("status")).toContainText("1 filter didn't apply to PlayStation");
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText(/Showing \d+ of 3 deals/)).toBeVisible();
});

test("switching back to Xbox restores stashed publisher filters", async ({ page }) => {
  await page.goto("/deals?publisher=delta-studios");
  await storePlatform(page).locator('a[href*="platform=ps"]').click();
  await expect(page).toHaveURL(/xbox_publisher=delta-studios/);
  await storePlatform(page).getByRole("link", { name: "Xbox", exact: true }).click();
  await expect(page).toHaveURL(/publisher=delta-studios/);
  await expect(page).not.toHaveURL(/xbox_publisher=/);
  await expect(page.getByRole("region", { name: "Deal controls" }).getByText("Showing 1 of 1 deal")).toBeVisible();
});

test("PlayStation family sub-bar links to PlayStation deals", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?family=PlayStation");
  const breakdown = page.locator('[aria-label="PlayStation platform breakdown"]');
  const deals = breakdown.getByRole("link", { name: "Deals", exact: true });
  await expect(deals).toHaveAttribute("href", "/deals?platform=ps");
  const ps5 = breakdown.getByRole("button", { name: /^PS5$/i });
  const positions = await page.evaluate(() => {
    const bar = document.querySelector('[aria-label="PlayStation platform breakdown"]');
    const lastVariant = bar?.querySelector("button:last-of-type");
    const dealsLink = bar?.querySelector('a[href="/deals?platform=ps"]');
    return {
      variantRight: lastVariant?.getBoundingClientRect().right ?? 0,
      dealsLeft: dealsLink?.getBoundingClientRect().left ?? 0,
    };
  });
  await expect(ps5).toBeVisible();
  await expect(deals).toBeVisible();
  expect(positions.dealsLeft).toBeGreaterThan(positions.variantRight);
});

test("unavailable PlayStation deals show last-updated fallback message", async ({ page }) => {
  await page.goto("/deals?platform=ps&e2e_ps_fixture=unavailable");
  await expect(page.getByText(/Deals temporarily unavailable/i)).toBeVisible();
  await expect(page.getByText(/last updated/i)).toBeVisible();
  await expect(storePlatform(page).locator('a[href*="platform=ps"]')).toHaveAttribute("aria-current", "page");
});
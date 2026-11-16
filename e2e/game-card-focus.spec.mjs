import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function focusFeaturedCardWithKeyboard(page, theme) {
  await page.addInitScript((themeName) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeName);
  }, theme);
  await page.goto("/");
  await page.setViewportSize({ width: 1920, height: 900 });
  await expect(page.getByRole("heading", { name: "Featured Games", exact: true })).toBeVisible();
  const featuredCard = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Featured Games", exact: true }) })
    .locator("[data-roving-card]")
    .first();
  await expect(featuredCard).toBeVisible();

  await page.locator("body").click({ position: { x: 8, y: 8 } });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await page.keyboard.press("Tab");
    ready = await featuredCard.evaluate(
      (card) => card === document.activeElement && card.matches(":focus-visible"),
    );
    if (ready) break;
  }
  expect(ready, `keyboard focus-visible on Featured Games card (${theme})`).toBe(true);
}

test("game card inset focus ring is visible in row scrollers (light and dark)", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await focusFeaturedCardWithKeyboard(page, theme);

    const metrics = await page.evaluate(() => {
      const card = document.activeElement;
      if (!(card instanceof HTMLElement) || !card.hasAttribute("data-roving-card")) {
        return { ok: false, reason: "active card missing" };
      }
      const section = card.closest("section");
      const heading = section?.querySelector("h2")?.textContent?.trim();
      if (heading !== "Featured Games") {
        return { ok: false, reason: `wrong section: ${heading ?? "none"}` };
      }
      const scroller = card.closest(".gv-layout-row-scroll, .row-scroll");
      if (!scroller) return { ok: false, reason: "missing scroller" };
      const style = getComputedStyle(card);
      const shadow = style.boxShadow;
      const hasRing =
        Boolean(shadow && shadow !== "none" && shadow.includes("inset")) ||
        (style.outlineStyle !== "none" && style.outlineWidth !== "0px");
      const cardRect = card.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      // Inset focus ring is drawn inside the card; the card itself must sit within the scroller.
      const contained =
        cardRect.left >= scrollerRect.left - 0.5 &&
        cardRect.top >= scrollerRect.top - 0.5 &&
        cardRect.right <= scrollerRect.right + 0.5 &&
        cardRect.bottom <= scrollerRect.bottom + 0.5;
      return { ok: hasRing && contained, hasRing, contained, shadow, theme: document.documentElement.className };
    });

    expect(metrics.hasRing, `ring visible (${theme}): shadow=${metrics.shadow}`).toBe(true);
    expect(metrics.contained, `not clipped by scroller (${theme})`).toBe(true);
  }
});
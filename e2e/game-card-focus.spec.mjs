import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const ACCENT = { r: 59, g: 130, b: 246 };
const EDGE_SAMPLE_OFFSET = 3;

function isAccentPixel(r, g, b) {
  return (
    Math.abs(r - ACCENT.r) <= 48 &&
    Math.abs(g - ACCENT.g) <= 48 &&
    Math.abs(b - ACCENT.b) <= 48 &&
    b > r + 40
  );
}

async function accentOnCardEdges(page, cardLocator) {
  await cardLocator.scrollIntoViewIfNeeded();
  const box = await cardLocator.boundingBox();
  if (!box) return { samples: [] };
  const shot = await cardLocator.screenshot({ type: "png" });
  const bytes = [...shot];
  return page.evaluate(
    async ({ pngBytes, width, height, edgeOffset }) => {
      const points = [];
      const blob = new Blob([new Uint8Array(pngBytes)], { type: "image/png" });
      const objectUrl = URL.createObjectURL(blob);
      try {
        return await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve({ samples: [] });
              return;
            }
            ctx.drawImage(img, 0, 0);
            const scaleX = img.width / width;
            const scaleY = img.height / height;
            const o = Math.max(1, Math.round(edgeOffset * scaleX));
            const oy = Math.max(1, Math.round(edgeOffset * scaleY));
            const points = [
              [o, oy],
              [img.width - o - 1, oy],
              [o, img.height - oy - 1],
              [img.width - o - 1, img.height - oy - 1],
              [Math.floor(img.width / 2), oy],
              [Math.floor(img.width / 2), img.height - oy - 1],
            ];
            const samples = points.map(([x, y]) => {
              const d = ctx.getImageData(x, y, 1, 1).data;
              return { x, y, r: d[0], g: d[1], b: d[2], a: d[3] };
            });
            resolve({ samples });
          };
          img.onerror = () => resolve({ samples: [] });
          img.src = objectUrl;
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
    { pngBytes: bytes, width: box.width, height: box.height, edgeOffset: EDGE_SAMPLE_OFFSET },
  );
}

function countAccentHits(samples) {
  return samples.filter((s) => s.a > 200 && isAccentPixel(s.r, s.g, s.b)).length;
}

async function keyboardFocusCard(page, card) {
  await page.locator("body").click({ position: { x: 8, y: 8 } });
  await card.scrollIntoViewIfNeeded();
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await page.keyboard.press("Tab");
    ready = await card.evaluate(
      (el) => el === document.activeElement && el.matches(":focus-visible"),
    );
    if (ready) break;
  }
  expect(ready, "keyboard focus-visible on target card").toBe(true);
  await expect(page).toHaveURL(/\/$/);
}

async function focusCardInSection(page, heading) {
  const card = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) })
    .locator("[data-roving-card]")
    .first();
  await expect(card).toBeVisible();
  await keyboardFocusCard(page, card);
  return card;
}

async function prepareTheme(page, theme) {
  await page.addInitScript((themeName) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeName);
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter" && event.target instanceof HTMLElement && event.target.hasAttribute("data-roving-card")) {
          event.preventDefault();
        }
      },
      true,
    );
  }, theme);
}

async function assertRingPixels(page, card, { focused }) {
  const { samples } = await accentOnCardEdges(page, card);
  expect(samples.length, "edge pixel samples").toBeGreaterThan(0);
  const hits = countAccentHits(samples);
  if (focused) {
    expect(hits, `accent ring pixels when focused: ${JSON.stringify(samples)}`).toBeGreaterThanOrEqual(
      3,
    );
  } else {
    expect(hits, `no accent ring when unfocused: ${JSON.stringify(samples)}`).toBeLessThanOrEqual(1);
  }
}

test("game card focus ring pixels in Featured and Action rows (light and dark)", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await prepareTheme(page, theme);
    await page.goto("/");
    await page.setViewportSize({ width: 1920, height: 900 });
    await expect(page.getByRole("heading", { name: "Featured Games", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Action", exact: true })).toBeVisible();

    for (const row of ["Featured Games", "Action"]) {
      const card = await focusCardInSection(page, row);
      await assertRingPixels(page, card, { focused: true });

      await page.locator("body").click({ position: { x: 8, y: 8 } });
      await expect(card).not.toBeFocused();
      await card.scrollIntoViewIfNeeded();
      await assertRingPixels(page, card, { focused: false });
    }
  }
});
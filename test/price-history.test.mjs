import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  PRICE_HISTORY_MAX_POINTS,
  appendDailyPrice,
  discountBadge,
  formatHistoryDate,
  lowestRecorded,
  prunePriceHistory,
  recordAttemptPrices,
  recordOfferPrices,
} = loadTsModule("src/data/price-history.ts");

const { mergeStoreOffers } = loadTsModule("src/data/store-match.ts");
const { gameIsOnSale, indexStoreOffers, offersForGame } = loadTsModule("src/data/store-offer-index.ts");

function pointRange(start, days, centsFor) {
  const points = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let index = 0; index < days; index += 1) {
    const date = cursor.toISOString().slice(0, 10);
    points.push([date, centsFor(date, index)]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function offer(overrides = {}) {
  return {
    store: "steam",
    platform: "PC",
    productId: "1145360",
    url: "https://store.steampowered.com/app/1145360",
    title: "Hades",
    price: 24.99,
    regularPrice: 24.99,
    currency: "EUR",
    match: "external-id",
    score: 1,
    checkedAt: "2026-11-01",
    ...overrides,
  };
}

test("appends one compact daily point and replaces the same day", () => {
  const first = appendDailyPrice(undefined, "2026-11-10", 6.99);
  assert.deepEqual(first, [["2026-11-10", 699]]);

  const secondDay = appendDailyPrice(first, "2026-11-11", 4.99);
  assert.deepEqual(secondDay, [["2026-11-10", 699], ["2026-11-11", 499]]);

  const sameDay = appendDailyPrice(secondDay, "2026-11-11", 3.49);
  assert.deepEqual(sameDay, [["2026-11-10", 699], ["2026-11-11", 349]]);
  assert.equal(sameDay.length, 2);

  const unchanged = [["2026-11-10", 699]];
  appendDailyPrice(unchanged, "2026-11-12", 1);
  assert.deepEqual(unchanged, [["2026-11-10", 699]]);
});

test("ignores a missing price or an invalid day and keeps the points already stored", () => {
  const history = [["2026-11-09", 175]];
  assert.deepEqual(appendDailyPrice(history, "2026-11-10", null), history);
  assert.deepEqual(appendDailyPrice(history, "2026-11-10", Number.NaN), history);
  assert.deepEqual(appendDailyPrice(history, "2026-02-31", 1.75), history);
  assert.deepEqual(appendDailyPrice(history, "10-11-2026", 1.75), history);
  assert.deepEqual(recordOfferPrices([
    offer({ price: null, checkedAt: "2026-11-10" }),
  ], [
    offer({ history }),
  ], "2026-11-10")[0].history, history);
});

test("keeps the same product history and does not invent a point when the feed fails", () => {
  const previous = [offer({
    price: 12.99,
    checkedAt: "2026-11-01",
    history: [["2026-10-02", 999], ["2026-11-01", 1299]],
  })];
  const attempts = recordAttemptPrices(previous, {
    steam: { status: "failed" },
    gog: { status: "miss" },
  }, "2026-11-10");
  assert.equal(attempts.steam.status, "failed");
  assert.equal(attempts.gog.status, "miss");

  const merged = mergeStoreOffers(previous, attempts);
  assert.equal(merged.length, 1);
  assert.equal(merged[0], previous[0]);
  assert.deepEqual(merged[0].history, [["2026-10-02", 999], ["2026-11-01", 1299]]);

  const refreshed = recordOfferPrices([
    offer({ price: 9.99, regularPrice: 12.99, checkedAt: "2026-11-10" }),
  ], previous, "2026-11-10");
  assert.deepEqual(refreshed[0].history, [
    ["2026-10-02", 999],
    ["2026-11-01", 1299],
    ["2026-11-10", 999],
  ]);
});

test("starts a new history when the matched product changes", () => {
  const previous = [offer({ history: [["2026-11-01", 2499]] })];
  const attempts = recordAttemptPrices(previous, {
    steam: {
      status: "matched",
      offer: offer({ productId: "999", price: 4.99, checkedAt: "2026-11-10" }),
    },
  }, "2026-11-10");
  assert.deepEqual(attempts.steam.offer.history, [["2026-11-10", 499]]);
});

test("seeds from the current snapshot once per day and leaves that point in place", () => {
  const seeded = recordOfferPrices([
    offer({ price: 1.75, checkedAt: "2026-11-09" }),
    offer({ store: "gog", productId: "thief_2", price: null, checkedAt: "2026-11-09" }),
  ], undefined, "2026-11-10");
  assert.deepEqual(seeded[0].history, [["2026-11-09", 175]]);
  assert.equal(seeded[1].history, undefined);

  const again = recordOfferPrices(seeded, seeded, "2026-11-10");
  assert.deepEqual(again[0].history, [["2026-11-09", 175]]);
});

test("downsamples old days to the monthly low and keeps recent days", () => {
  const history = [
    ["2025-01-05", 2000],
    ["2025-01-20", 1000],
    ["2025-01-28", 1500],
    ["2025-02-01", 1800],
    ["2026-10-01", 900],
    ["2026-10-20", 1200],
    ["2026-10-28", 900],
    ["2026-11-01", 1100],
    ["2026-11-02", 800],
    ["2026-11-10", 1300],
  ];
  assert.deepEqual(prunePriceHistory(history, "2026-11-10"), [
    ["2025-01-05", 2000],
    ["2025-01-20", 1000],
    ["2025-02-01", 1800],
    ["2026-10-01", 900],
    ["2026-10-28", 900],
    ["2026-11-01", 1100],
    ["2026-11-02", 800],
    ["2026-11-10", 1300],
  ]);
});

test("caps stored points without dropping the first, lowest, or latest price", () => {
  const older = [];
  const cursor = new Date("2020-01-15T00:00:00Z");
  while (cursor.toISOString().slice(0, 10) < "2026-10-01") {
    const date = cursor.toISOString().slice(0, 10);
    older.push([date, date === "2023-06-15" ? 100 : 4000]);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const recent = pointRange("2026-10-28", 14, () => 2500);
  const pruned = prunePriceHistory([...older, ...recent], "2026-11-10");
  assert.equal(pruned.length, PRICE_HISTORY_MAX_POINTS);
  assert.deepEqual(pruned[0], ["2020-01-15", 4000]);
  assert.ok(pruned.some((point) => point[0] === "2023-06-15" && point[1] === 100));
  assert.deepEqual(pruned.at(-1), ["2026-11-10", 2500]);
  assert.ok(pruned.some((point) => point[0] === "2026-09-15"));
  assert.equal(pruned.some((point) => point[0] === "2020-02-15"), false);
  assert.equal(pruned.some((point) => point[0] === "2026-07-15"), false);

  const crowded = pointRange("2026-10-28", 24, (date) => (date === "2026-11-05" ? 100 : 1000));
  const capped = prunePriceHistory(crowded, "2026-11-10");
  assert.equal(capped.length, PRICE_HISTORY_MAX_POINTS);
  assert.deepEqual(capped[0], ["2026-10-28", 1000]);
  assert.ok(capped.some((point) => point[0] === "2026-11-04" && point[1] === 1000));
  assert.ok(capped.some((point) => point[0] === "2026-11-05" && point[1] === 100));
  assert.deepEqual(capped.at(-1), ["2026-11-20", 1000]);
  assert.equal(capped.some((point) => point[0] === "2026-10-29"), false);
  assert.equal(capped.some((point) => point[0] === "2026-11-03"), false);
});

test("reads the lowest recorded cents and the earliest day that hit it", () => {
  assert.equal(lowestRecorded(undefined), null);
  assert.deepEqual(lowestRecorded([
    ["2026-11-10", 699],
    ["2026-11-12", 175],
    ["2026-11-18", 175],
  ]), { cents: 175, date: "2026-11-12" });
  assert.equal(formatHistoryDate("2026-11-12"), "12 Nov 2026");
});

test("labels a discount from the current price and the regular price", () => {
  assert.equal(discountBadge(41.99, 69.99), "-40%");
  assert.equal(discountBadge(1.75, 6.99), "-75%");
  assert.equal(discountBadge(5.99, 14.99), "-60%");
  assert.equal(discountBadge(0, 19.99), "-100%");
  assert.equal(discountBadge(9.99, 10), "-1%");
  assert.equal(discountBadge(6.99, 6.99), null);
  assert.equal(discountBadge(10, 9.99), null);
  assert.equal(discountBadge(null, 6.99), null);
  assert.equal(discountBadge(6.99, null), null);
});

test("exposes the discount badge and lowest recorded price on a cached offer", () => {
  const index = indexStoreOffers({
    schemaVersion: 1,
    region: "NL",
    currency: "EUR",
    games: {
      "1": {
        offers: [
          offer({
            price: 1.75,
            regularPrice: 6.99,
            history: [["2026-11-01", 699], ["2026-11-09", 175], ["not-a-day", 1], ["2026-11-08", 1.5]],
          }),
          offer({
            store: "gog",
            productId: "full",
            url: "https://www.gog.com/en/game/hades",
            price: 24.99,
            regularPrice: 24.99,
          }),
        ],
      },
      "2": {
        offers: [offer({ price: 24.99, regularPrice: 24.99 })],
      },
    },
  });

  const discounted = offersForGame(index, "1", ["PC"]);
  assert.equal(discounted[0].discountLabel, "-75%");
  assert.equal(discounted[0].deal, true);
  assert.deepEqual(discounted[0].lowestRecorded, { price: 1.75, date: "2026-11-09" });
  assert.equal(discounted[1].discountLabel, null);
  assert.equal(discounted[1].lowestRecorded, null);
  assert.equal(gameIsOnSale(index, "1", ["PC"]), true);
  assert.equal(gameIsOnSale(index, "2", ["PC"]), false);
  assert.equal(gameIsOnSale(index, "1", ["Switch"]), false);
});

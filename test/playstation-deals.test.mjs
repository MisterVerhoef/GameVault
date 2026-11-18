import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  assertCategoryGridRetrieve,
  assertPlayStationExperience,
} = loadTsModule("src/data/playstation-deals-schema.ts");

const {
  classifyPlayStationProductKind,
  parsePlayStationEuroPrice,
  playStationDealsFromCategoryGrid,
  playStationDealFromGridRow,
} = loadTsModule("src/data/playstation-deals-normalize.ts");

const fixturesDir = new URL("./fixtures/", import.meta.url);

function readJson(name) {
  return JSON.parse(readFileSync(new URL(name, fixturesDir), "utf8"));
}

test("parses Dutch PlayStation euro prices", () => {
  assert.equal(parsePlayStationEuroPrice("€79,99"), 79.99);
  assert.equal(parsePlayStationEuroPrice("€7,49"), 7.49);
  assert.equal(parsePlayStationEuroPrice("not-a-price"), null);
});

test("validates category grid page shape", () => {
  const page = readJson("playstation-category-grid-page1.json");
  const grid = assertCategoryGridRetrieve(page);
  assert.equal(grid.products?.length, 24);
});

test("normalizes category grid products into deals", () => {
  const page = readJson("playstation-category-grid-page1.json");
  const grid = assertCategoryGridRetrieve(page);
  const gameIds = new Map([
    ["EP1004-CUSA08519_00-REDEMPTIONFULL02", "42"],
  ]);
  const deals = playStationDealsFromCategoryGrid(grid, gameIds);
  assert.ok(deals.length >= 20);
  const matched = deals.find((deal) => deal.productId === "EP1004-CUSA08519_00-REDEMPTIONFULL02");
  assert.ok(matched);
  assert.equal(matched.gameId, "42");
  assert.equal(matched.platform, "playstation");
  assert.equal(matched.currency, "EUR");
  assert.ok(matched.discountPercent > 0);
  assert.ok(matched.platformTags.includes("PS4") || matched.platformTags.includes("PS5"));
});

test("classifies DLC add-ons separately from full games", () => {
  assert.equal(classifyPlayStationProductKind({ storeDisplayClassification: "ADD_ON_PACK" }), "dlc");
  assert.equal(classifyPlayStationProductKind({ storeDisplayClassification: "FULL_GAME" }), "game");
  const grid = assertCategoryGridRetrieve(readJson("playstation-category-grid-page1.json"));
  const game = grid.products.find((row) => row.storeDisplayClassification === "FULL_GAME");
  assert.ok(game);
  assert.equal(classifyPlayStationProductKind(game), "game");
});

test("schema failure surfaces as validation error for fallbacks", () => {
  assert.throws(() => assertCategoryGridRetrieve({ data: { categoryGridRetrieve: { pageInfo: "bad" } } }));
  assert.throws(() => assertPlayStationExperience({ data: {} }));
});

test("unavailable state when live fetch fails without disk cache", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "gv-ps-deals-"));
  const prev = process.cwd();
  process.chdir(tmp);
  try {
    const { fetchPlayStationDealsLive } = loadTsModule("src/data/playstation-deals-fetch.ts");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    try {
      const payload = await fetchPlayStationDealsLive();
      assert.equal(payload.status, "unavailable");
      assert.equal(payload.deals.length, 0);
      assert.match(payload.error ?? "", /could not be loaded/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    process.chdir(prev);
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("returns cached payload when schema validation fails but cache exists", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "gv-ps-deals-"));
  const prev = process.cwd();
  process.chdir(tmp);
  try {
    mkdirSync(join(tmp, ".cache"), { recursive: true });
    writeFileSync(
      join(tmp, ".cache/playstation-deals-nl.json"),
      JSON.stringify({
        lastUpdated: "2026-01-01T00:00:00.000Z",
        payload: {
          source: "playstation-category-grid",
          status: "live",
          updatedAt: "2026-01-01T00:00:00.000Z",
          deals: [
            {
              platform: "playstation",
              productId: "EP9000-PPSA00000_00-TESTDEAL000000",
              conceptId: null,
              title: "Cached Deal",
              coverUrl: null,
              price: 9.99,
              regularPrice: 19.99,
              discountPercent: 50,
              currency: "EUR",
              productKind: "game",
              platformTags: ["PS5"],
              psPlusPrice: null,
              storeUrl: "https://store.playstation.com/nl-nl/product/EP9000-PPSA00000_00-TESTDEAL000000",
              gameId: null,
            },
          ],
        },
      }),
      "utf8",
    );
    const { fetchPlayStationDealsLive } = loadTsModule("src/data/playstation-deals-fetch.ts");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      async json() {
        return { errors: [{ message: "broken" }] };
      },
    });
    try {
      const payload = await fetchPlayStationDealsLive();
      assert.equal(payload.status, "cached");
      assert.equal(payload.source, "disk-cache");
      assert.equal(payload.deals[0].title, "Cached Deal");
      assert.equal(payload.lastUpdated, "2026-01-01T00:00:00.000Z");
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    process.chdir(prev);
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("keeps PS Plus price separate when tied to subscription", () => {
  const deal = playStationDealFromGridRow({
    __typename: "Product",
    id: "EP9000-PPSA00000_00-TESTSUB0000000",
    name: "Plus Sale",
    platforms: ["PS5"],
    storeDisplayClassification: "FULL_GAME",
    price: {
      basePrice: "€39,99",
      discountedPrice: "€19,99",
      isTiedToSubscription: true,
      discountText: "-50%",
    },
  }, new Map());
  assert.ok(deal);
  assert.equal(deal.psPlusPrice, 19.99);
  assert.equal(deal.price, 39.99);
  assert.equal(deal.regularPrice, 39.99);
});
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  classifyMicrosoftProductKind,
  discountPercent,
  filterXboxDeals,
  parseDealsBigIdsScript,
  parseRecoDealIds,
  sortXboxDeals,
  xboxDealFromAppsListItem,
  xboxDealFromDisplayCatalog,
} = loadTsModule("src/data/xbox-deals-normalize.ts");

const fixturesDir = new URL("./fixtures/", import.meta.url);

function readJson(name) {
  return JSON.parse(readFileSync(new URL(name, fixturesDir), "utf8"));
}

test("parses Microsoft reco deal ids", () => {
  const body = readJson("microsoft-reco-deals-sample.json");
  assert.deepEqual(parseRecoDealIds(body), ["9PNV9T34HGMJ", "9P08Z9PHQHDP", "9P7N8NN5WWB9"]);
});

test("parses Xbox.com deals bigIds script", () => {
  const script = readFileSync(new URL("microsoft-deals-bigids-head.js", fixturesDir), "utf8");
  const ids = parseDealsBigIdsScript(script);
  assert.ok(ids.length >= 5);
  assert.match(ids[0], /^[A-Z0-9]{12}$/);
});

test("normalizes display catalog products into deals", () => {
  const body = readJson("microsoft-displaycatalog-deals-sample.json");
  const gameIds = new Map([["9PNV9T34HGMJ", "100"]]);
  const deals = (body.Products ?? []).map((product) => xboxDealFromDisplayCatalog(product, gameIds)).filter(Boolean);
  assert.ok(deals.length >= 1);
  const first = deals[0];
  assert.equal(first.gameId, "100");
  assert.ok(first.discountPercent > 0);
  assert.equal(first.currency, "EUR");
});

test("classifies DLC bundles and add-on list entries", () => {
  const dlcBundle = readJson("microsoft-displaycatalog-dlc-bundle.json").Products[0];
  assert.equal(
    classifyMicrosoftProductKind(
      dlcBundle,
      { isGame: true, isCoreGame: false },
      ["addon-deal"],
      "Minecraft Dungeons Ultimate DLC Bundle - Windows 10",
    ),
    "dlc",
  );

  const addons = readJson("microsoft-apps-dealaddons-page1.json").productsList ?? [];
  const javaEdition = addons.find((entry) => /Java & Bedrock/i.test(entry.title ?? ""));
  assert.ok(javaEdition);
  assert.equal(
    classifyMicrosoftProductKind(undefined, javaEdition, ["addon-deal"], javaEdition.title),
    "game",
  );

  const durableFixture = {
    ProductId: "9NTESTDURAB1",
    ProductKind: "Durable",
    ProductType: "Durable",
    LocalizedProperties: [{ ProductTitle: "Sample Add-on" }],
    DisplaySkuAvailabilities: [
      {
        Sku: { SkuType: "full" },
        Availabilities: [{
          Actions: ["Purchase"],
          RemediationRequired: false,
          OrderManagementData: { Price: { CurrencyCode: "EUR", ListPrice: 4.99, MSRP: 9.99 } },
        }],
      },
    ],
  };
  const deal = xboxDealFromDisplayCatalog(durableFixture, new Map());
  assert.equal(deal?.productKind, "dlc");
});

test("normalizes apps.microsoft list items", () => {
  const body = readJson("microsoft-apps-deals-page1.json");
  const gameIds = new Map();
  const deals = (body.productsList ?? []).map((entry) => xboxDealFromAppsListItem(entry, gameIds)).filter(Boolean);
  assert.ok(deals.length >= 1);
  assert.equal(typeof deals[0].price, "number");
});

test("sorts and filters deals", () => {
  const deals = [
    { title: "Bravo", price: 20, regularPrice: 40, discountPercent: 50, productKind: "game" },
    { title: "Alpha", price: 10, regularPrice: 30, discountPercent: 67, productKind: "dlc" },
    { title: "Charlie", price: 5, regularPrice: 25, discountPercent: 80, productKind: "game" },
  ].map((entry, index) => ({
  bigId: `9NE2E2E01AA${index}`,
  coverUrl: null,
  currency: "EUR",
  saleEndsAt: null,
  storeUrl: `https://www.xbox.com/nl-NL/games/store/${entry.title.toLowerCase()}/9NE2E2E01AA${index}`,
  gameId: null,
  ...entry,
  }));

  assert.equal(discountPercent(10, 40), 75);
  assert.equal(sortXboxDeals(deals, "price-asc")[0].title, "Charlie");
  assert.equal(sortXboxDeals(deals, "discount-desc")[0].title, "Charlie");
  assert.equal(sortXboxDeals(deals, "title-asc")[0].title, "Alpha");
  assert.equal(filterXboxDeals(deals, "game").length, 2);
  assert.equal(filterXboxDeals(deals, "dlc").length, 1);
});
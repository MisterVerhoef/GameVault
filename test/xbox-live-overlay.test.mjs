import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { overlayXboxCachedOffer, pickBestMicrosoftProduct } = loadTsModule("src/data/xbox-live-overlay.ts");

const {
  ageInDays,
  identitiesFromGame,
  preferIdentity,
  xboxIdentitiesOrdered,
} = loadTsModule("src/data/store-match.ts");
const { isStoreDeal } = loadTsModule("src/data/store-offer-index.ts");

const cachedOffer = {
  store: "xbox",
  platform: "Xbox",
  url: "https://www.xbox.com/nl-nl/games/store/game/9P03JGQ4S1GC",
  title: "Skyrim",
  price: 39.99,
  regularPrice: 39.99,
  currency: "EUR",
  deal: false,
  discountLabel: null,
  lowestRecorded: { price: 39.99, date: "2026-11-10" },
};

test("overlays a live Xbox sale onto cached catalogue prices", () => {
  const overlaid = overlayXboxCachedOffer(
    cachedOffer,
    [["2026-11-10", 3999]],
  {
    price: 7.99,
    regularPrice: 39.99,
    productId: "9P03JGQ4S1GC",
    url: cachedOffer.url,
  },
    "2026-11-16",
  );
  assert.equal(overlaid.price, 7.99);
  assert.equal(overlaid.regularPrice, 39.99);
  assert.equal(overlaid.deal, true);
  assert.equal(overlaid.discountLabel, "-80%");
  assert.ok(isStoreDeal(overlaid.price, overlaid.regularPrice));
  assert.equal(overlaid.lowestRecorded?.price, 7.99);
  assert.equal(overlaid.lowestRecorded?.date, "2026-11-16");
});

test("keeps cached offers when live Xbox data is missing", () => {
  const overlaid = overlayXboxCachedOffer(cachedOffer, [["2026-11-10", 3999]], null, "2026-11-16");
  assert.deepEqual(overlaid, cachedOffer);
});

test("prefers Xbox store-website product ids over other linked ids", () => {
  const game = {
    externalIds: [
      { store: "xbox", id: "9NNX1VVR3KNQ" },
      { store: "xbox", id: "9NKX70BBCDRN" },
    ],
    websites: [{
      url: "https://www.xbox.com/en-us/games/store/forza-horizon-5-standard-edition/9NKX70BBCDRN",
    }],
  };
  assert.deepEqual(xboxIdentitiesOrdered(game), [
    { store: "xbox", id: "9NKX70BBCDRN" },
    { store: "xbox", id: "9NNX1VVR3KNQ" },
  ]);
  assert.deepEqual(preferIdentity(identitiesFromGame(game), "xbox", game), {
    store: "xbox",
    id: "9NKX70BBCDRN",
  });
});

test("picks the priced base-game Microsoft product among candidates", () => {
  const chosen = pickBestMicrosoftProduct([
    { id: "9NNX1VVR3KNQ", kind: "game", price: null, currency: undefined },
    { id: "9NKX70BBCDRN", kind: "game", price: 59.99, regularPrice: 59.99, currency: "EUR" },
  ], ["9NKX70BBCDRN", "9NNX1VVR3KNQ"]);
  assert.equal(chosen?.id, "9NKX70BBCDRN");
  assert.equal(chosen?.price, 59.99);
});

test("treats Xbox catalogue offers as stale when max age is zero days", () => {
  const xboxMaxAge = 0;
  const checkedAt = "2026-11-10";
  const today = "2026-11-16";
  assert.ok(ageInDays(checkedAt, today) > xboxMaxAge);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";
import { normalizeIgdbExport } from "../scripts/providers/igdb.mjs";

const {
  applyFills,
  chooseCandidate,
  identitiesFromGame,
  mergeStoreOffers,
  parseStoreUrl,
  reconcileFills,
  selectPlayStationPrice,
  storeIdsFromIgdb,
  titleScore,
} = loadTsModule("src/data/store-match.ts");

const baseGame = {
  id: "1",
  slug: "hades",
  title: "Hades",
  genres: ["Action"],
  themes: [],
  developers: [],
  publishers: [],
  platforms: ["Switch"],
  screenshots: [],
  videos: [],
  websites: [],
  dlc: [],
  expansions: [],
  editions: [],
  relatedGames: [],
  similarGames: [],
  franchises: [],
  collections: [],
  source: [{ provider: "igdb", id: "1" }],
  updatedAt: "2026-10-15",
};

test("reads store ids from catalogue URLs and IGDB external games", () => {
  assert.deepEqual(
    parseStoreUrl("https://www.xbox.com/en-us/games/store/halo-infinite-campaign/9NP1P1WFS0LB"),
    { store: "xbox", id: "9NP1P1WFS0LB" },
  );
  assert.deepEqual(
    parseStoreUrl("https://store.playstation.com/en-us/concept/10001850"),
    { store: "playstation", id: "concept:10001850" },
  );
  assert.deepEqual(
    parseStoreUrl("https://store.playstation.com/en-us/product/UP1004-PPSA03420_00-GTAOANDSPUPGRADE"),
    { store: "playstation", id: "product:UP1004-PPSA03420_00-GTAOANDSPUPGRADE" },
  );
  assert.deepEqual(
    parseStoreUrl("https://www.nintendo.com/store/products/the-binding-of-isaac-repentance-70050000031296-switch/"),
    { store: "nintendo", id: "70050000031296" },
  );
  assert.equal(parseStoreUrl("https://store.steampowered.com/app/1240440"), undefined);

  assert.deepEqual(storeIdsFromIgdb([
    { uid: "9N1234567890", external_game_source: 31 },
    { uid: "10001850", category: 36 },
    { uid: "480", external_game_source: 1 },
  ]), [
    { store: "xbox", id: "9N1234567890" },
    { store: "playstation", id: "10001850" },
  ]);

  const [game] = normalizeIgdbExport([{
    id: 7,
    name: "Linked",
    slug: "linked",
    platforms: [{ name: "Xbox One" }],
    external_games: [{ uid: "9NABCDEFGHIJ", external_game_source: 11 }],
  }]);
  assert.deepEqual(game.externalIds, [{ store: "xbox", id: "9NABCDEFGHIJ" }]);
  assert.deepEqual(
    identitiesFromGame({
      externalIds: [{ store: "xbox", id: "9NABCDEFGHIJ" }],
      websites: [{ url: "https://store.playstation.com/nl-nl/concept/10001850" }],
    }).map((identity) => identity.id),
    ["9NABCDEFGHIJ", "concept:10001850"],
  );
});

test("matches store products by exact title and rejects loose or ambiguous hits", () => {
  assert.equal(titleScore({ title: "Hades", year: 2020 }, {
    id: "dlc",
    title: "Assassin’s Creed Odyssey EP2.2: Torment of Hades",
    kind: "game",
  }), undefined);
  assert.equal(titleScore({ title: "Hades", year: 2020 }, {
    id: "sound",
    title: "Hades Soundtrack",
    kind: "game",
    year: 2020,
  }), undefined);
  assert.deepEqual(titleScore({ title: "Hades", year: 2020 }, {
    id: "game",
    title: "Hades",
    kind: "game",
    year: 2020,
  }), { match: "exact-title", score: 0.95 });
  assert.equal(titleScore({ title: "Hades", year: 2020 }, {
    id: "old",
    title: "Hades",
    kind: "game",
    year: 2010,
  }), undefined);
  assert.equal(titleScore({ title: "Hades Deluxe Edition" }, {
    id: "base",
    title: "Hades",
    kind: "game",
  }), undefined);
  assert.equal(chooseCandidate({ title: "Hades" }, [
    { id: "a", title: "Hades", kind: "game" },
    { id: "b", title: "Hades", kind: "game" },
  ]), undefined);
  assert.equal(chooseCandidate({ title: "Outer Wilds" }, [
    { id: "base", title: "Outer Wilds", kind: "game", year: 2019 },
    { id: "edition", title: "Outer Wilds: Archaeologist Edition", kind: "game", year: 2020 },
  ])?.candidate.id, "base");
  assert.equal(chooseCandidate({ title: "Hades" }, [
    { id: "deluxe", title: "Hades Deluxe Edition", kind: "game", year: 2020 },
  ])?.match, "edition");
});

test("keeps the outright PlayStation price and ignores a PlayStation Plus upsell", () => {
  assert.deepEqual(selectPlayStationPrice([
    {
      price: {
        isTiedToSubscription: true,
        currencyCode: "EUR",
        basePriceValue: 7999,
        discountedValue: 0,
      },
    },
    {
      price: {
        isTiedToSubscription: false,
        currencyCode: "EUR",
        basePriceValue: 7999,
        discountedValue: 4999,
      },
    },
  ]), { price: 49.99, regularPrice: 79.99 });
});

test("keeps cached offers when a store fails and fills only missing IGDB fields", () => {
  const previous = [{
    store: "xbox",
    platform: "Xbox",
    productId: "9N",
    url: "https://www.xbox.com/nl-nl/games/store/game/9N",
    title: "Halo Infinite",
    price: 69.99,
    regularPrice: 69.99,
    currency: "EUR",
    match: "external-id",
    score: 1,
    checkedAt: "2026-10-01",
  }];
  const merged = mergeStoreOffers(previous, {
    xbox: { status: "failed" },
    nintendo: { status: "miss" },
    playstation: {
      status: "matched",
      offer: { ...previous[0], store: "playstation", platform: "PS5", productId: "concept" },
    },
  });
  assert.deepEqual(merged.map((offer) => offer.store), ["xbox", "playstation"]);

  const filled = applyFills({
    ...baseGame,
    cover: { url: "https://images.igdb.com/cover.jpg" },
    description: "IGDB description",
  }, {
    cover: { url: "https://www.nintendo.com/cover.jpg", store: "nintendo" },
    description: { text: "Store description", store: "nintendo" },
    screenshots: [{ url: "https://www.nintendo.com/shot.jpg", store: "nintendo" }],
  });
  assert.equal(filled.game.cover.url, "https://images.igdb.com/cover.jpg");
  assert.equal(filled.game.description, "IGDB description");
  assert.equal(filled.game.screenshots[0].url, "https://www.nintendo.com/shot.jpg");
  assert.deepEqual(filled.captions, ["Screenshots from the Nintendo eShop."]);

  const kept = reconcileFills(baseGame, {
    cover: { url: "https://www.nintendo.com/cover.jpg", store: "nintendo" },
  }, []);
  assert.equal(kept.cover.url, "https://www.nintendo.com/cover.jpg");
  const replaced = reconcileFills({ ...baseGame, cover: { url: "https://images.igdb.com/cover.jpg" } }, kept, []);
  assert.equal(replaced.cover, undefined);
});

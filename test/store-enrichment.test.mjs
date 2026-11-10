import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";
import { normalizeIgdbExport } from "../scripts/providers/igdb.mjs";
import { applyNintendoPrice, matchEpicSlug, microsoftProduct, nintendoCandidate } from "../scripts/stores/clients.mjs";
import { retryDelayMs } from "../scripts/stores/http.mjs";

const {
  applyFills,
  chooseCandidate,
  identitiesFromGame,
  isEpicPageSlug,
  isAllowedStoreMatch,
  isNintendoGameNsuid,
  isUsableStoreId,
  isXboxBigId,
  matchesStoreIdOnly,
  mergeStoreOffers,
  parseStoreUrl,
  preferIdentity,
  reconcileFills,
  selectMicrosoftPrice,
  selectNintendoPrice,
  selectPlayStationPrice,
  steamAppIds,
  storeIdsFromIgdb,
  storeName,
  storePlatform,
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
  assert.deepEqual(
    parseStoreUrl("https://store.steampowered.com/app/1086940/Baldurs_Gate_3/"),
    { store: "steam", id: "1086940" },
  );
  assert.deepEqual(
    parseStoreUrl("https://store.steampowered.com/agecheck/app/413150"),
    { store: "steam", id: "413150" },
  );
  assert.deepEqual(
    parseStoreUrl("https://www.gog.com/en/game/baldurs_gate_iii"),
    { store: "gog", id: "baldurs_gate_iii" },
  );
  assert.deepEqual(
    parseStoreUrl("https://www.gog.com/game/stardew_valley?utm=catalogue"),
    { store: "gog", id: "stardew_valley" },
  );
  assert.deepEqual(
    parseStoreUrl("https://store.epicgames.com/en-US/p/hades"),
    { store: "epic", id: "hades" },
  );
  assert.deepEqual(
    parseStoreUrl("https://store.epicgames.com/p/grand-theft-auto-v?lang=en-US"),
    { store: "epic", id: "grand-theft-auto-v" },
  );
  assert.deepEqual(
    parseStoreUrl("https://www.epicgames.com/store/en-US/product/hades/home"),
    { store: "epic", id: "hades" },
  );
  assert.equal(parseStoreUrl("https://steamcommunity.com/app/1240440"), undefined);
  assert.equal(parseStoreUrl("https://store.steampowered.com/sub/123"), undefined);

  assert.deepEqual(storeIdsFromIgdb([
    { uid: "9N1234567890", external_game_source: 31 },
    { uid: "10001850", category: 36 },
    { uid: "1086940", external_game_source: 1 },
    { uid: "1456460669", external_game_source: 5 },
    { uid: "hades", external_game_source: 26 },
    { uid: "480", category: 1 },
  ]), [
    { store: "xbox", id: "9N1234567890" },
    { store: "playstation", id: "10001850" },
    { store: "steam", id: "1086940" },
    { store: "gog", id: "1456460669" },
    { store: "epic", id: "hades" },
    { store: "steam", id: "480" },
  ]);

  const [game] = normalizeIgdbExport([{
    id: 7,
    name: "Linked",
    slug: "linked",
    platforms: [{ name: "PC (Microsoft Windows)" }],
    external_games: [
      { uid: "9NABCDEFGHIJ", external_game_source: 11 },
      { uid: "1145360", external_game_source: 1 },
      { uid: "stardew_valley", external_game_source: 5 },
      { uid: "hades", external_game_source: 26 },
    ],
  }]);
  assert.deepEqual(game.externalIds, [
    { store: "xbox", id: "9NABCDEFGHIJ" },
    { store: "steam", id: "1145360" },
    { store: "gog", id: "stardew_valley" },
    { store: "epic", id: "hades" },
  ]);
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
  assert.equal(chooseCandidate({ title: "Outer Wilds", year: 2019 }, [
    { id: "base", title: "Outer Wilds", kind: "game", year: 2019 },
    { id: "edition", title: "Outer Wilds: Archaeologist Edition", kind: "game", year: 2020 },
  ])?.candidate.id, "base");
  assert.equal(chooseCandidate({ title: "Hades", year: 2020 }, [
    { id: "deluxe", title: "Hades Deluxe Edition", kind: "game", year: 2020 },
  ]), undefined);
  assert.equal(titleScore({ title: "Hades", year: 2020 }, {
    id: "game",
    title: "Hades",
    kind: "game",
  }), undefined);
  assert.equal(titleScore({ title: "Hades" }, {
    id: "game",
    title: "Hades",
    kind: "game",
    year: 2020,
  }), undefined);
  assert.deepEqual(titleScore({ title: "Hades!", year: 2018 }, {
    id: "game",
    title: "Hades",
    kind: "game",
    year: 2020,
  }), { match: "exact-title", score: 0.95 });
  assert.equal(titleScore({ title: "Hades", year: 2020 }, {
    id: "sequel",
    title: "Hades II",
    kind: "game",
    year: 2024,
  }), undefined);
  assert.equal(titleScore({ title: "Hades", year: 2020 }, {
    id: "music",
    title: "Hades",
    kind: "other",
    year: 2020,
  }), undefined);
  assert.equal(chooseCandidate({ title: "Hades", year: 2020 }, [
    { id: "a", title: "Hades", kind: "game", year: 2019 },
    { id: "b", title: "Hades", kind: "game", year: 2021 },
  ]), undefined);
});

test("maps PC stores to the PC platform and keeps a failed PC fetch", () => {
  assert.equal(storePlatform("steam"), "PC");
  assert.equal(storePlatform("epic"), "PC");
  assert.equal(storePlatform("gog"), "PC");
  assert.equal(storePlatform("xbox"), "Xbox");
  assert.equal(storeName("steam"), "Steam");
  assert.equal(storeName("epic"), "Epic Games Store");
  assert.equal(storeName("gog"), "GOG");

  const previous = [{
    store: "steam",
    platform: "PC",
    productId: "1145360",
    url: "https://store.steampowered.com/app/1145360",
    title: "Hades",
    price: 24.5,
    regularPrice: 24.5,
    currency: "EUR",
    match: "external-id",
    score: 1,
    checkedAt: "2026-10-01",
  }, {
    store: "gog",
    platform: "PC",
    productId: "stardew_valley",
    url: "https://www.gog.com/en/game/stardew_valley",
    title: "Stardew Valley",
    price: 13.99,
    regularPrice: 13.99,
    currency: "EUR",
    match: "external-id",
    score: 1,
    checkedAt: "2026-10-01",
  }];
  const merged = mergeStoreOffers(previous, {
    steam: { status: "failed" },
    epic: { status: "miss" },
    gog: {
      status: "matched",
      offer: { ...previous[1], price: 6.99, regularPrice: 13.99 },
    },
  });
  assert.deepEqual(merged.map((offer) => offer.store), ["steam", "gog"]);
  assert.equal(merged.find((offer) => offer.store === "steam").price, 24.5);
  assert.equal(merged.find((offer) => offer.store === "gog").price, 6.99);
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

test("matches PC stores by stable ids and retries rate limits with backoff", () => {
  assert.equal(matchesStoreIdOnly("steam"), true);
  assert.equal(matchesStoreIdOnly("epic"), true);
  assert.equal(matchesStoreIdOnly("gog"), true);
  assert.equal(matchesStoreIdOnly("xbox"), true);
  assert.equal(matchesStoreIdOnly("playstation"), false);
  assert.equal(matchesStoreIdOnly("nintendo"), false);

  assert.equal(isEpicPageSlug("hades"), true);
  assert.equal(isEpicPageSlug("bioshock-the-collection"), true);
  assert.equal(isEpicPageSlug("2ae6edb2223c4f8c97e9839b5b6497bb"), false);
  assert.equal(isEpicPageSlug("54fb014e-a694-4a6c-b945-0c132e1e2d6a"), false);
  assert.deepEqual(preferIdentity([
    { store: "epic", id: "2ae6edb2223c4f8c97e9839b5b6497bb" },
    { store: "epic", id: "54fb014e-a694-4a6c-b945-0c132e1e2d6a" },
    { store: "epic", id: "hades" },
  ], "epic"), { store: "epic", id: "hades" });
  assert.deepEqual(
    parseStoreUrl("https://store.epicgames.com/en-US/bundles/bioshock-the-collection"),
    { store: "epic", id: "bioshock-the-collection" },
  );

  assert.deepEqual(steamAppIds("1145360"), ["1145360"]);
  assert.deepEqual(steamAppIds("292030,378649,378648"), ["292030", "378649", "378648"]);
  assert.deepEqual(steamAppIds("292030,292030"), ["292030"]);

  assert.equal(retryDelayMs(404, 0), 0);
  assert.equal(retryDelayMs(429, 0), 500);
  assert.ok(retryDelayMs(429, 1) > retryDelayMs(429, 0));
  assert.ok(retryDelayMs(500, 2) > retryDelayMs(500, 1));
  assert.equal(retryDelayMs(429, 9), 0);
  assert.ok(retryDelayMs(undefined, 0) > 0);

  const trails = {
    id: "the-legend-of-heroes-trails-beyond-the-horizon-9a0e43",
    title: "Trails",
    kind: "game",
  };
  assert.equal(
    matchEpicSlug([trails], "the-legend-of-heroes-trails-beyond-the-horizon-9a0e43")?.id,
    trails.id,
  );
  assert.equal(
    matchEpicSlug(
      [{ id: "better-mart-simulator-b8bd9b", title: "Better Mart Simulator", kind: "game" }],
      "bettermart-b8bd9b",
    )?.id,
    "better-mart-simulator-b8bd9b",
  );
  assert.equal(matchEpicSlug(
    [{ id: "heroes-of-might-and-magic-3-remake", title: "Remake", kind: "game" }],
    "might-and-magic-heroes-3",
  ), undefined);
  assert.equal(matchEpicSlug([
    { id: "one-aaaaaa", title: "One", kind: "game" },
    { id: "two-aaaaaa", title: "Two", kind: "game" },
  ], "store-aaaaaa"), undefined);
});

test("matches console stores by product id and keeps only an exact title inside two years", () => {
  assert.equal(isXboxBigId("9P8RQH67TTT1"), true);
  assert.equal(isXboxBigId("c4h36b87svl1"), true);
  assert.equal(isXboxBigId("66acd000-77fe-1000-9115-d802425307d1"), false);
  assert.equal(isXboxBigId("xbox36066acd000-77fe-1000-9115-d802425307d1"), false);
  assert.equal(isNintendoGameNsuid("70010000033132"), true);
  assert.equal(isNintendoGameNsuid("70050000031296"), false);
  assert.equal(isNintendoGameNsuid("70070000000962"), false);
  assert.equal(isUsableStoreId("xbox", "9P8RQH67TTT1"), true);
  assert.equal(isUsableStoreId("xbox", "66acd000-77fe-1000-9115-d802425307d1"), false);
  assert.equal(isUsableStoreId("nintendo", "70010000033132"), true);
  assert.equal(isUsableStoreId("playstation", "10001850"), true);
  assert.equal(isUsableStoreId("playstation", "concept:10001850"), true);

  assert.deepEqual(preferIdentity([
    { store: "xbox", id: "xbox36066acd000-77fe-1000-9115-d802425307d1" },
    { store: "xbox", id: "9p8rqh67ttt1" },
  ], "xbox"), { store: "xbox", id: "9p8rqh67ttt1" });
  assert.equal(preferIdentity([
    { store: "xbox", id: "66acd000-77fe-1000-9115-d802425307d1" },
  ], "xbox"), undefined);
  assert.deepEqual(preferIdentity([
    { store: "nintendo", id: "70050000031296" },
    { store: "nintendo", id: "70010000033132" },
  ], "nintendo"), { store: "nintendo", id: "70010000033132" });

  assert.equal(isAllowedStoreMatch("xbox", "external-id"), true);
  assert.equal(isAllowedStoreMatch("xbox", "exact-title"), false);
  assert.equal(isAllowedStoreMatch("xbox", "edition"), false);
  assert.equal(isAllowedStoreMatch("playstation", "exact-title"), true);
  assert.equal(isAllowedStoreMatch("nintendo", "edition"), false);
  assert.equal(isAllowedStoreMatch("steam", "external-id"), true);

  const xboxTitle = {
    store: "xbox",
    platform: "Xbox",
    productId: "9N",
    url: "https://www.xbox.com/nl-nl/games/store/game/9N",
    title: "Hades",
    price: 24.99,
    regularPrice: 24.99,
    currency: "EUR",
    match: "exact-title",
    score: 0.95,
    checkedAt: "2026-10-01",
  };
  const nintendoEdition = {
    ...xboxTitle,
    store: "nintendo",
    platform: "Switch",
    match: "edition",
    url: "https://www.nintendo.com/nl-nl/Games/example",
  };
  const merged = mergeStoreOffers([xboxTitle, nintendoEdition], {});
  assert.deepEqual(merged, []);
});

test("uses the outright Xbox price and the official Nintendo NL price", () => {
  assert.deepEqual(selectMicrosoftPrice([
    {
      skuType: "full",
      actions: ["Purchase"],
      remediationRequired: true,
      currency: "EUR",
      listPrice: 31.99,
      msrp: 39.99,
    },
    {
      skuType: "full",
      actions: ["Purchase"],
      remediationRequired: false,
      currency: "EUR",
      listPrice: 19.99,
      msrp: 39.99,
    },
  ]), { price: 19.99, regularPrice: 39.99 });
  assert.equal(selectMicrosoftPrice([
    {
      skuType: "trial",
      actions: ["Purchase"],
      remediationRequired: false,
      currency: "EUR",
      listPrice: 0,
      msrp: 0,
    },
  ]), undefined);

  const upsellFirst = microsoftProduct({
    ProductId: "9P8RQH67TTT1",
    ProductKind: "Game",
    LocalizedProperties: [{ ProductTitle: "Grand Theft Auto V", Images: [] }],
    DisplaySkuAvailabilities: [{
      Sku: { SkuType: "full" },
      Availabilities: [
        {
          Actions: ["Purchase"],
          RemediationRequired: true,
          OrderManagementData: { Price: { CurrencyCode: "EUR", ListPrice: 31.99, MSRP: 39.99 } },
        },
        {
          Actions: ["Purchase"],
          RemediationRequired: false,
          OrderManagementData: { Price: { CurrencyCode: "EUR", ListPrice: 39.99, MSRP: 39.99 } },
        },
      ],
    }],
  });
  assert.equal(upsellFirst.price, 39.99);
  assert.equal(upsellFirst.regularPrice, 39.99);
  assert.equal(upsellFirst.currency, "EUR");

  const indexed = nintendoCandidate({
    title: "Mario Kart 8 Deluxe",
    nsuid_txt: ["70070000000962", "70010000000126"],
    price_regular_f: 84.98,
    price_lowest_f: 24.99,
    price_has_discount_b: false,
    type: "GAME",
    date_from: "2017-04-28T00:00:00Z",
    url: "/nl-nl/Games/Nintendo-Switch-games/Mario-Kart-8-Deluxe-1173296.html",
  });
  assert.equal(indexed.id, "70010000000126");
  assert.equal(indexed.year, 2017);
  assert.equal(indexed.price, undefined);
  assert.equal(nintendoCandidate({
    title: "Physical only",
    nsuid_txt: ["70070000000962"],
    type: "GAME",
    url: "/nl-nl/Games/example",
  }), undefined);

  assert.deepEqual(selectNintendoPrice({
    sales_status: "onsale",
    regular_price: { currency: "EUR", raw_value: "59.99" },
  }), { price: 59.99, regularPrice: 59.99 });
  assert.deepEqual(selectNintendoPrice({
    sales_status: "onsale",
    regular_price: { currency: "EUR", raw_value: "19.99" },
    discount_price: { currency: "EUR", raw_value: "3.99" },
  }), { price: 3.99, regularPrice: 19.99 });
  assert.equal(selectNintendoPrice({
    sales_status: "not_found",
    regular_price: { currency: "EUR", raw_value: "29.99" },
  }), undefined);

  const priced = applyNintendoPrice(indexed, {
    title_id: 70010000000126,
    sales_status: "onsale",
    regular_price: { currency: "EUR", raw_value: "59.99" },
    discount_price: { currency: "EUR", raw_value: "39.99" },
  });
  assert.equal(priced.price, 39.99);
  assert.equal(priced.regularPrice, 59.99);
  assert.equal(priced.currency, "EUR");
  assert.equal(priced.url, "https://www.nintendo.com/nl-nl/Games/Nintendo-Switch-games/Mario-Kart-8-Deluxe-1173296.html");
});

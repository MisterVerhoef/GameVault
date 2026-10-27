import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  formatEuro,
  indexStoreOffers,
  isStoreDeal,
  offersForGame,
} = loadTsModule("src/data/store-offer-index.ts");

function catalogue(games) {
  return {
    schemaVersion: 1,
    region: "NL",
    currency: "EUR",
    games,
  };
}

const republic = {
  store: "playstation",
  platform: "PS5",
  productId: "concept:10000469",
  url: "https://store.playstation.com/nl-nl/concept/10000469",
  title: "Star Wars: Republic Commando",
  price: 5.99,
  regularPrice: 14.99,
  currency: "EUR",
  match: "external-id",
  score: 1,
  checkedAt: "2026-10-26",
};

test("formats Netherlands euros", () => {
  assert.equal(formatEuro(5.99), "€\u00a05,99");
  assert.equal(formatEuro(0), "€\u00a00,00");
  assert.equal(isStoreDeal(5.99, 14.99), true);
  assert.equal(isStoreDeal(29.99, 29.99), false);
  assert.equal(isStoreDeal(null, 14.99), false);
});

test("matches cached offers by catalogue game id and platform", () => {
  const index = indexStoreOffers(catalogue({
    "148": { offers: [republic] },
    "83": {
      offers: [
        {
          ...republic,
          store: "xbox",
          platform: "Xbox",
          url: "https://www.xbox.com/nl-nl/games/store/dark-alliance/9N1234567890",
          price: 29.99,
          regularPrice: 29.99,
        },
        {
          ...republic,
          price: 35.99,
          regularPrice: 35.99,
        },
      ],
    },
  }));

  const deal = offersForGame(index, "148", ["PS5", "PC"]);
  assert.equal(deal.length, 1);
  assert.equal(deal[0].price, 5.99);
  assert.equal(deal[0].deal, true);
  assert.equal(deal[0].url, "https://store.playstation.com/nl-nl/concept/10000469");

  assert.equal(offersForGame(index, "148", ["Switch"]).length, 0);
  assert.equal(offersForGame(index, "339152", ["PC"]).length, 0);

  const both = offersForGame(index, "83", ["Xbox", "PS5"]);
  assert.deepEqual(both.map((offer) => offer.store), ["xbox", "playstation"]);
  assert.equal(both.every((offer) => offer.deal), false);
});

test("leaves a game unpriced when the offer is missing or not a real euro amount", () => {
  const index = indexStoreOffers(catalogue({
    "85614": {
      offers: [{
        store: "nintendo",
        platform: "Switch",
        url: "https://www.nintendo.com/nl-nl/Games/Nintendo-Switch-games/Minecraft.html",
        title: "Minecraft",
        price: -1,
        regularPrice: -1,
        currency: "EUR",
      }],
    },
    "1": {
      offers: [
        { store: "xbox", platform: "Xbox", url: "http://example.com/game", title: "Insecure", price: 10, regularPrice: 10, currency: "EUR" },
        { store: "playstation", platform: "PS5", url: "https://store.playstation.com/nl-nl/concept/1", title: "Valid", price: null, regularPrice: null, currency: "EUR" },
        { store: "nintendo", platform: "Switch", url: "https://www.nintendo.com/game", title: "Wrong money", price: 9, regularPrice: 9, currency: "USD" },
      ],
    },
    "2": { offers: "not-a-list" },
  }));

  const minecraft = offersForGame(index, "85614", ["Switch"]);
  assert.equal(minecraft.length, 1);
  assert.equal(minecraft[0].price, null);
  assert.equal(minecraft[0].deal, false);
  assert.match(minecraft[0].url, /^https:\/\/www\.nintendo\.com\//);

  const mixed = offersForGame(index, "1");
  assert.equal(mixed.length, 1);
  assert.equal(mixed[0].store, "playstation");
  assert.equal(mixed[0].price, null);

  assert.equal(offersForGame(index, "2").length, 0);
  assert.equal(offersForGame(index, "missing").length, 0);
});

test("returns no prices for an unsupported catalogue file", () => {
  assert.equal(indexStoreOffers(null).byGameId.size, 0);
  assert.equal(indexStoreOffers({ schemaVersion: 2, region: "NL", currency: "EUR", games: { "1": { offers: [republic] } } }).byGameId.size, 0);
  assert.equal(indexStoreOffers({ schemaVersion: 1, region: "US", currency: "EUR", games: { "1": { offers: [republic] } } }).byGameId.size, 0);
  assert.equal(indexStoreOffers({ schemaVersion: 1, region: "NL", currency: "USD", games: { "1": { offers: [republic] } } }).byGameId.size, 0);
});

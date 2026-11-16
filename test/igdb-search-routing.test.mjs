import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  isIgdbDlcSearchHit,
  partitionIgdbSearchHits,
  isExcludedIgdbLiveSearchGameType,
} = loadTsModule("src/lib/igdb/search-hit-types.ts");
const {
  dropIgdbSearchNoise,
  shouldDropIgdbSearchNoise,
} = loadTsModule("src/lib/igdb/search-hit-quality.ts");
const { mergeSearchWallSections } = loadTsModule("src/data/hybrid-search.ts");
const { buildIgdbSearchBody } = loadTsModule("src/lib/igdb/search-api.ts");

const FIXED_NOW = new Date("2026-11-16T12:00:00.000Z");

test("live search filter drops mods, bundles, episodes, and seasons", () => {
  const body = buildIgdbSearchBody("zelda");
  assert.match(body, /game_type != \(3,5,6,7,11,12,14\)/);
  assert.equal(isExcludedIgdbLiveSearchGameType(6), true);
  assert.equal(isExcludedIgdbLiveSearchGameType(7), true);
});

test("partitionIgdbSearchHits routes DLC types to the dlc bucket", () => {
  const hits = [
    { id: "1", title: "Main", gameType: 0 },
    { id: "2", title: "Jack the Ripper", gameType: 1 },
    { id: "3", title: "Pack", gameType: 13 },
  ];
  assert.equal(isExcludedIgdbLiveSearchGameType(5), true);
  assert.equal(isIgdbDlcSearchHit({ gameType: 2 }), true);
  const { games, dlc } = partitionIgdbSearchHits(hits);
  assert.deepEqual(
    games.map((row) => row.id),
    ["1"],
  );
  assert.deepEqual(
    dlc.map((row) => row.id),
    ["2", "3"],
  );
});

test("mergeSearchWallSections keeps Assassin's Creed Syndicate DLC off the games grid", () => {
  const sections = [
    {
      id: "games",
      title: "Games",
      kind: "games",
      games: [{ id: "8263", title: "Assassin's Creed Syndicate", platforms: ["Other"] }],
    },
    {
      id: "dlc",
      title: "DLC",
      kind: "dlc",
      games: [{ id: "50", title: "Syndicate: American Revolt", platforms: ["PC"] }],
    },
  ];
  const igdb = [
    { id: "9001", title: "Jack the Ripper", gameType: 1, ratingCount: 84, releaseYear: 2015 },
    { id: "9002", title: "Zelda Rom Hack", gameType: 0, releaseYear: 2004, ratingCount: 0 },
  ];
  const merged = mergeSearchWallSections("syndicate", sections, igdb);
  assert.equal(
    merged?.[0].games.some((game) => game.id === "9001"),
    false,
  );
  assert.ok(merged?.[1].games.some((game) => game.title === "Jack the Ripper"));
});

test("dropIgdbSearchNoise removes real zelda fan and BS noise but keeps retail hits", () => {
  const noise = [
    { id: "38319", title: "BS Zelda no Densetsu", gameType: 8, releaseYear: 1995, ratingCount: 0, hasPlatforms: true, hasCompanies: true },
    { id: "134500", title: "BS Zelda no Densetsu MAP 2", gameType: 8, releaseYear: 1995, ratingCount: 0, hasPlatforms: true },
    { id: "42308", title: "BS The Legend of Zelda", gameType: 0, releaseYear: 1997, ratingCount: 0, hasPlatforms: true },
    { id: "282369", title: "Zelda Mini", releaseYear: undefined, ratingCount: 0 },
    { id: "28864", title: "Zelda Mobile", releaseYear: 2010, ratingCount: 0, hasPlatforms: true },
    { id: "270386", title: "New Zelda", releaseYear: 2006, ratingCount: 0 },
    { id: "322646", title: "King of Thieves", releaseYear: undefined, ratingCount: 0 },
    { id: "323280", title: "Mask of the Gods", releaseYear: undefined, ratingCount: 0 },
    { id: "172690", title: "Zelda Picross", releaseYear: 2015, ratingCount: 0 },
    { id: "163216", title: "Zelda Chuanshuo", releaseYear: 2004, ratingCount: 0 },
  ];
  const keep = [
    { id: "1025", title: "Zelda II: The Adventure of Link", releaseYear: 1987, ratingCount: 240 },
    { id: "1037", title: "The Legend of Zelda: Phantom Hourglass", releaseYear: 2007, ratingCount: 312 },
    { id: "116419", title: "Cadence of Hyrule: Crypt of the NecroDancer feat. The Legend of Zelda", releaseYear: 2019, ratingCount: 67 },
    { id: "163572", title: "The Legend of Zelda: Four Swords", releaseYear: 2011, ratingCount: 21 },
    { id: "8533", title: "Zelda: The Wand of Gamelon", releaseYear: 1993, ratingCount: 18 },
    { id: "152362", title: "Zelda", releaseYear: 2020, ratingCount: 0 },
    { id: "999001", title: "Cat Syndicate: Istanbul", releaseYear: 2025, ratingCount: 0 },
  ];
  const filtered = dropIgdbSearchNoise("zelda", [...noise, ...keep], FIXED_NOW);
  const ids = new Set(filtered.map((row) => row.id));
  for (const row of noise) {
    assert.equal(ids.has(row.id), false, `expected noise row ${row.id} to drop`);
  }
  for (const row of keep) {
    assert.equal(ids.has(row.id), true, `expected retail row ${row.id} to stay`);
  }
});

test("shouldDropIgdbSearchNoise keeps exact title matches without ratings", () => {
  assert.equal(
    shouldDropIgdbSearchNoise("zelda", { id: "152362", title: "Zelda", releaseYear: 2020, ratingCount: 0 }, FIXED_NOW),
    false,
  );
  assert.equal(
    shouldDropIgdbSearchNoise("zelda", { id: "28864", title: "Zelda Mobile", releaseYear: 2010, ratingCount: 0 }, FIXED_NOW),
    true,
  );
});
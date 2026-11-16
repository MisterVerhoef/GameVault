import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  isIgdbDlcSearchHit,
  partitionIgdbSearchHits,
  isExcludedIgdbLiveSearchGameType,
} = loadTsModule("src/lib/igdb/search-hit-types.ts");
const { dropIgdbSearchNoise } = loadTsModule("src/lib/igdb/search-hit-quality.ts");
const { mergeSearchWallSections } = loadTsModule("src/data/hybrid-search.ts");
const { buildIgdbSearchBody } = loadTsModule("src/lib/igdb/search-api.ts");

test("live search filter drops mods and bundles but keeps DLC types", () => {
  const body = buildIgdbSearchBody("syndicate");
  assert.match(body, /game_type != \(3,5,11,12,14\)/);
  assert.doesNotMatch(body, /game_type != \(11,12,13,14\)/);
});

test("partitionIgdbSearchHits routes DLC types to the dlc bucket", () => {
  const hits = [
    { id: "1", title: "Main", gameType: 0 },
    { id: "2", title: "Jack the Ripper", gameType: 1 },
    { id: "3", title: "Pack", gameType: 13 },
  ];
  assert.equal(isExcludedIgdbLiveSearchGameType(5), true);
  assert.equal(isExcludedIgdbLiveSearchGameType(1), false);
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
    { id: "9001", title: "Jack the Ripper", gameType: 1 },
    { id: "9002", title: "Zelda Rom Hack", gameType: 0 },
  ];
  const merged = mergeSearchWallSections("syndicate", sections, igdb);
  assert.equal(
    merged?.[0].games.some((game) => game.id === "9001"),
    false,
  );
  assert.ok(merged?.[1].games.some((game) => game.title === "Jack the Ripper"));
});

test("dropIgdbSearchNoise removes sparse fan-game rows but keeps exact title matches", () => {
  const hits = [
    { id: "7346", title: "The Legend of Zelda: Breath of the Wild", rating: 97 },
    { id: "999", title: "Legend of Zelda BS Quest", gameType: 0 },
    { id: "1000", title: "Vault Mock Exclusief Spel", gameType: 0 },
  ];
  const filtered = dropIgdbSearchNoise("vault mock exclusief spel", hits);
  assert.deepEqual(
    filtered.map((row) => row.id),
    ["7346", "1000"],
  );
  const sparse = dropIgdbSearchNoise("zelda", [
    { id: "888", title: "Zelda Fan Game", gameType: 0 },
    { id: "7346", title: "The Legend of Zelda: Breath of the Wild", rating: 90, ratingCount: 1000 },
  ]);
  assert.deepEqual(
    sparse.map((row) => row.id),
    ["7346"],
  );
});
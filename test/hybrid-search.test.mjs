import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  shouldQueryIgdbLiveSearch,
  mergeCatalogueAndIgdbSearch,
  filterIgdbHitsForCatalogueMerge,
  dropIgdbPortsWithCatalogueParent,
  igdbHitDuplicatesCatalogueTitle,
  catalogueTitleMatchCount,
} = loadTsModule("src/data/hybrid-search.ts");
const { searchMatchTier } = loadTsModule("src/data/search-rank.ts");
const { searchCardLabel } = loadTsModule("src/data/search-card-label.ts");
const {
  buildIgdbSearchBody,
  buildIgdbExactNameSearchBody,
  mergeIgdbLiveSearchRows,
  IGDB_LIVE_SEARCH_LIMIT,
} = loadTsModule("src/lib/igdb/search-api.ts");

const SYNDICATE_CATALOGUE = [{ id: "49", title: "Syndicate", releaseYear: 1993, platforms: ["PC"], ratingCount: 64 }];
const SYNDICATE_IGDB_FUZZY = [{ id: "213754", title: "Syndicate", releaseYear: 1993, ratingCount: 0 }];
const SYNDICATE_IGDB_EXACT = [{ id: "1006", title: "Syndicate", releaseYear: 2012, rating: 73.4, ratingCount: 120 }];
const SYNDICATE_IGDB = mergeIgdbLiveSearchRows(SYNDICATE_IGDB_EXACT, SYNDICATE_IGDB_FUZZY);

test("buildIgdbSearchBody excludes ports and raises the page size", () => {
  const body = buildIgdbSearchBody("syndicate");
  assert.match(body, /version_parent = null/);
  assert.match(body, /game_type != \(3,5,11,12,14\)/);
  assert.match(body, /game_type = null/);
  assert.match(body, /total_rating_count/);
  assert.match(body, new RegExp(`limit ${IGDB_LIVE_SEARCH_LIMIT};`));
});

test("buildIgdbExactNameSearchBody matches titles with ~ and popularity sort", () => {
  const body = buildIgdbExactNameSearchBody("Syndicate");
  assert.match(body, /where name ~ "Syndicate"/);
  assert.match(body, /sort total_rating_count desc;/);
  assert.match(body, /version_parent = null/);
});

test("mergeIgdbLiveSearchRows prefers exact-name rows and dedupes ids", () => {
  const merged = mergeIgdbLiveSearchRows(
    [{ id: "1006", title: "Syndicate", releaseYear: 2012 }],
    [
      { id: "1006", title: "Syndicate (dup)", releaseYear: 2012 },
      { id: "213754", title: "Syndicate", releaseYear: 1993 },
    ],
  );
  assert.deepEqual(merged.map((hit) => hit.id), ["1006", "213754"]);
});

test("igdbHitDuplicatesCatalogueTitle treats missing years as duplicates", () => {
  assert.equal(
    igdbHitDuplicatesCatalogueTitle(
      { title: "Syndicate", releaseYear: 1993 },
      { title: "Syndicate", releaseYear: undefined },
    ),
    true,
  );
  assert.equal(
    igdbHitDuplicatesCatalogueTitle(
      { title: "Syndicate", releaseYear: 2012 },
      { title: "Syndicate", releaseYear: 1993 },
    ),
    false,
  );
});

test("shouldQueryIgdbLiveSearch ignores summary-only catalogue hits", () => {
  const catalogue = Array.from({ length: 12 }, (_, index) => ({
    title: index === 0 ? "Syndicate" : `Streets of Rage ${index}`,
  }));
  assert.equal(catalogueTitleMatchCount("syndicate", catalogue), 1);
  assert.equal(searchMatchTier("syndicate", catalogue[1].title), 0);
  assert.equal(shouldQueryIgdbLiveSearch("syndicate", catalogue), true);
});

test("dropIgdbPortsWithCatalogueParent removes ports parented on catalogue ids", () => {
  assert.deepEqual(
    dropIgdbPortsWithCatalogueParent(
      [{ id: "9", title: "Port", versionParentId: "49" }],
      SYNDICATE_CATALOGUE,
    ).map((hit) => hit.id),
    [],
  );
});

test("syndicate merge drops Amiga fuzzy port without version_parent metadata", () => {
  const filtered = filterIgdbHitsForCatalogueMerge(
    "syndicate",
    SYNDICATE_CATALOGUE,
    SYNDICATE_IGDB,
  );
  assert.deepEqual(filtered.map((hit) => hit.id), ["1006"]);
});

test("syndicate merge keeps 1993 catalogue and 2012 IGDB, not the Amiga port", () => {
  const filtered = filterIgdbHitsForCatalogueMerge("syndicate", SYNDICATE_CATALOGUE, SYNDICATE_IGDB);
  assert.deepEqual(filtered.map((hit) => hit.id), ["1006"]);
  const merged = mergeCatalogueAndIgdbSearch("syndicate", SYNDICATE_CATALOGUE, SYNDICATE_IGDB);
  assert.equal(merged.length, 2);
  assert.deepEqual(new Set(merged.map((game) => game.id)), new Set(["49", "1006"]));
  const byId = new Map(merged.map((game) => [game.id, game.releaseYear]));
  assert.equal(byId.get("49"), 1993);
  assert.equal(byId.get("1006"), 2012);
});

test("mergeCatalogueAndIgdbSearch ranks exact title matches and dedupes ids", () => {
  const catalogue = [
    { id: "49", title: "Syndicate", platforms: ["PC"], releaseYear: 1993 },
    { id: "50", title: "Syndicate: American Revolt", platforms: ["PC"] },
  ];
  const igdb = [
    { id: "1006", title: "Syndicate", releaseYear: 2012, rating: 73.4 },
    { id: "49", title: "Syndicate (duplicate)", releaseYear: 1993 },
  ];
  const merged = mergeCatalogueAndIgdbSearch("syndicate", catalogue, igdb);
  assert.deepEqual(new Set(merged.map((game) => game.id)), new Set(["49", "1006", "50"]));
  const syndicates = merged.filter((game) => game.title === "Syndicate");
  assert.equal(syndicates.length, 2);
  assert.ok(syndicates.some((game) => game.id === "1006" && game.releaseYear === 2012));
  assert.ok(merged[merged.length - 1].title.startsWith("Syndicate:"));
});

test("filterIgdbHitsForCatalogueMerge drops IGDB duplicates unless exact shared title", () => {
  assert.deepEqual(
    filterIgdbHitsForCatalogueMerge(
      "zelda",
      [{ id: "1", title: "The Legend of Zelda: Ocarina of Time", platforms: ["Other"], releaseYear: 1998 }],
      [{ id: "999", title: "The Legend of Zelda: Ocarina of Time", releaseYear: 1998 }],
    ).map((hit) => hit.id),
    [],
  );
  assert.deepEqual(
    filterIgdbHitsForCatalogueMerge(
      "syndicate",
      [{ id: "49", title: "Syndicate", platforms: ["PC"], releaseYear: 1993 }],
      [{ id: "1006", title: "Syndicate", releaseYear: 2012 }],
    ).map((hit) => hit.id),
    ["1006"],
  );
});

test("searchCardLabel appends year when titles collide", () => {
  const games = [
    { id: "49", title: "Syndicate", releaseYear: 1993 },
    { id: "1006", title: "Syndicate", releaseYear: 2012 },
  ];
  assert.equal(searchCardLabel(games[0], games), "Syndicate (1993)");
  assert.equal(searchCardLabel(games[1], games), "Syndicate (2012)");
});

test("shouldQueryIgdbLiveSearch skips IGDB when many exact title matches", () => {
  const catalogue = Array.from({ length: 5 }, (_, index) => ({
    title: `Syndicate ${index}`,
  }));
  catalogue.unshift({ title: "Syndicate" });
  assert.equal(shouldQueryIgdbLiveSearch("syndicate", catalogue), false);
});
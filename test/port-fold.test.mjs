import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { foldUnlinkedIgdbPorts } = loadTsModule("src/data/port-fold.ts");
const {
  mergeCatalogueAndIgdbSearch,
  filterIgdbHitsForCatalogueMerge,
} = loadTsModule("src/data/hybrid-search.ts");
const { searchCardLabel } = loadTsModule("src/data/search-card-label.ts");
const { mergeIgdbLiveSearchRows } = loadTsModule("src/lib/igdb/search-api.ts");

const SYNDICATE_CATALOGUE = [
  { id: "49", title: "Syndicate", releaseYear: 1993, platforms: ["PC"], ratingCount: 64 },
  { id: "51", title: "Syndicate Wars", releaseYear: 1996, platforms: ["PC"], ratingCount: 39 },
  { id: "50", title: "Syndicate: American Revolt", platforms: ["PC"] },
];
const SYNDICATE_IGDB_FUZZY = [
  { id: "213754", title: "Syndicate", releaseYear: 1993, ratingCount: 0 },
  { id: "213570", title: "Syndicate", releaseYear: 1994, ratingCount: 2, rating: 60 },
  { id: "213885", title: "Syndicate", releaseYear: 1995, ratingCount: 1 },
  { id: "214456", title: "Syndicate Wars", releaseYear: 1997, ratingCount: 0 },
];
const SYNDICATE_IGDB_EXACT = [
  { id: "1006", title: "Syndicate", releaseYear: 2012, ratingCount: 120, rating: 73.4 },
];
const SYNDICATE_IGDB = mergeIgdbLiveSearchRows(SYNDICATE_IGDB_EXACT, SYNDICATE_IGDB_FUZZY);

test("foldUnlinkedIgdbPorts folds console ports near an earlier catalogue base", () => {
  const folded = foldUnlinkedIgdbPorts(SYNDICATE_IGDB, SYNDICATE_CATALOGUE);
  assert.deepEqual(
    folded.map((hit) => hit.id).sort(),
    ["1006"],
  );
});

test("syndicate wall shows two Syndicate years and one Syndicate Wars", () => {
  const filtered = filterIgdbHitsForCatalogueMerge("syndicate", SYNDICATE_CATALOGUE, SYNDICATE_IGDB);
  assert.deepEqual(filtered.map((hit) => hit.id), ["1006"]);
  const merged = mergeCatalogueAndIgdbSearch("syndicate", SYNDICATE_CATALOGUE, SYNDICATE_IGDB);
  const syndicate = merged.filter((game) => game.title === "Syndicate");
  const wars = merged.filter((game) => game.title === "Syndicate Wars");
  assert.equal(syndicate.length, 2);
  assert.equal(wars.length, 1);
  assert.deepEqual(
  new Set(syndicate.map((game) => game.releaseYear)),
    new Set([1993, 2012]),
  );
  assert.equal(wars[0]?.id, "51");
  assert.equal(searchCardLabel(syndicate.find((g) => g.id === "49"), syndicate), "Syndicate (1993)");
  assert.equal(searchCardLabel(syndicate.find((g) => g.id === "1006"), syndicate), "Syndicate (2012)");
});
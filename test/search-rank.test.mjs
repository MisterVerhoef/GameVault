import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { searchTitleTier, searchMatchTier, sortSearchResults, compareSearchRank } =
  loadTsModule("src/data/search-rank.ts");

test("searchTitleTier prefers exact title matches", () => {
  assert.equal(searchTitleTier("Dispatch", "Dispatch"), 2);
  assert.equal(searchTitleTier("hades", "Hades"), 2);
  assert.equal(searchTitleTier("Hades", "Hades II"), 1);
  assert.equal(searchTitleTier("Hades", "This War of Mine"), 0);
});

test("sortSearchResults ranks exact and prefix titles ahead of other hits", () => {
  const games = [
    { id: "twom", title: "This War of Mine", rating: 90 },
    { id: "hades2", title: "Hades II", rating: 99 },
    { id: "hades", title: "Hades", rating: 80 },
    { id: "dispatch6", title: "Dispatch", rating: 70 },
    { id: "dispatch", title: "Dispatch", rating: 50 },
  ];
  const sorted = sortSearchResults("Hades", games);
  assert.deepEqual(
    sorted.map((game) => game.id),
    ["hades", "hades2", "twom", "dispatch6", "dispatch"],
  );

  const dispatchSorted = sortSearchResults("Dispatch", [
    { id: "other", title: "Dispatch Mission", rating: 100 },
    { id: "exact", title: "Dispatch", rating: 10 },
    { id: "filler", title: "Unrelated", rating: 99 },
  ]);
  assert.equal(dispatchSorted[0].id, "exact");
  assert.equal(dispatchSorted[1].id, "other");
});

test("compareSearchRank keeps rating order within the same tier", () => {
  assert.equal(
    compareSearchRank("zz", { title: "Alpha", rating: 10 }, { title: "Beta", rating: 20 }),
    10,
  );
});

test("searchMatchTier ranks title matches above summary-only hits", () => {
  assert.equal(searchMatchTier("zelda", "The Legend of Zelda: Breath of the Wild"), 2);
  assert.equal(searchMatchTier("zelda", "Style Savvy: Fashion Forward"), 0);
  const sorted = sortSearchResults("Zelda", [
    { id: "style", title: "Style Savvy: Fashion Forward", rating: 99 },
    { id: "soul", title: "SoulCalibur II", rating: 98 },
    { id: "botw", title: "The Legend of Zelda: Breath of the Wild", rating: 90 },
    { id: "totk", title: "The Legend of Zelda: Tears of the Kingdom", rating: 80 },
  ]);
  assert.deepEqual(
    sorted.slice(0, 2).map((row) => row.id),
    ["botw", "totk"],
  );
});

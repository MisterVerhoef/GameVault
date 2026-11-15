import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  shouldQueryIgdbLiveSearch,
  mergeCatalogueAndIgdbSearch,
  catalogueTitleMatchCount,
} = loadTsModule("src/data/hybrid-search.ts");
const { searchMatchTier } = loadTsModule("src/data/search-rank.ts");

test("shouldQueryIgdbLiveSearch ignores summary-only catalogue hits", () => {
  const catalogue = Array.from({ length: 12 }, (_, index) => ({
    title: index === 0 ? "Syndicate" : `Streets of Rage ${index}`,
  }));
  assert.equal(catalogueTitleMatchCount("syndicate", catalogue), 1);
  assert.equal(searchMatchTier("syndicate", catalogue[1].title), 0);
  assert.equal(shouldQueryIgdbLiveSearch("syndicate", catalogue), true);
});

test("mergeCatalogueAndIgdbSearch ranks exact title matches and dedupes ids", () => {
  const catalogue = [
    { id: "49", title: "Syndicate", platforms: ["PC"] },
    { id: "50", title: "Syndicate: American Revolt", platforms: ["PC"] },
  ];
  const igdb = [
    { id: "2115", title: "Syndicate", releaseYear: 2012, rating: 73.4 },
    { id: "49", title: "Syndicate (duplicate)", releaseYear: 1993 },
  ];
  const merged = mergeCatalogueAndIgdbSearch("syndicate", catalogue, igdb);
  assert.deepEqual(new Set(merged.map((game) => game.id)), new Set(["49", "2115", "50"]));
  const syndicates = merged.filter((game) => game.title === "Syndicate");
  assert.equal(syndicates.length, 2);
  assert.ok(syndicates.some((game) => game.id === "2115" && game.releaseYear === 2012));
  assert.ok(merged[merged.length - 1].title.startsWith("Syndicate:"));
});

test("shouldQueryIgdbLiveSearch skips IGDB when many exact title matches", () => {
  const catalogue = Array.from({ length: 5 }, (_, index) => ({
    title: `Syndicate ${index}`,
  }));
  catalogue.unshift({ title: "Syndicate" });
  assert.equal(shouldQueryIgdbLiveSearch("syndicate", catalogue), false);
});
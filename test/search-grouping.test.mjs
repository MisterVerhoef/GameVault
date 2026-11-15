import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  buildSearchGroupingIndex,
  groupIgdbSearchHits,
  groupSearchMatches,
  listGroupedVariants,
  pickCanonicalMember,
  stripConservativeEditionSuffix,
} = loadTsModule("src/data/search-grouping.ts");

const zeldaSlice = [
  { id: "1026", title: "The Legend of Zelda: A Link to the Past", releaseYear: 1991, rating: 96 },
  { id: "229416", title: "The Legend of Zelda: A Link to the Past", releaseYear: 2002, rating: 90 },
  { id: "1029", title: "The Legend of Zelda: Ocarina of Time", releaseYear: 1998, rating: 99 },
  { id: "405460", title: "The Legend of Zelda: Ocarina of Time", releaseYear: 2023, rating: 95 },
  { id: "7346", title: "The Legend of Zelda: Breath of the Wild", releaseYear: 2017, rating: 97 },
  {
    id: "338072",
    title: "The Legend of Zelda: Breath of the Wild - Nintendo Switch 2 Edition",
    releaseYear: 2025,
    rating: 90,
  },
  { id: "119388", title: "The Legend of Zelda: Tears of the Kingdom", releaseYear: 2023, rating: 96 },
  {
    id: "338073",
    title: "The Legend of Zelda: Tears of the Kingdom - Nintendo Switch 2 Edition",
    releaseYear: 2025,
    rating: 94,
  },
  { id: "1028", title: "The Legend of Zelda: Link's Awakening", releaseYear: 1993, rating: 90 },
  { id: "1027", title: "The Legend of Zelda: Link's Awakening DX", releaseYear: 1998, rating: 92 },
  { id: "1030", title: "The Legend of Zelda: Majora's Mask", releaseYear: 2000, rating: 95 },
];

test("stripConservativeEditionSuffix only strips when a base title exists", () => {
  const known = new Set([
    "the legend of zelda breath of the wild",
    "the legend of zelda links awakening",
  ]);
  assert.equal(
    stripConservativeEditionSuffix(
      "The Legend of Zelda: Breath of the Wild - Nintendo Switch 2 Edition",
      known,
    ),
    "The Legend of Zelda: Breath of the Wild",
  );
  assert.equal(
    stripConservativeEditionSuffix("The Legend of Zelda: Link's Awakening DX", known),
    "The Legend of Zelda: Link's Awakening",
  );
  assert.equal(
    stripConservativeEditionSuffix("The Legend of Zelda: Majora's Mask 3D", known),
    "The Legend of Zelda: Majora's Mask 3D",
  );
});

test("pickCanonicalMember prefers the original release", () => {
  const canonical = pickCanonicalMember([
    { id: "338072", title: "Breath of the Wild - Edition", releaseYear: 2025 },
    { id: "7346", title: "The Legend of Zelda: Breath of the Wild", releaseYear: 2017, rating: 97 },
  ]);
  assert.equal(canonical.id, "7346");
});

test("groupSearchMatches returns one Zelda row per title cluster", () => {
  const matches = zeldaSlice.filter((game) => game.title.toLowerCase().includes("zelda"));
  const grouped = groupSearchMatches(matches, zeldaSlice);
  const titles = grouped.map((game) => game.id);
  assert.equal(titles.includes("1026"), true);
  assert.equal(titles.includes("229416"), false);
  assert.equal(titles.includes("7346"), true);
  assert.equal(titles.includes("338072"), false);
  assert.equal(titles.includes("1028"), true);
  assert.equal(titles.includes("1027"), false);
  assert.equal(titles.includes("1030"), true);
});

test("listGroupedVariants lists ports under the canonical game", () => {
  const index = buildSearchGroupingIndex(zeldaSlice);
  const variants = listGroupedVariants("7346", zeldaSlice);
  assert.deepEqual(
    variants.map((row) => row.id),
    ["338072"],
  );
  assert.equal(index.canonicalIdByGameId.get("338072"), "7346");
});

test("groupIgdbSearchHits merges live IGDB duplicates", () => {
  const grouped = groupIgdbSearchHits([
    { id: "7346", title: "The Legend of Zelda: Breath of the Wild", releaseYear: 2017, rating: 97 },
    {
      id: "338072",
      title: "The Legend of Zelda: Breath of the Wild - Nintendo Switch 2 Edition",
      releaseYear: 2025,
      versionParentId: "7346",
    },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].id, "7346");
});

test("groupIgdbSearchHits keeps same title across different release years", () => {
  const grouped = groupIgdbSearchHits([
    { id: "49", title: "Syndicate", releaseYear: 1993, rating: 83 },
    { id: "1006", title: "Syndicate", releaseYear: 2012, rating: 73 },
    { id: "213754", title: "Syndicate", releaseYear: 1993, rating: 70 },
  ]);
  assert.deepEqual(
    grouped.map((hit) => hit.id).sort(),
    ["1006", "49"],
  );
});
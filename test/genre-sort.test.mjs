import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  GENRE_SORT_OPTIONS,
  browseQuery,
  compareGenreBrowse,
  parseGenreSort,
  platformFilterHref,
  releaseOnForGame,
} = loadTsModule("src/data/browse.ts");
const { createBrowseCatalogue, buildLibraryView, readHomeQuery } = loadTsModule("src/data/library-view.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function game(overrides) {
  return {
    id: "id",
    slug: "slug",
    title: "Title",
    platforms: ["PC"],
    genres: ["Action"],
    ...overrides,
  };
}

function order(sort, games) {
  return [...games].sort((left, right) => compareGenreBrowse(sort, left, right)).map((entry) => entry.id);
}

test("critic sort uses the IGDB aggregate, keeps zero, and puts missing or invalid scores last", () => {
  const games = [
    game({ id: "missing", title: "Missing", rating: 99 }),
    game({ id: "zero", title: "Zero", aggregatedRating: 0, rating: 10 }),
    game({ id: "high", title: "High", aggregatedRating: 90, rating: 1 }),
    game({ id: "low", title: "Low", aggregatedRating: 12.5 }),
    game({ id: "nan", title: "Nan", aggregatedRating: Number.NaN, rating: 80 }),
    game({ id: "negative", title: "Negative", aggregatedRating: -1, rating: 70 }),
    game({ id: "infinite", title: "Infinite", aggregatedRating: Number.POSITIVE_INFINITY, rating: 60 }),
  ];

  assert.deepEqual(order("critic-desc", games), ["high", "low", "zero", "infinite", "missing", "nan", "negative"]);
  assert.deepEqual(order("critic-asc", games), ["zero", "low", "high", "infinite", "missing", "nan", "negative"]);
});

test("equal critic scores break ties by title then game id", () => {
  const games = [
    game({ id: "b", title: "Same", aggregatedRating: 80 }),
    game({ id: "a", title: "Same", aggregatedRating: 80 }),
    game({ id: "c", title: "Earlier", aggregatedRating: 80 }),
  ];

  assert.deepEqual(order("critic-desc", games), ["c", "a", "b"]);
  assert.deepEqual(order("critic-asc", games), ["c", "a", "b"]);
});

test("release sort uses real days, keeps partials honest, and puts unknown dates last", () => {
  const games = [
    game({ id: "day", title: "Day", releaseOn: "2020-06-15" }),
    game({ id: "month", title: "Month", releaseOn: "2020-06" }),
    game({ id: "quarter", title: "Quarter", releaseOn: "2020-Q2" }),
    game({ id: "year", title: "Year", releaseOn: "2020" }),
    game({ id: "newer-year", title: "Newer Year", releaseOn: "2021" }),
    game({ id: "january", title: "January", releaseOn: "2020-01" }),
    game({ id: "new-year-day", title: "New Year Day", releaseOn: "2020-01-02" }),
    game({ id: "late-quarter", title: "Late Quarter", releaseOn: "2020-Q4" }),
    game({ id: "missing", title: "Missing" }),
    game({ id: "tbd", title: "Tbd", releaseOn: "TBD" }),
    game({ id: "bogus-day", title: "Bogus Day", releaseOn: "2020-02-31" }),
    game({ id: "zero", title: "Zero Year", releaseOn: "0000" }),
  ];

  assert.deepEqual(order("released-asc", games), [
    "year",
    "january",
    "new-year-day",
    "quarter",
    "month",
    "day",
    "late-quarter",
    "newer-year",
    "bogus-day",
    "missing",
    "tbd",
    "zero",
  ]);
  assert.deepEqual(order("released-desc", games), [
    "newer-year",
    "late-quarter",
    "day",
    "month",
    "quarter",
    "new-year-day",
    "january",
    "year",
    "bogus-day",
    "missing",
    "tbd",
    "zero",
  ]);
});

test("equal release dates break ties by title then game id", () => {
  const games = [
    game({ id: "b", title: "Same", releaseOn: "2019-03-01" }),
    game({ id: "a", title: "Same", releaseOn: "2019-03-01" }),
    game({ id: "c", title: "Earlier", releaseOn: "2019-03-01" }),
  ];

  assert.deepEqual(order("released-desc", games), ["c", "a", "b"]);
  assert.deepEqual(order("released-asc", games), ["c", "a", "b"]);
});

test("first-release tokens keep real days and do not invent a day from a year", () => {
  assert.equal(releaseOnForGame({
    id: "matched",
    releaseYear: 2020,
    releases: [
      { platform: "PC", date: "2020-06-15" },
      { platform: "PS5", date: "2020-11-01" },
    ],
  }), "2020-06-15");

  assert.equal(releaseOnForGame({
    id: "rerelease",
    releaseYear: 1998,
    updatedAt: "2026-11-02",
    releases: [{ platform: "PC", date: "2019-06-05" }],
  }), "1998");

  assert.equal(releaseOnForGame({
    id: "day-only",
    releases: [{ platform: "PC", date: "2019-06-05" }],
  }), "2019-06-05");

  assert.equal(releaseOnForGame({
    id: "month",
    releaseYear: 2024,
    releases: [{ platform: "Switch", label: "Sep 2024" }],
  }), "2024-09");

  assert.equal(releaseOnForGame({
    id: "quarter",
    releaseYear: 2026,
    releases: [{ platform: "Xbox", label: "Q4 2026" }],
  }), "2026-Q4");

  assert.equal(releaseOnForGame({
    id: "tbd-year",
    releaseYear: 1989,
    releases: [{ platform: "NES", label: "TBD" }],
  }), "1989");

  assert.equal(releaseOnForGame({
    id: "tbd",
    releases: [{ platform: "PC", label: "TBD" }],
    updatedAt: "2026-11-02",
  }), undefined);

  assert.equal(releaseOnForGame({
    id: "invalid-day",
    releaseYear: 2022,
    releases: [{ platform: "PC", date: "2022-02-31", label: "Feb 2022" }],
  }), "2022-02");

  assert.equal(releaseOnForGame({
    id: "bad-year",
    releaseYear: 0,
    releases: [{ platform: "PC", label: "TBD" }],
  }), undefined);
});

test("sort query values round-trip and invalid values are ignored", () => {
  assert.equal(parseGenreSort(null), "default");
  assert.equal(parseGenreSort("  critic-desc "), "critic-desc");
  assert.equal(parseGenreSort("metacritic"), "default");
  assert.equal(parseGenreSort("rating"), "default");
  assert.equal(parseGenreSort("released"), "default");

  assert.equal(browseQuery({ genre: "action", sort: "default" }), "/?genre=action");
  assert.equal(
    browseQuery({ genre: "action", platform: "PC", family: "PC", sort: "released-asc" }),
    "/?family=PC&platform=PC&genre=action&sort=released-asc",
  );

  const parsed = readHomeQuery({
    genre: "rpg",
    platform: "PS5",
    family: "PlayStation",
    variant: "PS4",
    exclusives: "1",
    search: "halo",
    sort: " critic-asc ",
  });
  assert.equal(parsed.sort, "critic-asc");
  assert.equal(parsed.genre, "rpg");
  assert.equal(parsed.platform, "PS5");
  assert.equal(browseQuery(parsed), "/?search=halo&family=PlayStation&platform=PS5&variant=PS4&genre=rpg&exclusives=1&sort=critic-asc");
  assert.equal(readHomeQuery({ genre: "action", sort: "not-a-sort" }).sort, "default");
  assert.equal(readHomeQuery({ sort: ["released-desc", "nope"] }).sort, "released-desc");
  assert.equal(browseQuery(readHomeQuery({ genre: "action", sort: "nope" })), "/?genre=action");
  assert.equal(GENRE_SORT_OPTIONS.some((option) => /metacritic/i.test(option.label)), false);
  assert.equal(GENRE_SORT_OPTIONS.filter((option) => option.value !== "default").every((option) => option.label.length > 0), true);
});

test("PlayStation to PS5 from a genre keeps the genre and a validated sort", () => {
  const reported = {
    family: "PlayStation",
    platform: "PS5",
    variant: "PS5",
  };
  const afterFamily = platformFilterHref("?genre=action&sort=critic-desc", {
    family: "PlayStation",
    platform: "PS5",
  });
  assert.equal(afterFamily, "/?family=PlayStation&platform=PS5&genre=action&sort=critic-desc");
  assert.equal(
    platformFilterHref(afterFamily, reported),
    "/?family=PlayStation&platform=PS5&variant=PS5&genre=action&sort=critic-desc",
  );

  for (const sort of ["critic-asc", "released-desc", "released-asc"]) {
    assert.equal(
      platformFilterHref(`?genre=action&sort=${sort}`, reported),
      `/?family=PlayStation&platform=PS5&variant=PS5&genre=action&sort=${sort}`,
    );
  }

  assert.equal(
    platformFilterHref("?genre=action", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5&genre=action",
  );
  assert.equal(
    platformFilterHref("?genre=action&sort=default", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5&genre=action",
  );
  assert.equal(
    platformFilterHref("?genre=action&sort=metacritic", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5&genre=action",
  );
  assert.equal(
    platformFilterHref("?genre=action&sort=not-a-sort", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5&genre=action",
  );
});

test("platform filters outside a genre keep the normal landing URL", () => {
  const reported = {
    family: "PlayStation",
    platform: "PS5",
    variant: "PS5",
  };
  assert.equal(
    platformFilterHref("", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5",
  );
  assert.equal(
    platformFilterHref("?family=PC&platform=PC", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5",
  );
  assert.equal(
    platformFilterHref("?sort=critic-desc", reported),
    "/?family=PlayStation&platform=PS5&variant=PS5",
  );
  assert.equal(
    platformFilterHref("?search=halo", { search: "halo", family: "PlayStation", platform: "PS5" }),
    "/?search=halo&family=PlayStation&platform=PS5",
  );
  assert.equal(
    platformFilterHref("?genre=action&sort=critic-desc&family=PlayStation&platform=PS5", {
      search: "",
      family: null,
      platform: null,
      variant: null,
    }),
    "/?genre=action&sort=critic-desc",
  );
});

function catalogueFrom(records) {
  return createBrowseCatalogue({
    schemaVersion: 1,
    games: records.map((record) => game(record)),
  }, {
    schemaVersion: 1,
    games: records.map((record) => ({ id: record.id, terms: `${record.id} ${record.title}`.toLowerCase() })),
  });
}

test("genre results sort the full set before pagination and leave other shelves alone", () => {
  const records = [
    ...Array.from({ length: 55 }, (_, index) => ({
      id: `g${String(index).padStart(2, "0")}`,
      title: `Game ${String(index).padStart(2, "0")}`,
      rating: index === 0 ? 1 : 100 - index,
      aggregatedRating: index === 7 ? undefined : index,
      releaseOn: index === 11 ? undefined : `20${String(20 + (index % 30)).padStart(2, "0")}-01-${String((index % 27) + 1).padStart(2, "0")}`,
      platforms: ["PC"],
      genres: ["Action"],
    })),
    { id: "ps5-high", title: "PlayStation Only", rating: 100, aggregatedRating: 100, releaseOn: "2099-01-01", platforms: ["PS5"], genres: ["Action"] },
    { id: "zz", title: "Tie", rating: 5, aggregatedRating: 10, releaseOn: "2020-01-01", platforms: ["PC"], genres: ["Action"] },
    { id: "aa", title: "Tie", rating: 5, aggregatedRating: 10, releaseOn: "2020-01-01", platforms: ["PC"], genres: ["Action"] },
  ];
  const catalogue = catalogueFrom(records);
  const pageSize = 48;
  const pc = records.filter((record) => record.platforms.includes("PC"));

  const newest = buildLibraryView(catalogue, readHomeQuery({ genre: "action", platform: "PC", sort: "released-desc" }), []);
  const full = newest.wall.games.map((entry) => entry.id);
  assert.equal(full.length > pageSize, true);
  assert.equal(newest.wall.games.some((entry) => entry.id === "ps5-high"), false);
  const expectedNewest = [...pc].sort((left, right) => {
    if (left.releaseOn && !right.releaseOn) return -1;
    if (!left.releaseOn && right.releaseOn) return 1;
    return (right.releaseOn ?? "").localeCompare(left.releaseOn ?? "")
      || left.title.localeCompare(right.title)
      || left.id.localeCompare(right.id);
  }).map((record) => record.id);
  assert.deepEqual(full, expectedNewest);
  assert.deepEqual(full.slice(0, pageSize), expectedNewest.slice(0, pageSize));
  assert.notDeepEqual(full.slice(0, pageSize), pc.slice(0, pageSize).map((record) => record.id));

  const critic = buildLibraryView(catalogue, readHomeQuery({ genre: "action", platform: "PC", sort: "critic-desc" }), []);
  const criticIds = critic.wall.games.map((entry) => entry.id);
  assert.equal(criticIds[0], "g54");
  assert.equal(criticIds.at(-1), "g07");
  const tieAt = criticIds.indexOf("aa");
  assert.equal(criticIds[tieAt + 1], "zz");
  assert.ok(criticIds.indexOf("g10") < tieAt);

  const unsorted = buildLibraryView(catalogue, readHomeQuery({ genre: "action", platform: "PC" }), []);
  assert.deepEqual(
    unsorted.wall.games.slice(0, 3).map((entry) => entry.id),
    ["g01", "g02", "g03"],
  );

  const shelves = buildLibraryView(catalogue, readHomeQuery({ sort: "critic-desc" }), []);
  assert.equal(shelves.wall, null);
  assert.deepEqual(
    shelves.genreRows.find((row) => row.key === "action").games.slice(0, 3).map((entry) => entry.id),
    ["ps5-high", "g01", "g02"],
  );

  const search = buildLibraryView(catalogue, readHomeQuery({ search: "game", genre: "action", sort: "critic-asc" }), []);
  assert.equal(search.wall.title.startsWith("Search results"), true);
  assert.deepEqual(
    search.wall.games.map((entry) => entry.id),
    catalogue.games.filter((entry) => entry.title.startsWith("Game")).map((entry) => entry.id),
  );

  const exclusives = buildLibraryView(catalogue, readHomeQuery({ platform: "PS5", exclusives: "1", sort: "critic-asc" }), []);
  assert.equal(exclusives.wall.title.includes("Exclusives"), true);
  assert.deepEqual(exclusives.wall.games.map((entry) => entry.id), ["ps5-high"]);
});

test("browse records keep a critic score separate from the user rating", () => {
  const catalogue = createBrowseCatalogue({
    schemaVersion: 1,
    games: [
      game({ id: "scored", aggregatedRating: 0, rating: 99, releaseOn: "2020-05-01" }),
      game({ id: "user-only", rating: 88, releaseOn: "nope" }),
      game({ id: "bad-score", aggregatedRating: -4, rating: 70 }),
    ],
  }, null);

  assert.equal(catalogue.byId.get("scored").aggregatedRating, 0);
  assert.equal(catalogue.byId.get("scored").rating, 99);
  assert.equal(catalogue.byId.get("scored").releaseOn, "2020-05-01");
  assert.equal(catalogue.byId.get("user-only").aggregatedRating, undefined);
  assert.equal(catalogue.byId.get("user-only").releaseOn, undefined);
  assert.equal(catalogue.byId.get("bad-score").aggregatedRating, undefined);
});

test("committed browse index stores critic scores and first-release tokens without the full catalogue", () => {
  const catalogue = JSON.parse(readFileSync(path.join(root, "public/catalog/games-index.json"), "utf8"));
  const browse = JSON.parse(readFileSync(path.join(root, "public/catalog/browse-index.json"), "utf8"));
  const byId = new Map(browse.games.map((entry) => [entry.id, entry]));
  assert.equal(byId.get("9146").aggregatedRating, 0);
  const withScore = catalogue.games.filter((entry) => typeof entry.aggregatedRating === "number" && entry.aggregatedRating >= 0);
  const withoutScore = catalogue.games.filter((entry) => !(typeof entry.aggregatedRating === "number" && Number.isFinite(entry.aggregatedRating) && entry.aggregatedRating >= 0));
  assert.ok(withScore.length > 0);
  assert.ok(withoutScore.some((entry) => typeof entry.rating === "number"));
  for (const entry of withScore) {
    assert.equal(byId.get(entry.id).aggregatedRating, entry.aggregatedRating);
  }
  for (const entry of withoutScore) {
    assert.equal(byId.get(entry.id).aggregatedRating, undefined);
    assert.equal(Object.hasOwn(byId.get(entry.id), "aggregatedRating"), false);
  }
  for (const entry of catalogue.games) {
    const card = byId.get(entry.id);
    const expected = releaseOnForGame(entry);
    assert.equal(card.releaseOn, expected);
    assert.equal("releases" in card, false);
    assert.equal(card.releaseOn === entry.updatedAt, false);
  }
  const bytes = readFileSync(path.join(root, "public/catalog/browse-index.json")).length;
  assert.ok(bytes < 2_500_000, `browse index is ${bytes} bytes`);
});

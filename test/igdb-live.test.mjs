import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { dedupeIgdbAgainstCatalogue } = loadTsModule("src/lib/igdb/dedupe.ts");
const { LruCache } = loadTsModule("src/lib/igdb/lru-cache.ts");
const { RequestThrottle } = loadTsModule("src/lib/igdb/throttle.ts");
const { normalizeIgdbQuery } = loadTsModule("src/lib/igdb/normalize-query.ts");
const {
  buildIgdbSearchBody,
  buildIgdbExactNameSearchBody,
  mergeIgdbLiveSearchRows,
  igdbSearchCacheControl,
  IGDB_SEARCH_CACHE_CONTROL,
  IGDB_SEARCH_CACHE_CONTROL_EMPTY,
} = loadTsModule("src/lib/igdb/search-api.ts");
const {
  buildPopularCatalogQuery,
  buildRecentCatalogQuery,
  dedupeIgdbGamesLastWins,
  mergeIgdbGamesPreferPrimary,
  paginateIgdbQuery,
  firstReleaseWindowUnix,
  resolveRecentSyncConfig,
  DEFAULT_IGDB_RECENT_PAST_MONTHS,
  DEFAULT_IGDB_RECENT_FUTURE_MONTHS,
  DEFAULT_IGDB_RECENT_LIMIT,
  DEFAULT_IGDB_RECENT_PAGES,
} = loadTsModule("src/lib/igdb/catalog-sync-selection.ts");

test("normalizeIgdbQuery collapses whitespace and lowercases", () => {
  assert.equal(normalizeIgdbQuery("  Foo\tBAR  "), "foo bar");
});

test("dedupeIgdbAgainstCatalogue removes catalogue ids", () => {
  const catalogue = new Set(["1", "42"]);
  const hits = [
    { id: "1", title: "In catalogue" },
    { id: "99", title: "Only IGDB" },
    { id: "42", title: "Also in catalogue" },
    { id: "100", title: "Live only" },
  ];
  assert.deepEqual(dedupeIgdbAgainstCatalogue(hits, catalogue), [
    { id: "99", title: "Only IGDB" },
    { id: "100", title: "Live only" },
  ]);
});

test("LruCache evicts oldest entries", () => {
  const cache = new LruCache({ maxEntries: 2 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.set("c", 3);
  assert.equal(cache.has("a"), true);
  assert.equal(cache.has("b"), false);
  assert.equal(cache.has("c"), true);
});

test("buildIgdbSearchBody uses game_type filter and escapes quotes", () => {
  const body = buildIgdbSearchBody('Say "Hello"');
  assert.match(body, /game_type = \(0,8,9,10,11\)/);
  assert.match(body, /game_type = null/);
  assert.doesNotMatch(body, /category =/);
  assert.match(body, /search "Say \\"Hello\\"";/);
  assert.match(body, /parent_game,version_parent/);
  assert.match(body, /version_parent = null/);
});

test("buildIgdbExactNameSearchBody escapes titles for exact-name lookup", () => {
  const body = buildIgdbExactNameSearchBody('Say "Hello"');
  assert.match(body, /name ~ "Say \\"Hello\\""/);
  assert.doesNotMatch(body, /^\s*search /m);
  assert.match(body, /sort total_rating_count desc;/);
});

test("mergeIgdbLiveSearchRows keeps exact-name rows ahead of fuzzy rows", () => {
  const merged = mergeIgdbLiveSearchRows(
    [{ id: "1", title: "A" }],
    [{ id: "2", title: "B" }, { id: "1", title: "A dup" }],
  );
  assert.deepEqual(
    merged.map((row) => row.id),
    ["1", "2"],
  );
});

test("igdbSearchCacheControl uses long TTL for hits and short for empty", () => {
  assert.equal(igdbSearchCacheControl(1), IGDB_SEARCH_CACHE_CONTROL);
  assert.equal(igdbSearchCacheControl(0), IGDB_SEARCH_CACHE_CONTROL_EMPTY);
  assert.match(IGDB_SEARCH_CACHE_CONTROL, /s-maxage=86400/);
  assert.match(IGDB_SEARCH_CACHE_CONTROL_EMPTY, /s-maxage=60/);
});

test("buildRecentCatalogQuery filters main games by release window and popularity", () => {
  const reference = new Date("2026-05-15T12:00:00.000Z");
  const body = buildRecentCatalogQuery({
    limit: 100,
    pastMonths: 18,
    futureMonths: 6,
    referenceDate: reference,
  });
  const { start, end } = firstReleaseWindowUnix(18, 6, reference);
  assert.match(body, /game_type = \(0,8,9,10,11\)/);
  assert.match(body, /version_parent = null/);
  assert.doesNotMatch(body, /category =/);
  assert.match(body, new RegExp(`first_release_date >= ${start}`));
  assert.match(body, new RegExp(`first_release_date <= ${end}`));
  assert.match(body, /platforms != null/);
  assert.match(body, /sort hypes desc;/);
  assert.match(body, /limit 100;/);
});

test("buildPopularCatalogQuery keeps rating sort and platform filter", () => {
  const body = buildPopularCatalogQuery(250);
  assert.match(body, /where platforms != null;/);
  assert.match(body, /sort rating desc;/);
  assert.match(body, /limit 250;/);
});

test("mergeIgdbGamesPreferPrimary keeps rating rows and adds new recent ids", () => {
  const primary = [
    { id: 1, name: "Rated", rating: 90 },
    { id: 2, name: "Also rated" },
  ];
  const recent = [
    { id: 2, name: "Recent duplicate", rating: undefined },
    { id: 3, name: "New release" },
  ];
  const merged = mergeIgdbGamesPreferPrimary(primary, recent);
  assert.equal(merged.length, 3);
  assert.equal(merged.find((g) => g.id === 2)?.name, "Also rated");
  assert.equal(merged.find((g) => g.id === 3)?.name, "New release");
});

test("dedupeIgdbGamesLastWins lets later search hits replace earlier pages", () => {
  const games = [
    { id: 10, slug: "old" },
    { id: 11, slug: "one" },
    { id: 10, slug: "new" },
  ];
  assert.deepEqual(dedupeIgdbGamesLastWins(games), [
    { id: 10, slug: "new" },
    { id: 11, slug: "one" },
  ]);
});

test("paginateIgdbQuery applies limit and offset", () => {
  const base = buildPopularCatalogQuery(500);
  const paged = paginateIgdbQuery(base, 500, 1500);
  assert.match(paged, /limit 500; offset 1500;/);
});

test("resolveRecentSyncConfig uses documented defaults", () => {
  const config = resolveRecentSyncConfig({});
  assert.equal(config.pastMonths, DEFAULT_IGDB_RECENT_PAST_MONTHS);
  assert.equal(config.futureMonths, DEFAULT_IGDB_RECENT_FUTURE_MONTHS);
  assert.equal(config.limit, DEFAULT_IGDB_RECENT_LIMIT);
  assert.equal(config.pages, DEFAULT_IGDB_RECENT_PAGES);
  assert.equal(config.sort, "hypes desc;");
});

test("RequestThrottle limits burst rate", async () => {
  const throttle = new RequestThrottle(4);
  const started = [];
  const tasks = Array.from({ length: 6 }, () => throttle.acquire().then(() => started.push(Date.now())));
  await Promise.all(tasks);
  assert.equal(started.length, 6);
  const span = started[5] - started[0];
  assert.ok(span >= 200, `expected spacing across 6 calls, span was ${span}ms`);
});

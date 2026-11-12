import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { dedupeIgdbAgainstCatalogue } = loadTsModule("src/lib/igdb/dedupe.ts");
const { LruCache } = loadTsModule("src/lib/igdb/lru-cache.ts");
const { RequestThrottle } = loadTsModule("src/lib/igdb/throttle.ts");
const { normalizeIgdbQuery } = loadTsModule("src/lib/igdb/normalize-query.ts");

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

test("RequestThrottle limits burst rate", async () => {
  const throttle = new RequestThrottle(4);
  const started = [];
  const tasks = Array.from({ length: 6 }, () =>
    throttle.acquire().then(() => started.push(Date.now())),
  );
  await Promise.all(tasks);
  assert.equal(started.length, 6);
  const span = started[5] - started[0];
  assert.ok(span >= 200, `expected spacing across 6 calls, span was ${span}ms`);
});

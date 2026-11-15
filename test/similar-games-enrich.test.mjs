import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { enrichOffCatalogueContentRefs } = loadTsModule("src/lib/igdb/enrich-off-catalogue-refs.ts");
const { enrichSimilarGamesForApi } = loadTsModule("src/lib/igdb/similar-games-api.ts");
const { fetchIgdbGamesByIds, __testBasicGameCache } = loadTsModule("src/lib/igdb/client.ts");
const { mapIgdbBasicRecord } = loadTsModule("src/lib/igdb/map-basic-record.ts");
const { TtlCache } = loadTsModule("src/lib/igdb/ttl-cache.ts");

const previousMock = process.env.IGDB_MOCK;

before(() => {
  process.env.IGDB_MOCK = "1";
});

after(() => {
  if (previousMock === undefined) delete process.env.IGDB_MOCK;
  else process.env.IGDB_MOCK = previousMock;
});

test("mapIgdbBasicRecord normalizes cover and platform names", () => {
  const mapped = mapIgdbBasicRecord({
    id: 210585,
    name: "Soulstone Survivors",
    first_release_date: 1_662_854_400,
    cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co6wmo.jpg" },
    platforms: [{ name: "PC (Microsoft Windows)" }],
  });
  assert.equal(mapped?.id, "210585");
  assert.equal(mapped?.title, "Soulstone Survivors");
  assert.equal(mapped?.releaseYear, 2022);
  assert.match(mapped?.cover?.url ?? "", /t_cover_big/);
  assert.deepEqual(mapped?.platforms, ["Windows"]);
});

test("fetchIgdbGamesByIds batches mock ids and caches hits", async () => {
  const first = await fetchIgdbGamesByIds(["210585", "999999999"]);
  assert.equal(first.get("210585")?.title, "Soulstone Survivors");
  assert.equal(first.get("999999999"), null);
  const cache = __testBasicGameCache();
  assert.ok(cache.has("210585"));
  const second = await fetchIgdbGamesByIds(["210585"]);
  assert.equal(second.get("210585")?.title, "Soulstone Survivors");
});

test("TtlCache stores hit and miss entries", () => {
  const cache = new TtlCache({ hitTtlMs: 60_000, missTtlMs: 1000, maxEntries: 4 });
  cache.set("hit", { id: "1", title: "A" }, true);
  cache.set("miss", null, false);
  assert.equal(cache.get("hit")?.title, "A");
  assert.equal(cache.get("miss"), null);
});

test("enrichSimilarGamesForApi reports live hits for enriched covers", async () => {
  const refs = [{ id: "210585", title: "Soulstone Survivors" }];
  const { refs: enriched, hasLiveHits } = await enrichSimilarGamesForApi(refs);
  assert.equal(hasLiveHits, true);
  assert.match(enriched[0].cover?.url ?? "", /images\.igdb\.com/);
});

test("enrichOffCatalogueContentRefs fills cover for off-catalogue refs", async () => {
  const refs = [
    { id: "7346", title: "In catalogue", cover: { url: "https://example.com/in.jpg" } },
    { id: "210585", title: "Soulstone Survivors" },
  ];
  const enriched = await enrichOffCatalogueContentRefs(refs, (id) => id === "7346");
  assert.equal(enriched[0].title, "In catalogue");
  assert.match(enriched[1].cover?.url ?? "", /images\.igdb\.com/);
  assert.equal(enriched[1].title, "Soulstone Survivors");
});
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  cloudServicesForGame,
  indexCloudStreaming,
  matchCloudTitle,
  normalizeCloudTitle,
  parsePlayStationConceptId,
  parseSteamAppId,
} = loadTsModule("src/data/cloud-streaming.ts");

test("normalizes titles without introducing fuzzy matches", () => {
  assert.equal(normalizeCloudTitle("Baldur’s Gate 3"), "baldurs gate 3");
  assert.equal(normalizeCloudTitle("Tom Clancy's The Division 2"), "tom clancys the division 2");
  assert.equal(matchCloudTitle({ title: "Hades", releaseYear: 2020 }, [
    { id: "1", title: "Hades", year: 2018 },
  ]), undefined);
  assert.equal(matchCloudTitle({ title: "Hades" }, [
    { id: "1", title: "Hades" },
    { id: "2", title: "Hades" },
  ]), undefined);
  assert.deepEqual(matchCloudTitle({ title: "Baldur's Gate 3", releaseYear: 2023 }, [
    { id: "1", title: "Baldur’s Gate 3", year: 2024 },
  ]), { id: "1", title: "Baldur’s Gate 3", year: 2024 });
});

test("extracts stable Steam and PlayStation identifiers from store URLs", () => {
  assert.equal(parseSteamAppId("https://store.steampowered.com/app/1240440/Halo_Infinite/"), "1240440");
  assert.equal(parseSteamAppId("https://example.com/app/1240440"), undefined);
  assert.equal(parsePlayStationConceptId("https://store.playstation.com/en-nl/concept/10001850"), "10001850");
  assert.equal(parsePlayStationConceptId("https://example.com/concept/10001850"), undefined);
});

test("indexes only valid Netherlands cloud services and deduplicates each service", () => {
  const index = indexCloudStreaming({
    schemaVersion: 1,
    region: "NL",
    generatedAt: "2026-11-05T00:00:00.000Z",
    games: {
      "game-1": {
        services: [
          { id: "xbox-cloud", name: "Xbox Cloud Gaming", tier: "Game Pass Ultimate", url: "https://www.xbox.com/play", match: "external-id", checkedAt: "2026-11-05" },
          { id: "xbox-cloud", name: "Duplicate", url: "https://www.xbox.com/play", match: "exact-title", checkedAt: "2026-11-05" },
          { id: "ps-plus", name: "PlayStation Plus", tier: "Premium", url: "http://invalid.example", match: "exact-title", checkedAt: "2026-11-05" },
        ],
      },
    },
  });
  assert.deepEqual(cloudServicesForGame(index, "game-1").map((service) => service.id), ["xbox-cloud"]);
  assert.deepEqual(cloudServicesForGame(index, "missing"), []);
});

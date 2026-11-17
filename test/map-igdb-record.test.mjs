import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { mapIgdbApiRecord } = loadTsModule("src/lib/igdb/map-record.ts");
const {
  buildIgdbLiveGameByIdQuery,
  buildIgdbLiveGameCoreByIdQuery,
  igdbLiveGameFieldClause,
} = loadTsModule("src/lib/igdb/catalog-sync-selection.ts");

test("buildIgdbLiveGameByIdQuery requests catalogue sync fields and live detail expansions", () => {
  const body = buildIgdbLiveGameByIdQuery(133305);
  assert.match(body, /screenshots\.url/);
  assert.match(body, /videos\.video_id/);
  assert.match(body, /keywords\.name/);
  assert.match(body, /where id = 133305;/);
});

test("live game field clause excludes invalid games-endpoint expansions", () => {
  const clause = igdbLiveGameFieldClause();
  assert.doesNotMatch(clause, /\beditions\./);
  assert.doesNotMatch(clause, /game_time_to_beats\./);
  assert.doesNotMatch(clause, /\bports,\s/);
});

test("buildIgdbLiveGameCoreByIdQuery keeps screenshots, videos, and similar games", () => {
  const body = buildIgdbLiveGameCoreByIdQuery(133305);
  assert.match(body, /screenshots\.url/);
  assert.match(body, /videos\.video_id/);
  assert.match(body, /similar_games\.id/);
  assert.doesNotMatch(body, /\beditions\./);
});

test("mapIgdbApiRecord maps screenshots, trailers, and metadata into Game", () => {
  const game = mapIgdbApiRecord({
    id: 133305,
    name: "Chorus",
    slug: "chorus",
    summary: "Space combat adventure.",
    first_release_date: 1609372800,
    platforms: [{ id: 6, name: "PC (Microsoft Windows)" }],
    cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/coabcd.jpg" },
    genres: [{ name: "Shooter" }],
    themes: [{ name: "Science fiction" }],
    screenshots: [
      { url: "//images.igdb.com/igdb/image/upload/t_thumb/sc1.jpg", width: 1920, height: 1080 },
    ],
    videos: [{ id: 42, name: "Reveal", video_id: "abc123xyz" }],
    similar_games: [{ id: 77, name: "Freelancer", cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co77.jpg" } }],
    game_time_to_beats: [{ normally: 72000, count: 12 }],
    keywords: [{ name: "Space" }],
    game_modes: [{ name: "Single player" }],
    player_perspectives: [{ name: "Third person" }],
    involved_companies: [
      { developer: true, publisher: true, company: { id: 1, name: "Fishlabs" } },
    ],
    release_dates: [
      {
        date: 1609372800,
        human: "Dec 2020",
        platform: { id: 6, name: "PC (Microsoft Windows)" },
        release_region: { region: "worldwide" },
      },
    ],
  });

  assert.ok(game);
  assert.equal(game.title, "Chorus");
  assert.equal(game.screenshots.length, 1);
  assert.match(game.screenshots[0].url, /t_screenshot_huge\/sc1\.jpg/);
  assert.equal(game.videos[0]?.url, "https://www.youtube.com/watch?v=abc123xyz");
  assert.deepEqual(game.keywords, ["Space"]);
  assert.equal(game.similarGames[0]?.id, "77");
  assert.equal(game.timeToBeat?.normally, 72000);
});
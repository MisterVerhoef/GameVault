import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";
import { normalizeIgdbExport } from "../scripts/providers/igdb.mjs";

const { findCatalogueEntry, normalizeExternalGame } = loadTsModule("src/data/catalogue.ts");
const { gameIsPlatformExclusive, gameMatchesPlatformVariant, isPcPlatformBrowse, resolveIgdbPlatform } = loadTsModule("src/data/platforms.ts");
const { browseQuery, gameMatchesGenre } = loadTsModule("src/data/browse.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/igdb-export.json", import.meta.url), "utf8"),
);

test("normalizes IGDB records into the provider-neutral import shape", () => {
  const [game] = normalizeIgdbExport(fixture);

  assert.equal(game.id, "1942");
  assert.equal(game.title, "Baldur's Gate 3");
  assert.deepEqual([...game.platforms].sort(), ["Other", "PC", "PS5"]);
  assert.deepEqual([...game.platformVariants].sort(), ["PS5", "Stadia", "Windows"]);
  assert.equal(game.releaseYear, 2023);
  assert.equal(game.cover, "https://images.igdb.com/igdb/image/upload/t_cover_big/bg3.jpg");
  assert.equal(game.ratingCount, 2500);
  assert.deepEqual(game.developers, [{ id: "1", name: "Larian Studios" }]);
  assert.equal(game.themes[0], "Fantasy");
  assert.equal(game.screenshots[0].width, 1920);
  assert.equal(game.videos[0].url, "https://www.youtube.com/watch?v=abc123");
  assert.deepEqual(game.dlc, [{ id: "2001", title: "DLC One" }]);
  assert.deepEqual(game.warnings, []);
});

test("maps navbar platform chips to IGDB platform variant labels", () => {
  assert.equal(resolveIgdbPlatform("PC (Microsoft Windows)").variant, "Windows");
  assert.equal(resolveIgdbPlatform("Nintendo Switch").family, "Switch");
  assert.equal(resolveIgdbPlatform("Sega Dreamcast").family, "Other");

  assert.equal(
    gameMatchesPlatformVariant({ platformVariants: ["PC (Microsoft Windows)", "Windows"] }, "Windows"),
    true,
  );
  assert.equal(
    gameMatchesPlatformVariant({ platformVariants: ["Nintendo Switch"] }, "Switch"),
    true,
  );
});

test("treats a single platform as exclusive and keeps other releases out", () => {
  const ps2 = { platforms: ["PS5"], platformVariants: ["PS2"] };
  const ps2AndPs3 = { platforms: ["PS5"], platformVariants: ["PS2", "PS3"] };
  const xboxGenerations = { platforms: ["Xbox"], platformVariants: ["Xbox One", "Xbox Series"] };
  const dreamcast = { platforms: ["Other"], platformVariants: ["Dreamcast"] };
  const segaPair = { platforms: ["Other"], platformVariants: ["Dreamcast", "Genesis"] };
  const windows = { platforms: ["PC"], platformVariants: ["Windows"] };
  const gameBoyAdvance = { platforms: ["Switch"], platformVariants: ["Game Boy Advance"] };

  assert.equal(gameIsPlatformExclusive(ps2, { platform: "PS5", variant: "PS2" }), true);
  assert.equal(gameIsPlatformExclusive(ps2AndPs3, { platform: "PS5", variant: "PS2" }), false);
  assert.equal(gameIsPlatformExclusive(ps2, { platform: "PS5", variant: null }), true);
  assert.equal(gameIsPlatformExclusive(ps2AndPs3, { platform: "PS5", variant: null }), true);
  assert.equal(gameIsPlatformExclusive(xboxGenerations, { platform: "Xbox", variant: "Xbox One" }), false);
  assert.equal(gameIsPlatformExclusive(xboxGenerations, { platform: "Xbox", variant: null }), true);
  assert.equal(gameIsPlatformExclusive(dreamcast, { platform: "Other", variant: "Dreamcast" }), true);
  assert.equal(gameIsPlatformExclusive(dreamcast, { platform: "Other", variant: "Sega" }), true);
  assert.equal(gameIsPlatformExclusive(segaPair, { platform: "Other", variant: "Dreamcast" }), false);
  assert.equal(gameIsPlatformExclusive(segaPair, { platform: "Other", variant: "Sega" }), true);
  assert.equal(gameIsPlatformExclusive(windows, { platform: "PC", variant: null }), false);
  assert.equal(gameIsPlatformExclusive(windows, { platform: "PC", variant: "Windows" }), false);
  assert.equal(gameIsPlatformExclusive(gameBoyAdvance, { platform: "Switch", variant: "Game Boy" }), true);
  assert.equal(isPcPlatformBrowse("PC", null), true);
  assert.equal(isPcPlatformBrowse("PS5", "PS2"), false);
  assert.equal(browseQuery({ family: "PlayStation", platform: "PS5", variant: "PS2", genre: "action" }), "/?family=PlayStation&platform=PS5&variant=PS2&genre=action");
});

test("genre browse uses catalogue tags and keeps plot text out of action", () => {
  assert.equal(gameMatchesGenre({ title: "A", genres: ["Shooter"], themes: ["Action"] }, "action"), true);
  assert.equal(gameMatchesGenre({ title: "B", genres: ["Puzzle"], themes: [], summary: "fast action" }, "action"), false);
  assert.equal(gameMatchesGenre({ title: "C", genres: ["Role-playing (RPG)"], themes: [] }, "rpg"), true);
  assert.equal(gameMatchesGenre({ title: "D", genres: ["Indie"], themes: [] }, "Indie Favorites"), true);
  assert.equal(gameMatchesGenre({ title: "E", genres: ["Adventure"], themes: [], summary: "online co-op" }, "multiplayer"), true);
  assert.equal(gameMatchesGenre({ title: "F", genres: ["Quiz/Trivia"], themes: [] }, "Quiz/Trivia"), true);
});

test("imports sega-only IGDB platforms into the Other family", () => {
  const [game] = normalizeIgdbExport([
    {
      id: 42,
      name: "Sonic Adventure",
      slug: "sonic-adventure",
      platforms: [{ name: "Dreamcast" }],
    },
  ]);

  assert.equal(game.id, "42");
  assert.deepEqual(game.platforms, ["Other"]);
  assert.deepEqual(game.platformVariants, ["Dreamcast"]);
  assert.deepEqual(game.warnings, []);
});

test("search index rebuild is idempotent against the committed catalogue", () => {
  const searchIndexPath = path.join(root, "public", "catalog", "search-index.json");
  const before = readFileSync(searchIndexPath, "utf8");
  const result = spawnSync(process.execPath, ["scripts/build-search-index.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(searchIndexPath, "utf8"), before);
});

test("demo catalogue generation does not overwrite the published IGDB index", () => {
  const publishedPath = path.join(root, "public", "catalog", "games-index.json");
  const before = readFileSync(publishedPath, "utf8");
  const result = spawnSync(process.execPath, ["scripts/generate-catalogue.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(publishedPath, "utf8"), before);
});

test("resolves similar-game ids to catalogue entries without guessing by title", () => {
  const catalogue = [
    { id: "7346", title: "Breath of the Wild", source: [{ id: "7346" }] },
    { id: "222486", title: "Silent Hill 3", source: [{ id: "igdb-remaster" }] },
    { id: "other", title: "Silent Hill 3", source: [{ id: "unused" }] },
  ];

  assert.equal(findCatalogueEntry(catalogue, "7346")?.id, "7346");
  assert.equal(findCatalogueEntry(catalogue, "igdb-remaster")?.id, "222486");
  assert.equal(findCatalogueEntry(catalogue, "482"), undefined);
  assert.equal(
    findCatalogueEntry(
      [
        { id: "canonical", title: "Shared", source: [{ id: "canonical" }] },
        { id: "other", title: "Shared", source: [{ id: "canonical" }] },
      ],
      "canonical",
    )?.id,
    "canonical",
  );
});

test("normalizes protocol-relative media URLs before they are rendered", () => {
  const game = normalizeExternalGame({
    id: "protocol-relative",
    title: "Protocol Relative",
    platforms: ["PC"],
    cover: "//images.igdb.com/igdb/image/upload/t_cover_big/example.jpg",
    screenshots: [{ url: "//images.igdb.com/igdb/image/upload/t_screenshot_big/example.jpg", width: 1920, height: 1080 }],
  }, "igdb", "2026-01-01");

  assert.equal(game.cover.url, "https://images.igdb.com/igdb/image/upload/t_cover_big/example.jpg");
  assert.equal(game.screenshots[0].url, "https://images.igdb.com/igdb/image/upload/t_screenshot_big/example.jpg");
});

test("rejects malformed provider exports", () => {
  assert.throws(() => normalizeIgdbExport({ games: "not-an-array" }), /games array/);
});

test("imports an IGDB fixture through the CLI and records provenance", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gamevault-catalogue-"));
  const outputPath = path.join(directory, "index.json");
  const reportPath = path.join(directory, "quality.json");
  const result = spawnSync(process.execPath, [
    "scripts/import-catalogue.mjs",
    "--input",
    "test/fixtures/igdb-export.json",
    "--provider",
    "igdb",
    "--source-version",
    "fixture-2026",
    "--output",
    outputPath,
    "--report",
    reportPath,
  ], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  const imported = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(imported.provenance.provider, "igdb");
  assert.equal(imported.provenance.sourceVersion, "fixture-2026");
  assert.equal(imported.provenance.sourceChecksum.length, 64);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.deepEqual(report.warnings, []);
  await rm(directory, { recursive: true, force: true });
});

test("rejects duplicate IDs through the CLI", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gamevault-catalogue-"));
  const inputPath = path.join(directory, "duplicates.json");
  await writeFile(inputPath, JSON.stringify([
    { id: "duplicate", title: "One", platforms: ["PC"] },
    { id: "duplicate", title: "Two", platforms: ["PC"] },
  ]));
  const result = spawnSync(process.execPath, [
    "scripts/import-catalogue.mjs",
    "--input",
    inputPath,
    "--output",
    path.join(directory, "index.json"),
  ], { encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate imported game id/);
  await rm(directory, { recursive: true, force: true });
});

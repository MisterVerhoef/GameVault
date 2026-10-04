import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { normalizeIgdbExport } from "../scripts/providers/igdb.mjs";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/igdb-export.json", import.meta.url), "utf8"),
);

test("normalizes IGDB records into the provider-neutral import shape", () => {
  const [game] = normalizeIgdbExport(fixture);

  assert.equal(game.id, "1942");
  assert.equal(game.title, "Baldur's Gate 3");
  assert.deepEqual(game.platforms, ["PC", "PS5"]);
  assert.equal(game.releaseYear, 2023);
  assert.equal(game.cover, "https://images.igdb.com/igdb/image/upload/t_cover_big/bg3.jpg");
  assert.equal(game.ratingCount, 2500);
  assert.deepEqual(game.developers, [{ id: "1", name: "Larian Studios" }]);
  assert.equal(game.themes[0], "Fantasy");
  assert.equal(game.screenshots[0].width, 1920);
  assert.equal(game.videos[0].url, "https://www.youtube.com/watch?v=abc123");
  assert.deepEqual(game.dlc, [{ id: "2001", title: "DLC One" }]);
  assert.deepEqual(game.warnings, ["Unsupported IGDB platform omitted: Google Stadia"]);
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
  assert.deepEqual(report.warnings, ["Unsupported IGDB platform omitted: Google Stadia"]);
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

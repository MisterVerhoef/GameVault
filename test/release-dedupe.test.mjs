import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { dedupeReleaseRows } = loadTsModule("src/data/release-dedupe.ts");
const { igdbPlatformLabel } = loadTsModule("src/data/platforms.ts");

test("igdbPlatformLabel maps GBA platform id and abbreviation", () => {
  assert.equal(igdbPlatformLabel("Game Boy", 24), "Game Boy Advance");
  assert.equal(igdbPlatformLabel("GBA"), "Game Boy Advance");
});

test("dedupeReleaseRows keeps distinct Commodore-family systems", () => {
  const rows = dedupeReleaseRows([
    { platform: "Amiga", date: "1993-12-31" },
    { platform: "Amiga CD32", date: "1993-06-06" },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.platform).sort(), ["Amiga", "Amiga CD32"]);
});

test("dedupeReleaseRows keeps earliest dated release per specific platform", () => {
  const rows = dedupeReleaseRows([
    { platform: "Windows", date: "2015-08-09" },
    { platform: "Windows", date: "2012-02-07" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, "2012-02-07");
});

test("dedupeReleaseRows collapses syndicate amiga releases to specific labels", () => {
  const rows = dedupeReleaseRows([
    { platform: "Amiga", date: "1993-12-31", platformId: 16 },
    { platform: "Commodore", date: "1993-06-06", platformId: 15 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.platform === "Amiga")?.date, "1993-12-31");
  assert.equal(rows.find((row) => row.platform === "Commodore")?.date, "1993-06-06");
});
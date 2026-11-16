import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { dedupeReleaseRows } = loadTsModule("src/data/release-dedupe.ts");

test("dedupeReleaseRows merges duplicate canonical platforms on the same day", () => {
  const rows = dedupeReleaseRows([
    { platform: "Commodore C64/128", date: "1983-10-01" },
    { platform: "Commodore", date: "1983-10-01" },
    { platform: "Commodore 16", date: "1984-05-01" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].platform, "Commodore");
  assert.equal(rows[0].date, "1983-10-01");
});

test("dedupeReleaseRows keeps separate days for the same platform", () => {
  const rows = dedupeReleaseRows([
    { platform: "Windows", date: "2012-02-07" },
    { platform: "Windows", date: "2015-08-09" },
  ]);
  assert.equal(rows.length, 2);
});
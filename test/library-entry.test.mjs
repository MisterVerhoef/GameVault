import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  clampPersonalRating,
  normalizeLibraryEntry,
  normalizeLibraryState,
  updateLibraryEntry,
} = loadTsModule("src/context/library-entry.ts");

test("keeps personal rating and notes on a library entry", () => {
  const entry = normalizeLibraryEntry({
    status: "playing",
    progress: 40,
    rating: 4,
    notes: "Second act is excellent.",
    updatedAt: "2026-10-01T00:00:00.000Z",
  });

  assert.deepEqual(entry, {
    status: "playing",
    progress: 40,
    rating: 4,
    notes: "Second act is excellent.",
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
});

test("still accepts library entries saved before ratings existed", () => {
  const entry = normalizeLibraryEntry({
    status: "wishlist",
    progress: 0,
    updatedAt: "2026-09-01T00:00:00.000Z",
  });

  assert.equal(entry?.status, "wishlist");
  assert.equal(entry?.rating, undefined);
  assert.equal(entry?.notes, undefined);
});

test("drops ratings outside 1 to 5 and blank notes", () => {
  assert.equal(clampPersonalRating(0), undefined);
  assert.equal(clampPersonalRating(6), undefined);
  assert.equal(clampPersonalRating("4"), 4);
  assert.equal(clampPersonalRating(3.6), 4);

  const entry = normalizeLibraryEntry({
    status: "completed",
    progress: 140,
    rating: 9,
    notes: "   ",
    updatedAt: "2026-10-02T00:00:00.000Z",
  });

  assert.equal(entry?.progress, 100);
  assert.equal(entry?.rating, undefined);
  assert.equal(entry?.notes, undefined);
});

test("keeps rating and notes when status, progress, or the other field changes", () => {
  const saved = {
    status: "playing",
    progress: 25,
    rating: 5,
    notes: "Co-op night.",
    updatedAt: "2026-10-04T00:00:00.000Z",
  };
  const stamped = "2026-10-05T00:00:00.000Z";

  assert.equal(updateLibraryEntry(saved, { status: "paused" }, stamped)?.notes, "Co-op night.");
  assert.equal(updateLibraryEntry(saved, { progress: 80 }, stamped)?.rating, 5);
  assert.equal(updateLibraryEntry(saved, { notes: "Still co-op." }, stamped)?.rating, 5);
  assert.equal(updateLibraryEntry(saved, { rating: null }, stamped)?.notes, "Co-op night.");
  assert.equal(updateLibraryEntry(saved, { rating: null }, stamped)?.rating, undefined);
  assert.equal(updateLibraryEntry(saved, { notes: "" }, stamped)?.rating, 5);
  assert.equal(updateLibraryEntry(saved, { notes: "" }, stamped)?.notes, undefined);
  assert.equal(updateLibraryEntry(undefined, { notes: "   " }), null);
});

test("truncates long notes and skips entries with an unknown status", () => {
  const notes = "a".repeat(600);
  const state = normalizeLibraryState({
    kept: { status: "paused", progress: 10, notes, updatedAt: "2026-10-03T00:00:00.000Z" },
    dropped: { status: "abandoned", progress: 10, notes: "nope", updatedAt: "2026-10-03T00:00:00.000Z" },
  });

  assert.equal(state.kept.notes?.length, 500);
  assert.equal(state.dropped, undefined);
});

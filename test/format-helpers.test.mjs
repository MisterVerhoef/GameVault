import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { formatRating } = loadTsModule("src/data/format-rating.ts");
const { formatCount } = loadTsModule("src/data/game-facts.ts");

test("formatRating returns an empty string for missing or NaN ratings", () => {
  assert.equal(formatRating(undefined), "");
  assert.equal(formatRating(Number.NaN), "");
});

test("formatRating leaves whole scores without decimal places", () => {
  assert.equal(formatRating(100), "100");
  assert.equal(formatRating(85.004), "85");
});

test("formatRating rounds fractional scores to two decimal places", () => {
  assert.equal(formatRating(85.5), "85.50");
  assert.equal(formatRating(72.456), "72.46");
});

test("formatCount returns an empty string for invalid or non-positive counts", () => {
  assert.equal(formatCount(undefined), "");
  assert.equal(formatCount(0), "");
  assert.equal(formatCount(-1), "");
  assert.equal(formatCount(Number.POSITIVE_INFINITY), "");
});

test("formatCount rounds and formats counts using en-GB separators", () => {
  assert.equal(formatCount(2324), "2,324");
  assert.equal(formatCount(12.6), "13");
});

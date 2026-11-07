import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const { formatRating } = loadTsModule("src/data/format-rating.ts");
const { formatCount } = loadTsModule("src/data/game-facts.ts");

test("formatRating returns an empty string for missing or invalid ratings", () => {
  assert.equal(formatRating(undefined), "");
  assert.equal(formatRating(null), "");
  assert.equal(formatRating(Number.NaN), "");
  assert.equal(formatRating(Number.POSITIVE_INFINITY), "");
  assert.equal(formatRating(Number.NEGATIVE_INFINITY), "");
});

test("formatRating shows exactly one decimal for whole scores, zero, and fractions", () => {
  assert.equal(formatRating(90), "90.0");
  assert.equal(formatRating(100), "100.0");
  assert.equal(formatRating(0), "0.0");
  assert.equal(formatRating(85.5), "85.5");
  assert.equal(formatRating(9.7), "9.7");
  assert.equal(formatRating(9), "9.0");
});

test("formatRating rounds to one decimal and keeps the original scale", () => {
  assert.equal(formatRating(87.34), "87.3");
  assert.equal(formatRating(87.35), "87.4");
  assert.equal(formatRating(72.456), "72.5");
  assert.equal(formatRating(85.004), "85.0");
  assert.equal(formatRating(85.85), "85.9");
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

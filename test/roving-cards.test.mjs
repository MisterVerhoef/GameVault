import assert from "node:assert/strict";
import test from "node:test";
import { nextRovingIndex } from "../src/components/roving-cards.mjs";

test("arrow keys move through a horizontal row and leave vertical keys to the page", () => {
  const columns = 5;
  assert.equal(nextRovingIndex(0, 5, columns, "ArrowRight"), 1);
  assert.equal(nextRovingIndex(4, 5, columns, "ArrowRight"), 4);
  assert.equal(nextRovingIndex(0, 5, columns, "ArrowLeft"), 0);
  assert.equal(nextRovingIndex(3, 5, columns, "ArrowLeft"), 2);
  assert.equal(nextRovingIndex(2, 5, columns, "Home"), 0);
  assert.equal(nextRovingIndex(2, 5, columns, "End"), 4);
  assert.equal(nextRovingIndex(0, 5, columns, "ArrowDown"), null);
  assert.equal(nextRovingIndex(4, 5, columns, "ArrowUp"), null);
  assert.equal(nextRovingIndex(0, 5, columns, "Enter"), null);
});

test("arrow keys move by row on a wrapping vault grid", () => {
  assert.equal(nextRovingIndex(0, 5, 2, "ArrowRight"), 1);
  assert.equal(nextRovingIndex(1, 5, 2, "ArrowRight"), 2);
  assert.equal(nextRovingIndex(1, 5, 2, "ArrowDown"), 3);
  assert.equal(nextRovingIndex(0, 5, 2, "ArrowDown"), 2);
  assert.equal(nextRovingIndex(4, 5, 2, "ArrowDown"), null);
  assert.equal(nextRovingIndex(3, 5, 2, "ArrowUp"), 1);
  assert.equal(nextRovingIndex(2, 5, 2, "ArrowUp"), 0);
  assert.equal(nextRovingIndex(0, 5, 2, "ArrowUp"), null);
  assert.equal(nextRovingIndex(4, 5, 2, "End"), 4);
});

test("rejects an index outside the group", () => {
  assert.equal(nextRovingIndex(-1, 4, 2, "ArrowRight"), null);
  assert.equal(nextRovingIndex(4, 4, 2, "Home"), null);
  assert.equal(nextRovingIndex(0, 0, 1, "ArrowRight"), null);
});

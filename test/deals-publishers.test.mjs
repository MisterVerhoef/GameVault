import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  reconcilePublisherQuery,
  dropPublisherSlugsForOptions,
  formatDroppedFiltersNote,
} = loadTsModule("src/data/deals-publishers.ts");

const options = [
  { slug: "alpha-interactive", name: "Alpha Interactive", count: 2 },
  { slug: "bravo-publishing", name: "Bravo Publishing", count: 1 },
];

test("reconcilePublisherQuery counts slugs missing from the active platform", () => {
  const { slugs, droppedCount } = reconcilePublisherQuery("alpha-interactive,delta-studios", options);
  assert.deepEqual(slugs, ["alpha-interactive"]);
  assert.equal(droppedCount, 1);
});

test("dropPublisherSlugsForOptions removes invalid selections", () => {
  const { slugs, droppedCount } = dropPublisherSlugsForOptions(
    ["alpha-interactive", "delta-studios"],
    options,
  );
  assert.deepEqual(slugs, ["alpha-interactive"]);
  assert.equal(droppedCount, 1);
});

test("formatDroppedFiltersNote pluralizes for PlayStation", () => {
  assert.equal(formatDroppedFiltersNote(1, "PlayStation"), "1 filter didn't apply to PlayStation");
  assert.equal(formatDroppedFiltersNote(2, "PlayStation"), "2 filters didn't apply to PlayStation");
  assert.equal(formatDroppedFiltersNote(0, "PlayStation"), "");
});
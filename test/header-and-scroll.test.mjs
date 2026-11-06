import assert from "node:assert/strict";
import test from "node:test";
import { nextHeaderFit, shouldCompactDesktopSearch, shouldHidePlatformLabels } from "../src/components/header-fit.mjs";
import { scrollEdges } from "../src/components/scroll-edges.mjs";

test("scroll arrows are off at an end and on only when that direction can move", () => {
  assert.deepEqual(scrollEdges(0, 800, 400), { left: false, right: true });
  assert.deepEqual(scrollEdges(400, 800, 400), { left: true, right: false });
  assert.deepEqual(scrollEdges(120, 800, 400), { left: true, right: true });
  assert.deepEqual(scrollEdges(0, 400, 400), { left: false, right: false });
  assert.deepEqual(scrollEdges(0.4, 800, 400), { left: false, right: true });
  assert.deepEqual(scrollEdges(399.4, 800, 400), { left: true, right: false });
});

test("desktop search collapses when the header overflows, and stays collapsed until the field fits", () => {
  const tight = { free: 0, rowOverflow: 0, clusterOverflow: 24 };
  assert.equal(shouldCompactDesktopSearch(false, tight), true);
  assert.equal(
    shouldCompactDesktopSearch(true, { free: 80, rowOverflow: 0, clusterOverflow: 0 }),
    true,
  );
  assert.equal(
    shouldCompactDesktopSearch(true, { free: 200, rowOverflow: 0, clusterOverflow: 0 }),
    false,
  );
  assert.equal(
    shouldCompactDesktopSearch(false, { free: 40, rowOverflow: 0, clusterOverflow: 0 }),
    false,
  );
});

test("platform names hide when their row overflows and come back once the labels fit", () => {
  assert.equal(
    shouldHidePlatformLabels(false, { clusterOverflow: 20, free: 0, labeledWidth: 494, iconWidth: 0 }),
    true,
  );
  assert.equal(
    shouldHidePlatformLabels(false, { clusterOverflow: 0, free: 80, labeledWidth: 494, iconWidth: 0 }),
    false,
  );
  assert.equal(
    shouldHidePlatformLabels(true, { clusterOverflow: 0, free: 120, labeledWidth: 494, iconWidth: 232 }),
    true,
  );
  assert.equal(
    shouldHidePlatformLabels(true, { clusterOverflow: 0, free: 320, labeledWidth: 494, iconWidth: 232 }),
    false,
  );
});

test("search and platform names are not restored together unless both fit", () => {
  const tight = { free: 238, rowOverflow: 0, clusterOverflow: 0, labeledWidth: 494, iconWidth: 283 };
  assert.deepEqual(nextHeaderFit(true, true, tight), { compact: true, hideLabels: false });
  const roomy = { free: 420, rowOverflow: 0, clusterOverflow: 0, labeledWidth: 494, iconWidth: 283 };
  assert.deepEqual(nextHeaderFit(true, true, roomy), { compact: false, hideLabels: false });
  const overflowing = { free: 0, rowOverflow: 0, clusterOverflow: 112, labeledWidth: 494, iconWidth: 0 };
  assert.deepEqual(nextHeaderFit(false, false, overflowing), { compact: true, hideLabels: false });
  assert.deepEqual(nextHeaderFit(true, false, overflowing), { compact: true, hideLabels: true });
});

test("a hidden platform cluster does not keep the desktop search collapsed", () => {
  assert.equal(
    shouldCompactDesktopSearch(true, { free: 640, rowOverflow: 0, clusterOverflow: 0 }),
    false,
  );
});

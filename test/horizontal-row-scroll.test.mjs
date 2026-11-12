import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canScrollRowLeft,
  canScrollRowRight,
  maxScrollCardIndex,
  nextSnapIndex,
  scrollCardIndex,
  snapScrollLeft,
} from "../src/components/horizontal-row-scroll.mjs";

test("row scroll snaps on card strides and stops at the aligned end", () => {
  const stride = 192;
  const cardWidth = 176;
  const padLeft = 32;
  const padRight = 32;
  const clientWidth = 1280;
  const count = 20;
  const scrollWidth = padLeft + count * cardWidth + (count - 1) * (stride - cardWidth) + padRight;
  const maxIndex = maxScrollCardIndex(
    count,
    stride,
    cardWidth,
    padLeft,
    padRight,
    clientWidth,
    scrollWidth,
  );
  const visible = Math.max(
    1,
    Math.floor((clientWidth - padLeft - padRight + (stride - cardWidth)) / stride),
  );
  const byScroll = Math.floor((scrollWidth - clientWidth + 0.5) / stride);

  assert.equal(scrollCardIndex(0, stride), 0);
  assert.equal(scrollCardIndex(31, stride), 0);
  assert.equal(scrollCardIndex(96, stride), 1);
  assert.equal(maxIndex, Math.min(Math.max(0, count - visible), byScroll));
  assert.equal(snapScrollLeft(maxIndex, stride), maxIndex * stride);
  assert.equal(canScrollRowLeft(0, stride), false);
  assert.equal(canScrollRowRight(snapScrollLeft(maxIndex, stride), stride, maxIndex), false);
  assert.equal(canScrollRowRight(0, stride, maxIndex), maxIndex > 0);
  assert.equal(nextSnapIndex(0, stride, maxIndex, "right"), 1);
  assert.equal(
    nextSnapIndex(snapScrollLeft(maxIndex, stride), stride, maxIndex, "right"),
    maxIndex,
  );
});

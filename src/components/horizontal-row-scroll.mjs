/**
 * Snap positions for horizontal game rows. `scroll-padding-left` lines cards up
 * with row headings; stride is one card plus the flex gap.
 *
 * @param {number} scrollLeft
 * @param {number} stride
 */
export function scrollCardIndex(scrollLeft, stride) {
  if (!Number.isFinite(stride) || stride <= 0) return 0;
  return Math.max(0, Math.round(scrollLeft / stride));
}

/**
 * @param {number} count
 * @param {number} stride
 * @param {number} cardWidth
 * @param {number} padLeft
 * @param {number} padRight
 * @param {number} clientWidth
 * @param {number} [scrollWidth]
 */
export function maxScrollCardIndex(
  count,
  stride,
  cardWidth,
  padLeft,
  padRight,
  clientWidth,
  scrollWidth = 0,
) {
  if (!Number.isInteger(count) || count <= 0 || !Number.isFinite(stride) || stride <= 0) return 0;
  const gap = Math.max(0, stride - cardWidth);
  const visible = Math.max(1, Math.floor((clientWidth - padLeft - padRight + gap) / stride));
  let maxIndex = Math.max(0, count - visible);
  if (scrollWidth > clientWidth) {
    const rawMax = scrollWidth - clientWidth;
    const capped = Math.floor((rawMax + 0.5) / stride);
    maxIndex = Math.min(maxIndex, capped);
  }
  return maxIndex;
}

/**
 * @param {number} index
 * @param {number} stride
 */
export function snapScrollLeft(index, stride) {
  if (!Number.isFinite(stride) || stride <= 0) return 0;
  return Math.max(0, index) * stride;
}

/**
 * @param {number} scrollLeft
 * @param {number} stride
 * @param {number} maxIndex
 */
export function canScrollRowRight(scrollLeft, stride, maxIndex) {
  return scrollCardIndex(scrollLeft, stride) < maxIndex;
}

/** @param {number} scrollLeft @param {number} stride */
export function canScrollRowLeft(scrollLeft, stride) {
  return scrollCardIndex(scrollLeft, stride) > 0;
}

/**
 * @param {number} scrollLeft
 * @param {number} stride
 * @param {number} maxIndex
 * @param {"left" | "right"} direction
 */
export function nextSnapIndex(scrollLeft, stride, maxIndex, direction) {
  const current = scrollCardIndex(scrollLeft, stride);
  if (direction === "left") return Math.max(0, current - 1);
  return Math.min(maxIndex, current + 1);
}

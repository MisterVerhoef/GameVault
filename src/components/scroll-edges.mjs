/**
 * Whether a horizontal scroller can still move in each direction.
 * A one-pixel slop ignores subpixel rounding at the ends.
 *
 * @param {number} scrollLeft
 * @param {number} scrollWidth
 * @param {number} clientWidth
 * @returns {{ left: boolean, right: boolean }}
 */
export function scrollEdges(scrollLeft, scrollWidth, clientWidth) {
  const max = scrollWidth - clientWidth;
  if (!(max > 1)) return { left: false, right: false };
  const left = scrollLeft > 1;
  const right = scrollLeft < max - 1;
  return { left, right };
}

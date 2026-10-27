/**
 * Next index for arrow-key movement through a row or wrapping grid.
 * `columns` is how many cards share the first row. A horizontal scroller
 * passes its full length, so up and down stay on the page.
 *
 * @param {number} current
 * @param {number} count
 * @param {number} columns
 * @param {string} key
 * @returns {number | null} null when this key should not move focus
 */
export function nextRovingIndex(current, count, columns, key) {
  if (!Number.isInteger(count) || count <= 0 || !Number.isInteger(current) || current < 0 || current >= count) {
    return null;
  }
  const width = Math.max(1, columns);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowLeft") return Math.max(0, current - 1);
  if (key === "ArrowRight") return Math.min(count - 1, current + 1);
  if (key === "ArrowDown") {
    const next = current + width;
    return next < count ? next : null;
  }
  if (key === "ArrowUp") {
    const next = current - width;
    return next >= 0 ? next : null;
  }
  return null;
}

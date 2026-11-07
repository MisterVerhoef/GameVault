/**
 * Visible score text with exactly one decimal, such as 87.3 or 90.0.
 * Presentation only: callers keep the raw number for storage and sorting.
 * Missing and non-finite values stay blank so they are not shown as 0.0.
 */
export function formatRating(rating?: number | null): string {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return "";
  const rounded = Math.round(rating * 10) / 10;
  const text = rounded.toFixed(1);
  return text === "-0.0" ? "0.0" : text;
}

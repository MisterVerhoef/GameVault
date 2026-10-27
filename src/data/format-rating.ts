/** Whole scores such as 100 stay bare. Fractional scores keep two decimals. */
export function formatRating(rating?: number) {
  if (rating == null || Number.isNaN(rating)) return "";
  const rounded = Math.round(rating * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

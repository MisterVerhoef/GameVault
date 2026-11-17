/** Singular form when `count` is exactly 1; otherwise the plural noun (e.g. `deals`). */
export function pluralNoun(count: number, plural: string): string {
  return Math.round(count) === 1 ? plural.replace(/s$/, "") : plural;
}

export function formatShowingOf(shown: number, total: number, plural: string): string {
  return `Showing ${shown} of ${total} ${pluralNoun(total, plural)}`;
}

export function formatAllShown(total: number, plural: string): string {
  return `All ${total.toLocaleString("en-GB")} ${pluralNoun(total, plural)} shown`;
}
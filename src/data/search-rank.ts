import { byRatingThenTitle } from "./browse";
import { normalizeTitle } from "./store-match";

/** 2 = exact normalized title, 1 = title starts with query, 0 = other matches. */
export function searchTitleTier(query: string, title: string): 0 | 1 | 2 {
  const needle = normalizeTitle(query);
  const haystack = normalizeTitle(title);
  if (!needle || !haystack) return 0;
  if (haystack === needle) return 2;
  if (haystack.startsWith(`${needle} `) || haystack.startsWith(needle)) return 1;
  return 0;
}

export function compareSearchRank<T extends { title: string; rating?: number }>(
  query: string,
  left: T,
  right: T,
): number {
  const tier = searchTitleTier(query, right.title) - searchTitleTier(query, left.title);
  if (tier !== 0) return tier;
  return byRatingThenTitle(left, right);
}

export function sortSearchResults<T extends { title: string; rating?: number }>(
  query: string,
  games: readonly T[],
): T[] {
  return [...games].sort((left, right) => compareSearchRank(query, left, right));
}

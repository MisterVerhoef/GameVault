import { byRatingThenTitle } from "./browse";
import { matchesFranchiseOrCollection } from "./search-series";
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

function titleContainsQuery(query: string, title: string): boolean {
  const needle = normalizeTitle(query);
  const haystack = normalizeTitle(title);
  if (!needle || !haystack) return false;
  if (haystack.includes(` ${needle} `) || haystack.startsWith(`${needle} `) || haystack.endsWith(` ${needle}`)) {
    return true;
  }
  return haystack === needle || haystack.includes(needle);
}

export interface SearchRankable {
  title: string;
  rating?: number;
  franchises?: readonly string[];
  collections?: readonly string[];
}

/**
 * Search ranking tiers — title matches beat franchise/collection, then summary-only:
 * 4 exact title, 3 title prefix, 2 title contains, 1 franchise/collection, 0 terms-only.
 */
export function searchMatchTier(
  query: string,
  title: string,
  series?: Pick<SearchRankable, "franchises" | "collections">,
): 0 | 1 | 2 | 3 | 4 {
  const exactTier = searchTitleTier(query, title);
  if (exactTier === 2) return 4;
  if (exactTier === 1) return 3;
  if (titleContainsQuery(query, title)) return 2;
  if (series && matchesFranchiseOrCollection(query, series.franchises, series.collections)) return 1;
  return 0;
}

export function compareSearchRank<T extends SearchRankable>(query: string, left: T, right: T): number {
  const tier =
    searchMatchTier(query, right.title, right) - searchMatchTier(query, left.title, left);
  if (tier !== 0) return tier;
  return byRatingThenTitle(left, right);
}

export function sortSearchResults<T extends SearchRankable>(query: string, games: readonly T[]): T[] {
  return [...games].sort((left, right) => compareSearchRank(query, left, right));
}

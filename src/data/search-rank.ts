import { byRatingThenTitle } from "./browse";
import { matchesFranchiseOrCollection, primarySeriesMatchesQuery } from "./search-series";
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
  const leftTier = searchMatchTier(query, left.title, left);
  const rightTier = searchMatchTier(query, right.title, right);
  const tier = rightTier - leftTier;
  if (tier !== 0) return tier;
  if (leftTier === 1 && rightTier === 1) {
    const rightPrimary = primarySeriesMatchesQuery(query, right.franchises, right.collections);
    const leftPrimary = primarySeriesMatchesQuery(query, left.franchises, left.collections);
    if (rightPrimary !== leftPrimary) return Number(rightPrimary) - Number(leftPrimary);
  }
  return byRatingThenTitle(left, right);
}

export function sortSearchResults<T extends SearchRankable>(query: string, games: readonly T[]): T[] {
  return [...games].sort((left, right) => compareSearchRank(query, left, right));
}

/**
 * When the catalogue has a title match (tier ≥ 2), drop summary-only and weak
 * crossover franchise hits so search walls stay title-relevant.
 */
export function filterRelevantSearchResults<T extends SearchRankable>(
  query: string,
  games: readonly T[],
): T[] {
  if (games.length === 0) return [];
  const ranked = games.map((game) => ({
    game,
    tier: searchMatchTier(query, game.title, game),
  }));
  const hasTitleMatch = ranked.some((row) => row.tier >= 2);
  if (!hasTitleMatch) return [...games];
  return ranked
    .filter(
      ({ game, tier }) =>
        tier >= 2
        || (tier === 1 && primarySeriesMatchesQuery(query, game.franchises, game.collections)),
    )
    .map((row) => row.game);
}

export function sortAndFilterSearchResults<T extends SearchRankable>(
  query: string,
  games: readonly T[],
): T[] {
  return filterRelevantSearchResults(query, sortSearchResults(query, games));
}

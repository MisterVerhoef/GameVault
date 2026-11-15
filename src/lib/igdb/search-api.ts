import {
  IGDB_LIVE_SEARCH_GAME_TYPE_FILTER,
} from "./catalog-sync-selection";
import type { IgdbSearchHit } from "./types";

export const IGDB_SEARCH_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";
export const IGDB_SEARCH_CACHE_CONTROL_EMPTY = "public, s-maxage=60";

/** IGDB Apicalypse page size for live text search (before grouping and ranking). */
export const IGDB_LIVE_SEARCH_LIMIT = 48;
/** Exact-name search page size (merged ahead of fuzzy hits). */
export const IGDB_LIVE_EXACT_NAME_LIMIT = 10;
/** Maximum rows returned from the search API after grouping and ranking. */
export const IGDB_LIVE_SEARCH_RESULT_CAP = 24;

/** Cache-Control for IGDB search API responses (short TTL when no hits). */
export function igdbSearchCacheControl(gameCount: number): string {
  return gameCount > 0 ? IGDB_SEARCH_CACHE_CONTROL : IGDB_SEARCH_CACHE_CONTROL_EMPTY;
}

/** IGDB Apicalypse fuzzy `search` body for live title lookup. */
export function buildIgdbSearchBody(query: string): string {
  const escaped = query.trim().replace(/"/g, '\\"');
  return [
    "fields id,name,cover.url,first_release_date,rating,parent_game,version_parent;",
    `search "${escaped}";`,
    `where ${IGDB_LIVE_SEARCH_GAME_TYPE_FILTER};`,
    `limit ${IGDB_LIVE_SEARCH_LIMIT};`,
  ].join(" ");
}

/** Case-insensitive exact title match; runs on every live search. */
export function buildIgdbExactNameSearchBody(query: string): string {
  const escaped = query.trim().replace(/"/g, '\\"');
  return [
    "fields id,name,cover.url,first_release_date,rating,parent_game,version_parent;",
    `where name ~ "${escaped}" & ${IGDB_LIVE_SEARCH_GAME_TYPE_FILTER};`,
    "sort total_rating_count desc;",
    `limit ${IGDB_LIVE_EXACT_NAME_LIMIT};`,
  ].join(" ");
}

/** Exact-name rows first; fuzzy rows fill in without repeating ids. */
export function mergeIgdbLiveSearchRows(
  exactName: readonly IgdbSearchHit[],
  fuzzy: readonly IgdbSearchHit[],
): IgdbSearchHit[] {
  const seen = new Set<string>();
  const merged: IgdbSearchHit[] = [];
  for (const hit of exactName) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    merged.push(hit);
  }
  for (const hit of fuzzy) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    merged.push(hit);
  }
  return merged;
}
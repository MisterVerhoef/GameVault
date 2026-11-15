import { IGDB_MAIN_GAME_TYPE_FILTER } from "./catalog-sync-selection";

export const IGDB_SEARCH_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";
export const IGDB_SEARCH_CACHE_CONTROL_EMPTY = "public, s-maxage=60";

/** IGDB Apicalypse page size for live text search (before grouping and ranking). */
export const IGDB_LIVE_SEARCH_LIMIT = 48;
/** Maximum rows returned from the search API after grouping and ranking. */
export const IGDB_LIVE_SEARCH_RESULT_CAP = 24;

/** Cache-Control for IGDB search API responses (short TTL when no hits). */
export function igdbSearchCacheControl(gameCount: number): string {
  return gameCount > 0 ? IGDB_SEARCH_CACHE_CONTROL : IGDB_SEARCH_CACHE_CONTROL_EMPTY;
}

/** IGDB Apicalypse search body for live title lookup. */
export function buildIgdbSearchBody(query: string): string {
  const escaped = query.trim().replace(/"/g, '\\"');
  return [
    "fields id,name,cover.url,first_release_date,rating,parent_game,version_parent;",
    `search "${escaped}";`,
    `where ${IGDB_MAIN_GAME_TYPE_FILTER};`,
    `limit ${IGDB_LIVE_SEARCH_LIMIT};`,
  ].join(" ");
}
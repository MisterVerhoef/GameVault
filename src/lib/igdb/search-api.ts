export const IGDB_SEARCH_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";
export const IGDB_SEARCH_CACHE_CONTROL_EMPTY = "public, s-maxage=60";

/** Cache-Control for IGDB search API responses (short TTL when no hits). */
export function igdbSearchCacheControl(gameCount: number): string {
  return gameCount > 0 ? IGDB_SEARCH_CACHE_CONTROL : IGDB_SEARCH_CACHE_CONTROL_EMPTY;
}

/** IGDB Apicalypse search body for live title lookup. */
export function buildIgdbSearchBody(query: string): string {
  const escaped = query.trim().replace(/"/g, '\\"');
  return [
    "fields id,name,cover.url;",
    `search "${escaped}";`,
    "where game_type = (0,8,9,10,11) & version_parent = null;",
    "limit 12;",
  ].join(" ");
}
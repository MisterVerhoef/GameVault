import type { IgdbSearchHit } from "./types";

/** IGDB `game_type` values dropped from live search (bundles, mods, episodes, ports). */
export const IGDB_LIVE_SEARCH_EXCLUDED_GAME_TYPES = new Set([3, 5, 6, 7, 11, 12, 14]);

/** IGDB DLC-like types routed to the search DLC section. */
export const IGDB_LIVE_SEARCH_DLC_GAME_TYPES = new Set([1, 2, 13]);

export function isExcludedIgdbLiveSearchGameType(gameType: number | undefined): boolean {
  return gameType != null && IGDB_LIVE_SEARCH_EXCLUDED_GAME_TYPES.has(gameType);
}

export function isIgdbDlcSearchHit(hit: Pick<IgdbSearchHit, "gameType">): boolean {
  return hit.gameType != null && IGDB_LIVE_SEARCH_DLC_GAME_TYPES.has(hit.gameType);
}

export function partitionIgdbSearchHits(hits: readonly IgdbSearchHit[]): {
  games: IgdbSearchHit[];
  dlc: IgdbSearchHit[];
} {
  const games: IgdbSearchHit[] = [];
  const dlc: IgdbSearchHit[] = [];
  for (const hit of hits) {
    if (isIgdbDlcSearchHit(hit)) {
      dlc.push(hit);
    } else {
      games.push(hit);
    }
  }
  return { games, dlc };
}
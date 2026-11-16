import { byRatingThenTitle } from "./browse";
import { allGames } from "./games";

export const DEFAULT_STATIC_GAME_PAGE_COUNT = 300;

export function resolveStaticGamePageCount(env: NodeJS.ProcessEnv = process.env): number {
  const raw =
    env.GAMEVAULT_STATIC_GAME_PAGES?.trim() ||
    env.GAMEVAULT_STATIC_GAME_PREBUILD_LIMIT?.trim();
  if (!raw) return DEFAULT_STATIC_GAME_PAGE_COUNT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_STATIC_GAME_PAGE_COUNT;
  }
  return Math.min(parsed, allGames.length);
}

/** IGDB ids for the highest-rated catalogue games to pre-render at build time. */
export function staticGamePageIds(limit = resolveStaticGamePageCount()): readonly string[] {
  if (limit <= 0) return [];
  return [...allGames]
    .sort(byRatingThenTitle)
    .slice(0, limit)
    .map((game) => game.id);
}
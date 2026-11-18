import { join } from "node:path";

/** Full games catalogue; not served from `public/`. */
export const GAMES_INDEX_RELATIVE_PATH = "data/catalog/games-index.json";

export function gamesIndexAbsolutePath(cwd: string = process.cwd()): string {
  return join(cwd, GAMES_INDEX_RELATIVE_PATH);
}
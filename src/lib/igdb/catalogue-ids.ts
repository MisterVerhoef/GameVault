import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedIds: Set<string> | null = null;

/** IGDB ids present in the committed search index (same as catalogue game ids). */
export function getCatalogueIgdbIds(): Set<string> {
  if (cachedIds) return cachedIds;
  const path = join(process.cwd(), "public/catalog/search-index.json");
  try {
    const file = JSON.parse(readFileSync(path, "utf8")) as {
      games?: { id: string }[];
    };
    const ids = new Set<string>();
    for (const game of file.games ?? []) {
      if (game?.id) ids.add(String(game.id));
    }
    cachedIds = ids;
    return ids;
  } catch {
    cachedIds = new Set();
    return cachedIds;
  }
}

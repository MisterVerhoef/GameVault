import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PortFoldRow } from "@/data/port-fold";
import { normalizeTitle } from "@/data/store-match";

let peersByNormalizedTitle: Map<string, PortFoldRow[]> | null = null;

function loadPeersByTitle(): Map<string, PortFoldRow[]> {
  if (peersByNormalizedTitle) return peersByNormalizedTitle;
  const searchPath = join(process.cwd(), "public/catalog/search-index.json");
  const gamesPath = join(process.cwd(), "public/catalog/games-index.json");
  const search = JSON.parse(readFileSync(searchPath, "utf8")) as {
    games?: { id: string; title: string }[];
  };
  const gamesFile = JSON.parse(readFileSync(gamesPath, "utf8")) as {
    games?: { id: string; releaseYear?: number; ratingCount?: number }[];
  };
  const meta = new Map<string, { releaseYear?: number; ratingCount?: number }>();
  for (const game of gamesFile.games ?? []) {
    if (!game?.id) continue;
    meta.set(String(game.id), {
      ...(game.releaseYear != null ? { releaseYear: game.releaseYear } : {}),
      ...(game.ratingCount != null ? { ratingCount: game.ratingCount } : {}),
    });
  }
  peersByNormalizedTitle = new Map();
  for (const entry of search.games ?? []) {
    if (!entry?.id || !entry.title) continue;
    const details = meta.get(String(entry.id));
    const row: PortFoldRow = {
      id: String(entry.id),
      title: entry.title,
      ...(details?.releaseYear != null ? { releaseYear: details.releaseYear } : {}),
      ...(details?.ratingCount != null ? { ratingCount: details.ratingCount } : {}),
    };
    const key = normalizeTitle(entry.title);
    const bucket = peersByNormalizedTitle.get(key) ?? [];
    bucket.push(row);
    peersByNormalizedTitle.set(key, bucket);
  }
  return peersByNormalizedTitle;
}

/** Catalogue rows that may act as bases for unlinked IGDB port folding. */
export function cataloguePortPeersForTitles(titles: Iterable<string>): PortFoldRow[] {
  const byTitle = loadPeersByTitle();
  const peers: PortFoldRow[] = [];
  const seen = new Set<string>();
  for (const title of titles) {
    for (const row of byTitle.get(normalizeTitle(title)) ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      peers.push(row);
    }
  }
  return peers;
}
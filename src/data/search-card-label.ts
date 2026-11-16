import type { CatalogueCard } from "./catalogue-card";
import { normalizeTitle } from "./store-match";

/** Show release year when multiple search cards share the same title. */
export function searchCardLabel(
  game: CatalogueCard,
  games: readonly CatalogueCard[],
): string {
  const norm = normalizeTitle(game.title);
  const peers = games.filter((peer) => normalizeTitle(peer.title) === norm);
  if (peers.length > 1 && game.releaseYear != null) {
    return `${game.title} (${game.releaseYear})`;
  }
  return game.title;
}
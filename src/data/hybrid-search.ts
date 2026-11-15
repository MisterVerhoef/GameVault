import type { CatalogueCard } from "./catalogue-card";
import { searchMatchTier, sortSearchResults } from "./search-rank";
import type { IgdbSearchHit } from "@/lib/igdb/types";

export const MIN_TITLE_MATCHES_BEFORE_SKIP_IGDB = 5;

export function catalogueTitleMatchCount(
  query: string,
  games: readonly { title: string }[],
): number {
  return games.filter((game) => searchMatchTier(query, game.title) >= 2).length;
}

export function hasExactCatalogueTitleMatch(
  query: string,
  games: readonly { title: string }[],
): boolean {
  return games.some((game) => searchMatchTier(query, game.title) === 4);
}

/** Query IGDB when there is no exact title match or fewer than five title matches. */
export function shouldQueryIgdbLiveSearch(
  query: string,
  catalogueGames: readonly { title: string }[],
): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 3) return false;
  const titleMatches = catalogueTitleMatchCount(trimmed, catalogueGames);
  if (hasExactCatalogueTitleMatch(trimmed, catalogueGames) && titleMatches >= MIN_TITLE_MATCHES_BEFORE_SKIP_IGDB) {
    return false;
  }
  return !hasExactCatalogueTitleMatch(trimmed, catalogueGames) || titleMatches < MIN_TITLE_MATCHES_BEFORE_SKIP_IGDB;
}

export function igdbSearchHitToCard(hit: IgdbSearchHit): CatalogueCard {
  return {
    id: hit.id,
    title: hit.title,
    platforms: ["Other"],
    ...(hit.releaseYear != null ? { releaseYear: hit.releaseYear } : {}),
    ...(hit.rating != null ? { rating: hit.rating } : {}),
    ...(hit.cover ? { cover: hit.cover } : {}),
  };
}

export function mergeCatalogueAndIgdbSearch(
  query: string,
  catalogue: readonly CatalogueCard[],
  igdbHits: readonly IgdbSearchHit[],
): CatalogueCard[] {
  const merged = new Map<string, CatalogueCard>();
  for (const game of catalogue) {
    merged.set(game.id, game);
  }
  for (const hit of igdbHits) {
    if (!merged.has(hit.id)) {
      merged.set(hit.id, igdbSearchHitToCard(hit));
    }
  }
  return sortSearchResults(query, [...merged.values()]);
}

export function mergeSearchWallSections(
  query: string,
  sections: readonly { id: string; title: string; kind: "games" | "dlc"; games: CatalogueCard[] }[],
  igdbHits: readonly IgdbSearchHit[],
):
  | { id: string; title: string; kind: "games" | "dlc"; games: CatalogueCard[] }[]
  | undefined {
  if (sections.length === 0) return undefined;
  const igdbGames = igdbHits.filter((hit) => !sections.some((section) =>
    section.games.some((game) => game.id === hit.id),
  ));
  return sections.map((section) => {
    if (section.kind !== "games") return section;
    return {
      ...section,
      games: mergeCatalogueAndIgdbSearch(query, section.games, igdbGames),
    };
  });
}
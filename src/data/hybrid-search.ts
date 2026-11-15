import type { CatalogueCard } from "./catalogue-card";
import { searchMatchTier, sortSearchResults } from "./search-rank";
import { normalizeTitle } from "./store-match";
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

/** Drop IGDB ports whose parent is already in the catalogue search wall. */
export function dropIgdbPortsWithCatalogueParent(
  igdbHits: readonly IgdbSearchHit[],
  catalogue: readonly Pick<CatalogueCard, "id">[],
): IgdbSearchHit[] {
  const catalogueIds = new Set(catalogue.map((game) => game.id));
  return igdbHits.filter((hit) => {
    const parent = hit.versionParentId ?? hit.parentGameId;
    return !(parent && catalogueIds.has(parent));
  });
}

/** Drop IGDB rows that repeat an already-listed title and release year. */
export function filterIgdbHitsForCatalogueMerge(
  query: string,
  catalogue: readonly CatalogueCard[],
  igdbHits: readonly IgdbSearchHit[],
): IgdbSearchHit[] {
  const catalogueIds = new Set(catalogue.map((game) => game.id));
  return dropIgdbPortsWithCatalogueParent(igdbHits, catalogue).filter((hit) => {
    if (catalogueIds.has(hit.id)) return false;
    const hitNorm = normalizeTitle(hit.title);
    const sameTitleCatalogue = catalogue.filter((game) => normalizeTitle(game.title) === hitNorm);
    if (sameTitleCatalogue.length === 0) return true;
    const hitYear = hit.releaseYear;
    const duplicateYear = sameTitleCatalogue.some(
      (game) => game.releaseYear != null && hitYear != null && game.releaseYear === hitYear,
    );
    if (duplicateYear) return false;
    return searchMatchTier(query, hit.title) >= 2;
  });
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
  for (const hit of filterIgdbHitsForCatalogueMerge(query, catalogue, igdbHits)) {
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
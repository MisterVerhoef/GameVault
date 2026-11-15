import type { ContentRef } from "@/data/games";
import { findGameByProviderId } from "@/data/games";
import { enrichOffCatalogueContentRefs } from "./enrich-off-catalogue-refs";

/** Enrich similar-game refs for the client API (server-only IGDB). */
export async function enrichSimilarGamesForApi(
  refs: readonly ContentRef[],
): Promise<{ refs: ContentRef[]; hasLiveHits: boolean }> {
  const enriched = await enrichOffCatalogueContentRefs(
    refs,
    (id) => Boolean(findGameByProviderId(id)),
  );
  const hasLiveHits = enriched.some(
    (ref) => !findGameByProviderId(ref.id) && Boolean(ref.cover?.url),
  );
  return { refs: enriched, hasLiveHits };
}
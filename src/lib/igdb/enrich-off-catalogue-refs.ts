import type { ContentRef } from "@/data/games";
import { fetchIgdbGamesByIds } from "./client";

/**
 * Fill in similar-game (and other content) tiles that reference IGDB ids outside the catalogue.
 */
export async function enrichOffCatalogueContentRefs(
  refs: readonly ContentRef[],
  isInCatalogue: (id: string) => boolean,
): Promise<ContentRef[]> {
  const offCatalogueIds = [...new Set(
    refs.filter((ref) => !isInCatalogue(ref.id)).map((ref) => ref.id),
  )];
  if (offCatalogueIds.length === 0) return [...refs];

  const liveById = await fetchIgdbGamesByIds(offCatalogueIds);

  return refs.map((ref) => {
    if (isInCatalogue(ref.id)) return ref;
    const live = liveById.get(ref.id);
    if (!live) return ref;
    return {
      id: ref.id,
      title: live.title || ref.title,
      ...(live.cover ?? ref.cover ? { cover: live.cover ?? ref.cover } : {}),
    };
  });
}
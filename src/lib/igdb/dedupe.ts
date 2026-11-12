import type { IgdbSearchHit } from "./types";

/** Drop IGDB rows whose id already exists in the static catalogue index. */
export function dedupeIgdbAgainstCatalogue(
  hits: readonly IgdbSearchHit[],
  catalogueIds: ReadonlySet<string>,
): IgdbSearchHit[] {
  return hits.filter((hit) => !catalogueIds.has(hit.id));
}

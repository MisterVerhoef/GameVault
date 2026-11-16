import { searchMatchTier } from "@/data/search-rank";
import type { IgdbSearchHit } from "./types";

export function isSparseIgdbSearchHit(hit: IgdbSearchHit): boolean {
  if (hit.cover?.url) return false;
  if (hit.rating != null && Number.isFinite(hit.rating)) return false;
  if (hit.ratingCount != null && hit.ratingCount > 0) return false;
  if (hit.hasPlatforms) return false;
  if (hit.hasCompanies) return false;
  return true;
}

/** Drop fan/hack noise unless the query is an exact title match. */
export function dropIgdbSearchNoise(query: string, hits: readonly IgdbSearchHit[]): IgdbSearchHit[] {
  return hits.filter((hit) => {
    if (searchMatchTier(query, hit.title) === 4) return true;
    return !isSparseIgdbSearchHit(hit);
  });
}
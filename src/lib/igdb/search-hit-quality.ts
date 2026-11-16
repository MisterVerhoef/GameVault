import { searchMatchTier } from "@/data/search-rank";
import type { IgdbSearchHit } from "./types";

function currentUtcYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

export function hasNoIgdbRatingCount(hit: Pick<IgdbSearchHit, "ratingCount">): boolean {
  return hit.ratingCount == null || hit.ratingCount === 0;
}

/** Missing year or released before the previous calendar year. */
export function isStaleOrUnknownReleaseYear(
  hit: Pick<IgdbSearchHit, "releaseYear">,
  now: Date = new Date(),
): boolean {
  if (hit.releaseYear == null) return true;
  return hit.releaseYear < currentUtcYear(now) - 1;
}

export function shouldDropIgdbSearchNoise(
  query: string,
  hit: IgdbSearchHit,
  now: Date = new Date(),
): boolean {
  if (searchMatchTier(query, hit.title) === 4) return false;
  if (!hasNoIgdbRatingCount(hit)) return false;
  return isStaleOrUnknownReleaseYear(hit, now);
}

/** Drop low-signal IGDB rows unless the query is an exact title match. */
export function dropIgdbSearchNoise(
  query: string,
  hits: readonly IgdbSearchHit[],
  now: Date = new Date(),
): IgdbSearchHit[] {
  return hits.filter((hit) => !shouldDropIgdbSearchNoise(query, hit, now));
}
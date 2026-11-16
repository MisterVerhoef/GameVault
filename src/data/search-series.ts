import { normalizeTitle } from "./store-match";

function queryTokens(query: string): string[] {
  return normalizeTitle(query)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function seriesNameMatchesQuery(query: string, name: string): boolean {
  const haystack = normalizeTitle(name);
  const needle = normalizeTitle(query);
  if (!haystack || !needle) return false;
  if (haystack === needle) return true;
  if (haystack.includes(needle) || needle.includes(haystack)) return true;
  const tokens = queryTokens(query);
  if (tokens.length === 0) return false;
  return tokens.every((token) => haystack.includes(token));
}

/** True when the query matches an IGDB franchise or collection name, not the game title. */
export function matchesFranchiseOrCollection(
  query: string,
  franchises: readonly string[] | undefined,
  collections: readonly string[] | undefined,
): boolean {
  const names = [...(franchises ?? []), ...(collections ?? [])];
  return names.some((name) => seriesNameMatchesQuery(query, name));
}
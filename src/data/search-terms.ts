/**
 * Match a navbar query against one search-index `terms` string.
 * Terms are unique lowercase tokens joined with spaces, so punctuation in the
 * query is loosened to the same shape. A hyphenated word is not always stored
 * as one adjacent phrase (repeated tokens are dropped), so those queries also
 * match when each substantial piece is present.
 */
export function matchesSearchTerms(terms: string, query: string) {
  const raw = query.trim().toLowerCase();
  if (!raw) return true;
  if (terms.includes(raw)) return true;
  const loose = raw.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  if (loose.length > 0 && loose !== raw && terms.includes(loose)) return true;
  if (!raw.includes(" ") && loose.includes(" ")) {
    const parts = loose.split(" ").filter((token) => token.length >= 3);
    if (parts.length >= 2 && parts.every((token) => terms.includes(token))) return true;
  }
  return false;
}

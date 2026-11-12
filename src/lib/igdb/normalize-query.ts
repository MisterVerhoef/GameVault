/** Lowercase, trim, and collapse whitespace for stable cache keys. */
export function normalizeIgdbQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

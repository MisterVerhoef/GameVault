export interface GenreDefinition {
  key: string;
  label: string;
  terms: readonly string[];
  /** Multiplayer is not an IGDB genre, so the summary and description count too. */
  includeProse?: boolean;
}

export const GENRE_DEFINITIONS: readonly GenreDefinition[] = [
  { key: "action", label: "Action", terms: ["action"] },
  { key: "rpg", label: "RPG", terms: ["rpg", "role-playing"] },
  { key: "indie", label: "Indie Favorites", terms: ["indie"] },
  {
    key: "multiplayer",
    label: "Multiplayer",
    terms: ["multiplayer", "co-op", "cooperative", "online"],
    includeProse: true,
  },
];

export interface GenreGame {
  title: string;
  genres?: string[];
  themes?: string[];
  summary?: string;
  description?: string;
}

const termPatterns = new Map<string, RegExp>();

function patternFor(term: string) {
  const cached = termPatterns.get(term);
  if (cached) return cached;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i");
  termPatterns.set(term, pattern);
  return pattern;
}

export function genreDefinition(key: string): GenreDefinition | undefined {
  const normalized = key.trim().toLowerCase();
  return GENRE_DEFINITIONS.find(
    (genre) => genre.key === normalized || genre.label.toLowerCase() === normalized,
  );
}

export function genreLabel(key: string): string {
  return genreDefinition(key)?.label ?? key.trim();
}

/** Home-row genres match their tags. Any other value matches that genre name exactly. */
export function gameMatchesGenre(game: GenreGame, genreKey: string): boolean {
  const defined = genreDefinition(genreKey);
  if (!defined) {
    const needle = genreKey.trim().toLowerCase();
    return (game.genres ?? []).some((genre) => genre.toLowerCase() === needle);
  }
  const fields = [...(game.genres ?? []), ...(game.themes ?? [])];
  if (defined.includeProse) {
    if (game.summary) fields.push(game.summary);
    if (game.description) fields.push(game.description);
  }
  const haystack = fields.join("\n");
  return defined.terms.some((term) => patternFor(term).test(haystack));
}

export function byRatingThenTitle<T extends { rating?: number; title: string }>(left: T, right: T) {
  const rating = (right.rating ?? -1) - (left.rating ?? -1);
  if (rating !== 0) return rating;
  return left.title.localeCompare(right.title);
}

export function browseQuery(input: {
  search?: string | null;
  family?: string | null;
  platform?: string | null;
  variant?: string | null;
  genre?: string | null;
  exclusives?: boolean;
}) {
  const params = new URLSearchParams();
  if (input.search) params.set("search", input.search);
  if (input.family) params.set("family", input.family);
  if (input.platform) params.set("platform", input.platform);
  if (input.variant) params.set("variant", input.variant);
  if (input.genre) params.set("genre", input.genre);
  if (input.exclusives) params.set("exclusives", "1");
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

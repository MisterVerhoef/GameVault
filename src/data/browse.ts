import { isIsoDay, toReleaseDateRecord } from "./release-calendar";

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
    (genre) =>
      genre.key === normalized || genre.label.toLowerCase() === normalized,
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

export function byRatingThenTitle<T extends { rating?: number; title: string }>(
  left: T,
  right: T,
) {
  const rating = (right.rating ?? -1) - (left.rating ?? -1);
  if (rating !== 0) return rating;
  return left.title.localeCompare(right.title);
}

/** Genre-results order. `default` keeps the existing rating-then-title order. */
export type GenreSort =
  "default" | "critic-desc" | "critic-asc" | "released-desc" | "released-asc";

export const GENRE_SORT_OPTIONS: readonly {
  value: GenreSort;
  label: string;
}[] = [
  { value: "default", label: "Default order" },
  { value: "critic-desc", label: "Critic score (IGDB), highest first" },
  { value: "critic-asc", label: "Critic score (IGDB), lowest first" },
  { value: "released-desc", label: "Release date, newest first" },
  { value: "released-asc", label: "Release date, oldest first" },
];

const GENRE_SORT_VALUES = new Set<string>(
  GENRE_SORT_OPTIONS.map((option) => option.value),
);

export function parseGenreSort(value: string | null | undefined): GenreSort {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "default" || !GENRE_SORT_VALUES.has(normalized))
    return "default";
  return normalized as GenreSort;
}

/**
 * IGDB critic aggregate, 0–100. Zero is a score. Missing, negative, and
 * non-finite values are not scores. The separate IGDB `rating` is never used.
 */
export function criticScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return null;
  return value;
}

const MONTH_LABEL =
  /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})$/i;
const QUARTER_LABEL = /^q([1-4])\s+(\d{4})$/i;
const QUARTER_YEAR_LABEL = /^(\d{4})\s+q([1-4])$/i;
const YEAR_TOKEN = /^(\d{4})$/;
const MONTH_TOKEN = /^(\d{4})-(\d{2})$/;
const QUARTER_TOKEN = /^(\d{4})-Q([1-4])$/;

const MONTH_NUMBER: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function validYear(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 9999
  )
    return null;
  return value;
}

function yearToken(year: number) {
  return String(year).padStart(4, "0");
}

function monthOrQuarterToken(label: string): string | undefined {
  const text = label.trim();
  const month = MONTH_LABEL.exec(text);
  if (month) {
    const year = Number(month[2]);
    const monthNumber = MONTH_NUMBER[month[1].toLowerCase()];
    if (year >= 1 && year <= 9999 && monthNumber) {
      return `${yearToken(year)}-${String(monthNumber).padStart(2, "0")}`;
    }
  }
  const quarter = QUARTER_LABEL.exec(text) ?? QUARTER_YEAR_LABEL.exec(text);
  if (quarter) {
    const year = Number(quarter[1].length === 4 ? quarter[1] : quarter[2]);
    const quarterNumber = quarter[1].length === 4 ? quarter[2] : quarter[1];
    if (year >= 1 && year <= 9999)
      return `${yearToken(year)}-Q${quarterNumber}`;
  }
  return undefined;
}

/**
 * Compact first-release token for genre date sorting.
 *
 * A full day is the earliest real platform day from `toReleaseDateRecord`
 * whose year is IGDB `first_release_date` (`releaseYear`). That day is an
 * actual timestamp, not a label and not `updatedAt`. A platform day in
 * another year is a different release, so it is not reused and no day is
 * invented inside `releaseYear`. When `releaseYear` is absent, the earliest
 * real platform day is used on its own.
 *
 * With no usable day, a month label becomes `YYYY-MM` and a quarter label
 * becomes `YYYY-Q1`..`YYYY-Q4`. Neither is expanded to a calendar day.
 * Otherwise a valid `releaseYear` is stored as `YYYY`. Unknown and TBD
 * releases stay empty and sort last.
 */
export function releaseOnForGame(game: {
  id?: string;
  releaseYear?: number;
  releases?: { platform?: string; date?: string; label?: string }[];
}): string | undefined {
  const releases = game.releases ?? [];
  const year = validYear(game.releaseYear);
  const id = game.id || "release";
  if (year != null) {
    const inYear = releases.filter(
      (release) =>
        isIsoDay(release.date) && Number(release.date.slice(0, 4)) === year,
    );
    const day = toReleaseDateRecord({ id, releases: inYear })?.date;
    if (day) return day;
  } else {
    const day = toReleaseDateRecord({ id, releases })?.date;
    if (day) return day;
  }

  const hasRealDay = releases.some((release) => isIsoDay(release.date));
  if (!hasRealDay) {
    const label = toReleaseDateRecord({ id, releases })?.label;
    const partial = label ? monthOrQuarterToken(label) : undefined;
    if (partial) return partial;
  }
  if (year != null) return yearToken(year);
  if (!hasRealDay) {
    const label = toReleaseDateRecord({ id, releases })?.label?.trim() ?? "";
    if (YEAR_TOKEN.test(label) && label !== "0000") return label;
  }
  return undefined;
}

/** Parsed `releaseOn` token. `slot` orders year, quarter, and month without inventing a day. */
interface ReleaseOrder {
  year: number;
  slot: number;
  day: number;
}

export function releaseOrder(value: unknown): ReleaseOrder | null {
  if (typeof value !== "string") return null;
  if (isIsoDay(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    if (year < 1) return null;
    return { year, slot: month * 2, day };
  }
  const month = MONTH_TOKEN.exec(value);
  if (month) {
    const year = Number(month[1]);
    const monthNumber = Number(month[2]);
    if (year < 1 || monthNumber < 1 || monthNumber > 12) return null;
    return { year, slot: monthNumber * 2, day: 0 };
  }
  const quarter = QUARTER_TOKEN.exec(value);
  if (quarter) {
    const year = Number(quarter[1]);
    const quarterNumber = Number(quarter[2]);
    if (year < 1) return null;
    const firstMonth = (quarterNumber - 1) * 3 + 1;
    return { year, slot: firstMonth * 2 - 1, day: 0 };
  }
  const year = YEAR_TOKEN.exec(value);
  if (year && year[1] !== "0000")
    return { year: Number(year[1]), slot: 0, day: 0 };
  return null;
}

function titleThenId(
  left: { id: string; title: string },
  right: { id: string; title: string },
) {
  return (
    left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
  );
}

/** Genre-results comparator. Missing and invalid scores or dates sort last in both directions. */
export function compareGenreBrowse<
  T extends {
    id: string;
    title: string;
    rating?: number;
    aggregatedRating?: number;
    releaseOn?: string;
  },
>(sort: GenreSort, left: T, right: T) {
  if (sort === "default") return byRatingThenTitle(left, right);
  const tie = titleThenId(left, right);
  if (sort === "critic-desc" || sort === "critic-asc") {
    const leftScore = criticScore(left.aggregatedRating);
    const rightScore = criticScore(right.aggregatedRating);
    if (leftScore == null || rightScore == null) {
      if (leftScore == null && rightScore == null) return tie;
      return leftScore == null ? 1 : -1;
    }
    if (leftScore !== rightScore)
      return sort === "critic-desc"
        ? rightScore - leftScore
        : leftScore - rightScore;
    return tie;
  }
  const leftRelease = releaseOrder(left.releaseOn);
  const rightRelease = releaseOrder(right.releaseOn);
  if (leftRelease == null || rightRelease == null) {
    if (leftRelease == null && rightRelease == null) return tie;
    return leftRelease == null ? 1 : -1;
  }
  const chronological =
    leftRelease.year - rightRelease.year ||
    leftRelease.slot - rightRelease.slot ||
    leftRelease.day - rightRelease.day;
  if (chronological !== 0)
    return sort === "released-desc" ? -chronological : chronological;
  return tie;
}

export function browseQuery(input: {
  search?: string | null;
  family?: string | null;
  platform?: string | null;
  variant?: string | null;
  genre?: string | null;
  exclusives?: boolean;
  sort?: GenreSort | string | null;
}) {
  const params = new URLSearchParams();
  const sort = parseGenreSort(input.sort ?? undefined);
  if (input.search) params.set("search", input.search);
  if (input.family) params.set("family", input.family);
  if (input.platform) params.set("platform", input.platform);
  if (input.variant) params.set("variant", input.variant);
  if (input.genre) params.set("genre", input.genre);
  if (input.exclusives) params.set("exclusives", "1");
  if (sort !== "default") params.set("sort", sort);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

/**
 * Navbar platform and variant picks. A genre already in the address bar stays,
 * along with a validated non-default sort. Outside a genre view the landing
 * URL is only the platform selection.
 */
export function platformFilterHref(
  currentSearch: string,
  selection: {
    search?: string | null;
    family?: string | null;
    platform?: string | null;
    variant?: string | null;
  },
) {
  const raw = currentSearch.includes("?")
    ? currentSearch.slice(currentSearch.indexOf("?") + 1)
    : currentSearch.replace(/^\?/, "");
  const params = new URLSearchParams(raw);
  const genre = (params.get("genre") ?? "").trim();
  return browseQuery({
    search: selection.search,
    family: selection.family,
    platform: selection.platform,
    variant: selection.variant,
    genre: genre || null,
    sort: genre ? params.get("sort") : null,
  });
}

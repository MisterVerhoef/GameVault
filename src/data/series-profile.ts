export type SeriesKind = "franchise" | "collection";

export interface SeriesSourceGame {
  id: string;
  title: string;
  rating?: number;
  releaseYear?: number;
  franchises?: string[];
  collections?: string[];
  background?: { url?: string };
}

export interface SeriesRecord {
  id: string;
  name: string;
  kind: SeriesKind;
  gameIds: string[];
  yearStart?: number;
  yearEnd?: number;
  notableTitles: string[];
  backgroundUrl?: string;
  summary: string;
}

const kindField = {
  franchise: "franchises",
  collection: "collections",
} as const;

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** URL id for a franchise or collection name. IGDB only stores the name on each game. */
export function seriesSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "series";
}

export function seriesPath(kind: SeriesKind, id: string) {
  return `/${kind}/${encodeURIComponent(id)}`;
}

/** Catalogue-derived bio. IGDB only stores franchise and collection names on each game. */
export function describeSeries(input: {
  name: string;
  kind: SeriesKind;
  gameCount: number;
  yearStart?: number;
  yearEnd?: number;
  notableTitles: string[];
}) {
  const kindLabel = input.kind === "franchise" ? "franchise" : "collection";
  const count = input.gameCount === 1 ? "1 game" : `${input.gameCount} games`;
  const years = input.yearStart != null && input.yearEnd != null
    ? input.yearStart === input.yearEnd
      ? ` Catalogue releases are from ${input.yearStart}.`
      : ` Catalogue releases run from ${input.yearStart} to ${input.yearEnd}.`
    : "";
  const notable = input.notableTitles.length > 0
    ? ` Notable titles include ${joinList(input.notableTitles)}.`
    : "";
  return `${input.name} is a ${kindLabel} in the GameVault catalogue, with ${count}.${years}${notable}`;
}

export function seriesMetadata(input: {
  kind: SeriesKind;
  gameCount: number;
  yearStart?: number;
  yearEnd?: number;
}) {
  const parts = [
    input.kind === "franchise" ? "Franchise" : "Collection",
    input.gameCount === 1 ? "1 game" : `${input.gameCount} games`,
  ];
  if (input.yearStart != null && input.yearEnd != null) {
    parts.push(input.yearStart === input.yearEnd ? String(input.yearStart) : `${input.yearStart}–${input.yearEnd}`);
  }
  return parts.join(" · ");
}

export function seriesInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function byRatingThenTitle(left: SeriesSourceGame, right: SeriesSourceGame) {
  const rating = (right.rating ?? -1) - (left.rating ?? -1);
  if (rating !== 0) return rating;
  return left.title.localeCompare(right.title);
}

function uniqueSlug(name: string, used: Set<string>) {
  const base = seriesSlug(name);
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

export function collectSeries(games: readonly SeriesSourceGame[], kind: SeriesKind): SeriesRecord[] {
  const field = kindField[kind];
  const buckets = new Map<string, { name: string; ids: Set<string> }>();

  for (const game of games) {
    for (const raw of game[field] ?? []) {
      const name = raw.trim();
      if (!name) continue;
      const existing = buckets.get(name);
      if (existing) existing.ids.add(game.id);
      else buckets.set(name, { name, ids: new Set([game.id]) });
    }
  }

  const used = new Set<string>();
  const idByName = new Map<string, string>();
  for (const name of [...buckets.keys()].sort((left, right) => left.localeCompare(right))) {
    idByName.set(name, uniqueSlug(name, used));
  }

  const byGameId = new Map(games.map((game) => [game.id, game]));
  const series: SeriesRecord[] = [];

  for (const bucket of buckets.values()) {
    const seriesGames = [...bucket.ids]
      .map((id) => byGameId.get(id))
      .filter((game): game is SeriesSourceGame => Boolean(game))
      .sort(byRatingThenTitle);
    const years = seriesGames
      .map((game) => game.releaseYear)
      .filter((year): year is number => typeof year === "number");
    const notableTitles = seriesGames.slice(0, 3).map((game) => game.title);
    const backgroundUrl = seriesGames.find((game) => game.background?.url)?.background?.url;
    const yearStart = years.length > 0 ? Math.min(...years) : undefined;
    const yearEnd = years.length > 0 ? Math.max(...years) : undefined;
    series.push({
      id: idByName.get(bucket.name) ?? seriesSlug(bucket.name),
      name: bucket.name,
      kind,
      gameIds: seriesGames.map((game) => game.id),
      yearStart,
      yearEnd,
      notableTitles,
      backgroundUrl,
      summary: describeSeries({
        name: bucket.name,
        kind,
        gameCount: seriesGames.length,
        yearStart,
        yearEnd,
        notableTitles,
      }),
    });
  }

  return series.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

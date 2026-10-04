import type { Game, Platform } from "./games";

export interface CatalogueIndex {
  schemaVersion: 1;
  generatedAt: string;
  provenance?: {
    provider: string;
    importedAt?: string;
    sourceVersion?: string;
    sourceChecksum?: string;
  };
  games: Game[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const platforms: Platform[] = ["PC", "PS5", "Xbox", "Switch"];

function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && platforms.includes(value as Platform);
}

export function isGame(value: unknown): value is Game {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.genres) &&
    value.genres.every((genre) => typeof genre === "string") &&
    Array.isArray(value.platforms) &&
    value.platforms.length > 0 &&
    value.platforms.every(isPlatform) &&
    Array.isArray(value.screenshots) &&
    Array.isArray(value.videos) &&
    Array.isArray(value.websites) &&
    Array.isArray(value.dlc) &&
    Array.isArray(value.expansions) &&
    Array.isArray(value.editions) &&
    Array.isArray(value.relatedGames) &&
    Array.isArray(value.similarGames) &&
    Array.isArray(value.franchises) &&
    Array.isArray(value.collections) &&
    Array.isArray(value.source) &&
    value.source.every((source) => (
      isRecord(source) &&
      typeof source.provider === "string" &&
      typeof source.id === "string"
    )) &&
    typeof value.updatedAt === "string" &&
    value.updatedAt.length > 0
  );
}

export interface ExternalGameRecord {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
  summary?: string;
  description?: string;
  releaseYear?: number;
  year?: number;
  genres?: string[];
  genre?: string;
  themes?: string[];
  developers?: { id: string; name: string }[];
  publishers?: { id: string; name: string }[];
  platforms?: Platform[];
  platform?: Platform;
  cover?: string | { url: string; width?: number; height?: number };
  coverUrl?: string;
  background?: string | { url: string; width?: number; height?: number };
  backgroundUrl?: string;
  rating?: number;
  ratingCount?: number;
  screenshots?: { url: string; width?: number; height?: number }[];
  videos?: { id: string; name?: string; url: string }[];
  websites?: { label: string; url: string; category?: "store" | "website" | "community" }[];
  dlc?: { id: string; title: string }[];
  expansions?: { id: string; title: string }[];
  editions?: { id: string; title: string }[];
  relatedGames?: { id: string; title: string; relation: "sequel" | "prequel" | "spinoff" | "collection" | "remake" }[];
  similarGames?: { id: string; title: string }[];
  franchises?: string[];
  collections?: string[];
  source?: { provider: string; id: string };
  sourceId?: string;
  updatedAt?: string;
  warnings?: string[];
}

function normalizeMediaUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^\/\//, "https://");
}

function asImage(value: ExternalGameRecord["cover"] | ExternalGameRecord["background"], fallback?: string) {
  if (typeof value === "string") {
    const url = normalizeMediaUrl(value);
    return url ? { url } : undefined;
  }
  if (value && typeof value.url === "string") {
    const url = normalizeMediaUrl(value.url);
    return url ? { ...value, url } : undefined;
  }
  if (fallback) {
    const url = normalizeMediaUrl(fallback);
    return url ? { url } : undefined;
  }
  return undefined;
}

export function normalizeExternalGame(record: ExternalGameRecord, provider: string, updatedAt: string): Game {
  const title = record.title ?? record.name;
  if (!record.id || !title) {
    throw new Error("Each imported game requires an id and title.");
  }

  const platforms = record.platforms ?? (record.platform ? [record.platform] : []);
  if (platforms.length === 0) {
    throw new Error(`Imported game "${record.id}" requires at least one platform.`);
  }

  const sourceId = record.source?.id ?? record.sourceId ?? record.id;
  return {
    id: record.id,
    slug: record.slug ?? record.id,
    title,
    summary: record.summary ?? record.description,
    description: record.description ?? record.summary,
    releaseYear: record.releaseYear ?? record.year,
    genres: record.genres ?? (record.genre ? [record.genre] : []),
    themes: record.themes ?? [],
    developers: record.developers ?? [],
    publishers: record.publishers ?? [],
    platforms,
    cover: asImage(record.cover, record.coverUrl),
    background: asImage(record.background, record.backgroundUrl),
    rating: record.rating,
    ratingCount: record.ratingCount,
    screenshots: (record.screenshots ?? []).map((image) => ({
      url: normalizeMediaUrl(image.url) ?? "",
      width: image.width,
      height: image.height,
    })).filter((image) => image.url),
    videos: (record.videos ?? []).map((video) => ({
      id: video.id,
      name: video.name,
      url: normalizeMediaUrl(video.url) ?? video.url,
    })),
    websites: record.websites ?? [],
    dlc: record.dlc ?? [],
    expansions: record.expansions ?? [],
    editions: record.editions ?? [],
    relatedGames: record.relatedGames ?? [],
    similarGames: record.similarGames ?? [],
    franchises: record.franchises ?? [],
    collections: record.collections ?? [],
    source: [{ provider: record.source?.provider ?? provider, id: sourceId }],
    updatedAt: record.updatedAt ?? updatedAt,
  };
}

export interface CatalogueQualityReport {
  gameCount: number;
  duplicateIds: string[];
  duplicateTitles: string[];
  missingDescriptions: string[];
  invalidRelationships: { gameId: string; relation: string; targetId: string }[];
  warnings: string[];
}

export function auditCatalogue(games: Game[]): CatalogueQualityReport {
  const ids = new Set(games.map((game) => game.id));
  const titles = new Map<string, string[]>();
  const duplicateIds: string[] = [];
  const duplicateTitles: string[] = [];
  const missingDescriptions: string[] = [];
  const invalidRelationships: CatalogueQualityReport["invalidRelationships"] = [];

  for (const game of games) {
    if (games.filter((candidate) => candidate.id === game.id).length > 1 && !duplicateIds.includes(game.id)) {
      duplicateIds.push(game.id);
    }
    const titleKey = game.title.trim().toLowerCase();
    titles.set(titleKey, [...(titles.get(titleKey) ?? []), game.id]);
    if (!game.description?.trim()) missingDescriptions.push(game.id);
    for (const relation of [
      ...game.dlc.map((target) => ["dlc", target] as const),
      ...game.expansions.map((target) => ["expansion", target] as const),
      ...game.editions.map((target) => ["edition", target] as const),
      ...game.relatedGames.map((target) => ["related", target] as const),
      ...game.similarGames.map((target) => ["similar", target] as const),
    ]) {
      if (!ids.has(relation[1].id)) {
        invalidRelationships.push({ gameId: game.id, relation: relation[0], targetId: relation[1].id });
      }
    }
  }
  for (const gameIds of titles.values()) {
    if (gameIds.length > 1) duplicateTitles.push(...gameIds);
  }
  return { gameCount: games.length, duplicateIds, duplicateTitles, missingDescriptions, invalidRelationships, warnings: [] };
}

export function mergeGames(existing: Game[], incoming: Game[]): Game[] {
  const merged = new Map(existing.map((game) => [game.id, game]));
  for (const game of incoming) {
    const previous = merged.get(game.id);
    if (!previous) {
      merged.set(game.id, game);
      continue;
    }
    merged.set(game.id, {
      ...previous,
      ...game,
      genres: Array.from(new Set([...previous.genres, ...game.genres])).sort(),
      themes: Array.from(new Set([...previous.themes, ...game.themes])).sort(),
      platforms: Array.from(new Set([...previous.platforms, ...game.platforms])).sort(),
      developers: Array.from(new Map([...previous.developers, ...game.developers].map((company) => [company.id, company])).values()).sort((a, b) => a.name.localeCompare(b.name)),
      publishers: Array.from(new Map([...previous.publishers, ...game.publishers].map((company) => [company.id, company])).values()).sort((a, b) => a.name.localeCompare(b.name)),
      source: Array.from(new Map([...previous.source, ...game.source].map((source) => [`${source.provider}:${source.id}`, source])).values()).sort((a, b) => `${a.provider}:${a.id}`.localeCompare(`${b.provider}:${b.id}`)),
    });
  }
  return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function validateCatalogue(value: unknown): value is CatalogueIndex {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.generatedAt !== "string") {
    return false;
  }

  if (value.provenance !== undefined && (
    !isRecord(value.provenance) ||
    typeof value.provenance.provider !== "string" ||
    (value.provenance.importedAt !== undefined && typeof value.provenance.importedAt !== "string") ||
    (value.provenance.sourceVersion !== undefined && typeof value.provenance.sourceVersion !== "string") ||
    (value.provenance.sourceChecksum !== undefined && typeof value.provenance.sourceChecksum !== "string")
  )) {
    return false;
  }

  return Array.isArray(value.games) && value.games.every(isGame);
}

export function normalizeCatalogue(value: unknown, fallback: Game[]): Game[] {
  return validateCatalogue(value) ? value.games : fallback;
}

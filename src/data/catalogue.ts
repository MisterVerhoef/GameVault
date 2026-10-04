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
  platforms?: Platform[];
  platform?: Platform;
  cover?: string | { url: string; width?: number; height?: number };
  coverUrl?: string;
  background?: string | { url: string; width?: number; height?: number };
  backgroundUrl?: string;
  rating?: number;
  ratingCount?: number;
  source?: { provider: string; id: string };
  sourceId?: string;
  updatedAt?: string;
}

function asImage(value: ExternalGameRecord["cover"] | ExternalGameRecord["background"], fallback?: string) {
  if (typeof value === "string") return { url: value };
  if (value && typeof value.url === "string") return value;
  return fallback ? { url: fallback } : undefined;
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
    developers: [],
    publishers: [],
    platforms,
    cover: asImage(record.cover, record.coverUrl),
    background: asImage(record.background, record.backgroundUrl),
    rating: record.rating,
    ratingCount: record.ratingCount,
    screenshots: [],
    videos: [],
    websites: [],
    dlc: [],
    expansions: [],
    editions: [],
    relatedGames: [],
    similarGames: [],
    franchises: [],
    collections: [],
    source: [{ provider: record.source?.provider ?? provider, id: sourceId }],
    updatedAt: record.updatedAt ?? updatedAt,
  };
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

import type { AgeRating, CompanyRef, Game, MultiplayerInfo, PlatformRelease, TimeToBeat } from "./games";
import type { Platform } from "./platforms";
import { catalogueCompanyLogo } from "./studio-logo";
import { sanitizeWebsites, type ExternalLinkCategory } from "./websites";

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

const platforms: Platform[] = ["PC", "PS5", "Xbox", "Switch", "Other"];

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
  developers?: { id: string; name: string; logo?: unknown }[];
  publishers?: { id: string; name: string; logo?: unknown }[];
  platforms?: Platform[];
  platformVariants?: string[];
  platform?: Platform;
  cover?: string | { url: string; width?: number; height?: number };
  coverUrl?: string;
  background?: string | { url: string; width?: number; height?: number };
  backgroundUrl?: string;
  rating?: number;
  ratingCount?: number;
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  ageRatings?: AgeRating[];
  gameModes?: string[];
  playerPerspectives?: string[];
  keywords?: string[];
  multiplayer?: MultiplayerInfo;
  releases?: PlatformRelease[];
  timeToBeat?: TimeToBeat;
  screenshots?: { url: string; width?: number; height?: number }[];
  videos?: { id: string; name?: string; url: string }[];
  websites?: { label: string; url: string; category?: ExternalLinkCategory }[];
  dlc?: { id: string; title: string }[];
  expansions?: { id: string; title: string }[];
  editions?: { id: string; title: string }[];
  relatedGames?: { id: string; title: string; relation: "sequel" | "prequel" | "spinoff" | "collection" | "remake" }[];
  similarGames?: { id: string; title: string; cover?: string | { url: string; width?: number; height?: number } }[];
  franchises?: string[];
  collections?: string[];
  source?: { provider: string; id: string };
  sourceId?: string;
  externalIds?: { store: "xbox" | "playstation" | "nintendo"; id: string }[];
  updatedAt?: string;
  warnings?: string[];
}

function normalizeMediaUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^\/\//, "https://");
}

function upgradeIgdbImageUrl(url: string, size: "t_cover_big" | "t_screenshot_huge" | "t_1080p") {
  if (!url.includes("images.igdb.com/igdb/image/upload/")) return url;
  return url.replace(/\/t_[^/]+\//, `/${size}/`);
}

function sameCompanyLogo(company: CompanyRef, logo: CompanyRef["logo"]) {
  if (!logo) return company.logo == null;
  return company.logo?.url === logo.url
    && company.logo.width === logo.width
    && company.logo.height === logo.height;
}

/** Drop unusable logo URLs and rewrite IGDB files to `t_logo_med`. Keeps the input list when nothing changes. */
function normalizeCompanyList(companies: { id: string; name: string; logo?: unknown }[]): CompanyRef[] {
  let changed = false;
  const next = companies.map((company) => {
    const current = company as CompanyRef;
    const logo = catalogueCompanyLogo(company.logo);
    if (sameCompanyLogo(current, logo)) return current;
    changed = true;
    return logo ? { id: company.id, name: company.name, logo } : { id: company.id, name: company.name };
  });
  return changed ? next : companies as CompanyRef[];
}

function mergeCompanies(previous: CompanyRef[], incoming: CompanyRef[]): CompanyRef[] {
  const merged = new Map<string, CompanyRef>();
  for (const company of previous) merged.set(company.id, company);
  for (const company of incoming) {
    const existing = merged.get(company.id);
    if (!existing) {
      merged.set(company.id, company);
      continue;
    }
    const name = company.name.length >= existing.name.length ? company.name : existing.name;
    const logo = company.logo ?? existing.logo;
    merged.set(company.id, logo ? { id: company.id, name, logo } : { id: company.id, name });
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeGameMedia(game: Game): Game {
  return {
    ...game,
    developers: normalizeCompanyList(game.developers),
    publishers: normalizeCompanyList(game.publishers),
    cover: game.cover
      ? { ...game.cover, url: upgradeIgdbImageUrl(game.cover.url, "t_cover_big") }
      : undefined,
    background: game.background
      ? { ...game.background, url: upgradeIgdbImageUrl(game.background.url, "t_1080p") }
      : undefined,
    screenshots: game.screenshots.map((screenshot) => ({
      ...screenshot,
      url: upgradeIgdbImageUrl(screenshot.url, "t_screenshot_huge"),
    })),
    websites: sanitizeWebsites(game.websites),
  };
}

function positiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function copyStringList(value: unknown, limit: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || trimmed.length > 40 || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result.length > 0 ? result : undefined;
}

function copyAgeRatings(value: unknown): AgeRating[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const result: AgeRating[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.board !== "string" || typeof entry.label !== "string") continue;
    const board = entry.board.trim();
    const label = entry.label.trim();
    const key = board.toLowerCase();
    if (!board || !label || label.length > 24 || seen.has(key)) continue;
    seen.add(key);
    result.push({ board, label });
    if (result.length >= 8) break;
  }
  return result.length > 0 ? result : undefined;
}

function copyMultiplayer(value: unknown): MultiplayerInfo | undefined {
  if (!isRecord(value)) return undefined;
  const summary: MultiplayerInfo = {};
  const flags = ["campaignCoop", "dropIn", "lanCoop", "offlineCoop", "onlineCoop", "splitscreen", "splitscreenOnline"] as const;
  const maximums = ["offlineCoopMax", "offlineMax", "onlineCoopMax", "onlineMax"] as const;
  for (const flag of flags) {
    if (value[flag] === true) summary[flag] = true;
  }
  for (const maximum of maximums) {
    const count = positiveInt(value[maximum]);
    if (count && count > 1) summary[maximum] = count;
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function copyReleases(value: unknown): PlatformRelease[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const result: PlatformRelease[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.platform !== "string") continue;
    const platform = entry.platform.trim();
    const key = platform.toLowerCase();
    if (!platform || seen.has(key)) continue;
    const date = typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : undefined;
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    if (!date && !label) continue;
    seen.add(key);
    result.push({
      platform,
      ...(date ? { date } : {}),
      ...(!date && label ? { label } : {}),
    });
    if (result.length >= 12) break;
  }
  return result.length > 0 ? result : undefined;
}

function copyTimeToBeat(value: unknown): TimeToBeat | undefined {
  if (!isRecord(value)) return undefined;
  const hastily = positiveInt(value.hastily);
  const normally = positiveInt(value.normally);
  const completely = positiveInt(value.completely);
  const count = positiveInt(value.count);
  if (!hastily && !normally && !completely) return undefined;
  return {
    ...(hastily ? { hastily } : {}),
    ...(normally ? { normally } : {}),
    ...(completely ? { completely } : {}),
    ...(count ? { count } : {}),
  };
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
  const aggregatedRating = finiteNumber(record.aggregatedRating);
  const aggregatedRatingCount = positiveInt(record.aggregatedRatingCount);
  const ageRatings = copyAgeRatings(record.ageRatings);
  const gameModes = copyStringList(record.gameModes, 8);
  const playerPerspectives = copyStringList(record.playerPerspectives, 8);
  const keywords = copyStringList(record.keywords, 12);
  const multiplayer = copyMultiplayer(record.multiplayer);
  const releases = copyReleases(record.releases);
  const timeToBeat = copyTimeToBeat(record.timeToBeat);
  return {
    id: record.id,
    slug: record.slug ?? record.id,
    title,
    summary: record.summary ?? record.description,
    description: record.description ?? record.summary,
    releaseYear: record.releaseYear ?? record.year,
    genres: record.genres ?? (record.genre ? [record.genre] : []),
    themes: record.themes ?? [],
    developers: normalizeCompanyList(record.developers ?? []),
    publishers: normalizeCompanyList(record.publishers ?? []),
    platforms,
    platformVariants: record.platformVariants ?? [],
    cover: asImage(record.cover, record.coverUrl),
    background: asImage(record.background, record.backgroundUrl),
    rating: record.rating,
    ratingCount: record.ratingCount,
    ...(aggregatedRating != null ? { aggregatedRating } : {}),
    ...(aggregatedRatingCount ? { aggregatedRatingCount } : {}),
    ...(ageRatings ? { ageRatings } : {}),
    ...(gameModes ? { gameModes } : {}),
    ...(playerPerspectives ? { playerPerspectives } : {}),
    ...(keywords ? { keywords } : {}),
    ...(multiplayer ? { multiplayer } : {}),
    ...(releases ? { releases } : {}),
    ...(timeToBeat ? { timeToBeat } : {}),
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
    websites: sanitizeWebsites(record.websites),
    dlc: record.dlc ?? [],
    expansions: record.expansions ?? [],
    editions: record.editions ?? [],
    relatedGames: record.relatedGames ?? [],
    similarGames: (record.similarGames ?? []).map((game) => ({
      id: game.id,
      title: game.title,
      cover: asImage(game.cover),
    })),
    franchises: record.franchises ?? [],
    collections: record.collections ?? [],
    source: [{ provider: record.source?.provider ?? provider, id: sourceId }],
    ...(record.externalIds && record.externalIds.length > 0 ? { externalIds: record.externalIds } : {}),
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
      developers: mergeCompanies(previous.developers, game.developers),
      publishers: mergeCompanies(previous.publishers, game.publishers),
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
  return validateCatalogue(value) ? value.games.map(normalizeGameMedia) : fallback.map(normalizeGameMedia);
}

type CatalogueIdentity = {
  id: string;
  source: readonly { id: string }[];
};

/**
 * Match an IGDB similar-game id to a catalogue entry.
 * Catalogue `id` wins over another entry that only lists that value as a source id.
 * Same-title remasters stay unmatched: IGDB gives them different ids.
 */
export function findCatalogueEntry<T extends CatalogueIdentity>(games: readonly T[], refId: string): T | undefined {
  return games.find((game) => game.id === refId)
    ?? games.find((game) => game.source.some((source) => source.id === refId));
}

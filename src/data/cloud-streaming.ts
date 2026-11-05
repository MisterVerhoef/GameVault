import type { Game } from "./games";

export type CloudServiceId = "xbox-cloud" | "boosteroid" | "ps-plus";
export type CloudMatch = "external-id" | "exact-title";

export interface CloudStreamingService {
  id: CloudServiceId;
  name: string;
  tier?: string;
  requiresOwnership?: boolean;
  storeRequirement?: string;
  url: string;
  match: CloudMatch;
  checkedAt: string;
}

export interface CloudStreamingIndex {
  region: string;
  generatedAt: string;
  byGameId: ReadonlyMap<string, readonly CloudStreamingService[]>;
}

const SERVICE_ORDER: Record<CloudServiceId, number> = {
  "xbox-cloud": 0,
  boosteroid: 1,
  "ps-plus": 2,
};

function isServiceId(value: unknown): value is CloudServiceId {
  return value === "xbox-cloud" || value === "boosteroid" || value === "ps-plus";
}

export function normalizeCloudTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSteamAppId(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.hostname !== "store.steampowered.com" && !url.hostname.endsWith(".steampowered.com")) return undefined;
    const match = url.pathname.match(/^\/app\/(\d+)(?:\/|$)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export function parsePlayStationConceptId(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.hostname !== "store.playstation.com") return undefined;
    return url.pathname.match(/\/concept\/(\d+)(?:\/|$)/)?.[1];
  } catch {
    return undefined;
  }
}

export interface CloudTitleCandidate {
  id: string;
  title: string;
  year?: number;
}

/** Exact normalized title only; when both years exist they must be within two years. */
export function matchCloudTitle(
  game: { title: string; releaseYear?: number },
  candidates: readonly CloudTitleCandidate[],
): CloudTitleCandidate | undefined {
  const title = normalizeCloudTitle(game.title);
  if (!title) return undefined;
  const matches = candidates.filter((candidate) => {
    if (normalizeCloudTitle(candidate.title) !== title) return false;
    if (game.releaseYear != null && candidate.year != null && Math.abs(game.releaseYear - candidate.year) > 2) return false;
    return true;
  });
  return matches.length === 1 ? matches[0] : undefined;
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseService(value: unknown): CloudStreamingService | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  if (!isServiceId(item.id) || typeof item.name !== "string") return undefined;
  const url = safeUrl(item.url);
  if (!url || (item.match !== "external-id" && item.match !== "exact-title")) return undefined;
  if (typeof item.checkedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt)) return undefined;
  return {
    id: item.id,
    name: item.name,
    ...(typeof item.tier === "string" ? { tier: item.tier } : {}),
    ...(typeof item.requiresOwnership === "boolean" ? { requiresOwnership: item.requiresOwnership } : {}),
    ...(typeof item.storeRequirement === "string" ? { storeRequirement: item.storeRequirement } : {}),
    url,
    match: item.match,
    checkedAt: item.checkedAt,
  };
}

export function indexCloudStreaming(raw: unknown): CloudStreamingIndex {
  const empty: CloudStreamingIndex = { region: "", generatedAt: "", byGameId: new Map() };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const file = raw as { schemaVersion?: unknown; region?: unknown; generatedAt?: unknown; games?: unknown };
  if (file.schemaVersion !== 1 || file.region !== "NL" || !file.games || typeof file.games !== "object" || Array.isArray(file.games)) return empty;

  const byGameId = new Map<string, readonly CloudStreamingService[]>();
  for (const [gameId, entry] of Object.entries(file.games as Record<string, unknown>)) {
    if (!gameId || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rawServices = (entry as { services?: unknown }).services;
    if (!Array.isArray(rawServices)) continue;
    const seen = new Set<CloudServiceId>();
    const services: CloudStreamingService[] = [];
    for (const rawService of rawServices) {
      const service = parseService(rawService);
      if (!service || seen.has(service.id)) continue;
      seen.add(service.id);
      services.push(service);
    }
    if (services.length > 0) {
      services.sort((left, right) => SERVICE_ORDER[left.id] - SERVICE_ORDER[right.id]);
      byGameId.set(gameId, services);
    }
  }
  return {
    region: file.region,
    generatedAt: typeof file.generatedAt === "string" ? file.generatedAt : "",
    byGameId,
  };
}

export function cloudServicesForGame(index: CloudStreamingIndex, gameId: string): readonly CloudStreamingService[] {
  return index.byGameId.get(gameId) ?? [];
}

export function cloudServiceNames(services: readonly CloudStreamingService[]): string[] {
  return services.map((service) => service.name);
}

/** Resolve only IDs explicitly present in the game catalogue; title matching is handled by the enrichment job. */
export function gameSteamAppIds(game: Pick<Game, "websites">): string[] {
  return Array.from(new Set(game.websites.flatMap((site) => {
    const id = parseSteamAppId(site.url);
    return id ? [id] : [];
  })));
}

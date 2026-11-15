import { unstable_cache } from "next/cache";
import { foldUnlinkedIgdbPorts } from "@/data/port-fold";
import { groupIgdbSearchHits } from "@/data/search-grouping";
import { cataloguePortPeersForTitles } from "./catalogue-port-peers";
import { sortSearchResults } from "@/data/search-rank";
import { dedupeIgdbAgainstCatalogue } from "./dedupe";
import { getCatalogueIgdbIds } from "./catalogue-ids";
import { LruCache } from "./lru-cache";
import { mapIgdbApiRecord } from "./map-record";
import {
  igdbMockEnabled,
  mockIgdbGame,
  mockIgdbSearchExact,
  mockIgdbSearchFuzzy,
} from "./mock";
import { normalizeIgdbQuery } from "./normalize-query";
import { RequestThrottle } from "./throttle";
import {
  buildIgdbExactNameSearchBody,
  buildIgdbSearchBody,
  IGDB_LIVE_SEARCH_RESULT_CAP,
  mergeIgdbLiveSearchRows,
} from "./search-api";
import { mapIgdbBasicRecord } from "./map-basic-record";
import { mockIgdbGamesByIds } from "./mock";
import { TtlCache } from "./ttl-cache";
import type { IgdbBasicGame, IgdbLiveGame, IgdbSearchHit } from "./types";

export {
  buildIgdbExactNameSearchBody,
  buildIgdbSearchBody,
  igdbSearchCacheControl,
  IGDB_SEARCH_CACHE_CONTROL,
  IGDB_SEARCH_CACHE_CONTROL_EMPTY,
  mergeIgdbLiveSearchRows,
} from "./search-api";

const throttle = new RequestThrottle(4);
const searchCache = new LruCache<IgdbSearchHit[]>({ maxEntries: 256 });
const basicGameCache = new TtlCache<IgdbBasicGame | null>({
  hitTtlMs: 86_400_000,
  missTtlMs: 60_000,
  maxEntries: 4096,
});
const liveGameCache = new TtlCache<IgdbLiveGame | null>({
  hitTtlMs: 86_400_000,
  missTtlMs: 60_000,
  maxEntries: 2048,
});
const LIVE_GAME_CACHE_SECONDS = 86_400;

const IGDB_BATCH_LIMIT = 500;
const basicGameFields = "id,name,cover.url,first_release_date,platforms.name";

interface TokenState {
  accessToken: string;
  expiresAtMs: number;
}

let tokenState: TokenState | null = null;

function credentials() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string | null> {
  const creds = credentials();
  if (!creds) return null;
  const now = Date.now();
  if (tokenState && tokenState.expiresAtMs > now + 60_000) {
    return tokenState.accessToken;
  }
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(creds.clientId)}&client_secret=${encodeURIComponent(creds.clientSecret)}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!response.ok) return null;
  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;
  const ttlMs = (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000;
  tokenState = { accessToken: body.access_token, expiresAtMs: now + ttlMs };
  return body.access_token;
}

async function igdbPost(endpoint: string, body: string): Promise<Response | null> {
  const creds = credentials();
  const token = await getAccessToken();
  if (!creds || !token) return null;
  await throttle.acquire();
  return fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": creds.clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
}

function mapSearchRows(rows: unknown[]): IgdbSearchHit[] {
  const hits: IgdbSearchHit[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as {
      id?: number;
      name?: string;
      cover?: { url?: string };
      first_release_date?: number;
      rating?: number;
      total_rating_count?: number;
      game_type?: number;
      parent_game?: { id?: number };
      version_parent?: { id?: number };
    };
    if (!record.id || !record.name) continue;
    if (typeof record.game_type === "number" && [11, 12, 13, 14].includes(record.game_type)) continue;
    const coverUrl = record.cover?.url?.replace(/^\/\//, "https://");
    const releaseYear =
      typeof record.first_release_date === "number" && Number.isFinite(record.first_release_date)
        ? new Date(record.first_release_date * 1000).getUTCFullYear()
        : undefined;
    const parentGameId =
      typeof record.parent_game?.id === "number" ? String(record.parent_game.id) : undefined;
    const versionParentId =
      typeof record.version_parent?.id === "number" ? String(record.version_parent.id) : undefined;
    hits.push({
      id: String(record.id),
      title: record.name,
      ...(releaseYear != null ? { releaseYear } : {}),
      ...(typeof record.rating === "number" ? { rating: record.rating } : {}),
      ...(typeof record.total_rating_count === "number"
        ? { ratingCount: record.total_rating_count }
        : {}),
      ...(typeof record.game_type === "number" ? { gameType: record.game_type } : {}),
      ...(parentGameId ? { parentGameId } : {}),
      ...(versionParentId ? { versionParentId } : {}),
      ...(coverUrl ? { cover: { url: coverUrl.replace(/\/t_[^/]+\//, "/t_cover_big/") } } : {}),
    });
  }
  return hits;
}

function dropIgdbPortsCoveredByCatalogue(hits: IgdbSearchHit[]): IgdbSearchHit[] {
  const catalogueIds = getCatalogueIgdbIds();
  return hits.filter((hit) => {
    const parent = hit.versionParentId ?? hit.parentGameId;
    return !(parent && catalogueIds.has(parent));
  });
}

function finalizeIgdbSearchHits(query: string, hits: IgdbSearchHit[]): IgdbSearchHit[] {
  const deduped = dropIgdbPortsCoveredByCatalogue(hits);
  const cataloguePeers = cataloguePortPeersForTitles(deduped.map((hit) => hit.title));
  const folded = foldUnlinkedIgdbPorts(deduped, cataloguePeers);
  const grouped = groupIgdbSearchHits(folded);
  return sortSearchResults(query, grouped).slice(0, IGDB_LIVE_SEARCH_RESULT_CAP);
}

export async function searchIgdbLive(query: string): Promise<IgdbSearchHit[]> {
  const normalized = normalizeIgdbQuery(query);
  if (normalized.length < 3) return [];

  const cached = searchCache.get(normalized);
  if (cached) return cached;

  if (igdbMockEnabled()) {
    const catalogueIds = getCatalogueIgdbIds();
    const combined = mergeIgdbLiveSearchRows(
      dedupeIgdbAgainstCatalogue(mockIgdbSearchExact(query), catalogueIds),
      dedupeIgdbAgainstCatalogue(mockIgdbSearchFuzzy(query), catalogueIds),
    );
    const hits = finalizeIgdbSearchHits(query, combined);
    searchCache.set(normalized, hits);
    return hits;
  }

  if (!credentials()) return [];

  try {
    const [fuzzyResponse, exactResponse] = await Promise.all([
      igdbPost("games", buildIgdbSearchBody(query)),
      igdbPost("games", buildIgdbExactNameSearchBody(query)),
    ]);
    if (!fuzzyResponse && !exactResponse) {
      console.warn("[igdb] search skipped: missing credentials or auth token");
      return [];
    }
    const rowsFrom = async (response: Response | null) => {
      if (!response || !response.ok) return [] as unknown[];
      const rows = await response.json();
      return Array.isArray(rows) ? rows : [];
    };
    const exactRows = await rowsFrom(exactResponse);
    const fuzzyRows = await rowsFrom(fuzzyResponse);
    if (!fuzzyResponse?.ok && !exactResponse?.ok) {
      console.error(
        `[igdb] search HTTP fuzzy=${fuzzyResponse?.status ?? "none"} exact=${exactResponse?.status ?? "none"}`,
      );
      return [];
    }
    const catalogueIds = getCatalogueIgdbIds();
    const combined = mergeIgdbLiveSearchRows(
      dedupeIgdbAgainstCatalogue(mapSearchRows(exactRows), catalogueIds),
      dedupeIgdbAgainstCatalogue(mapSearchRows(fuzzyRows), catalogueIds),
    );
    const hits = finalizeIgdbSearchHits(query, combined);
    searchCache.set(normalized, hits);
    return hits;
  } catch (error) {
    console.error("[igdb] search request failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

const detailFields = [
  "id", "name", "slug", "summary", "storyline", "first_release_date",
  "rating", "rating_count", "aggregated_rating", "aggregated_rating_count",
  "genres.name", "themes.name", "platforms.name",
  "involved_companies.developer", "involved_companies.publisher",
  "involved_companies.company.id", "involved_companies.company.name",
  "cover.url", "release_dates.date", "release_dates.human", "release_dates.platform.name",
].join(",");

function numericIgdbIds(ids: readonly string[]): string[] {
  const numeric: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!/^\d+$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    numeric.push(id);
  }
  return numeric;
}

async function fetchIgdbBasicUncached(ids: readonly string[]): Promise<Map<string, IgdbBasicGame | null>> {
  const result = new Map<string, IgdbBasicGame | null>();
  if (ids.length === 0) return result;

  if (igdbMockEnabled()) {
    for (const [id, value] of mockIgdbGamesByIds(ids)) {
      result.set(id, value);
    }
    return result;
  }

  if (!credentials()) {
    console.warn("[igdb] batch games skipped: missing credentials");
    for (const id of ids) result.set(id, null);
    return result;
  }

  for (let offset = 0; offset < ids.length; offset += IGDB_BATCH_LIMIT) {
    const chunk = ids.slice(offset, offset + IGDB_BATCH_LIMIT);
    const where = `where id = (${chunk.join(",")});`;
    try {
      const response = await igdbPost(
        "games",
        `fields ${basicGameFields}; ${where} limit ${chunk.length};`,
      );
      if (!response || !response.ok) {
        console.error(`[igdb] batch games HTTP ${response?.status ?? "none"} for ${chunk.length} ids`);
        for (const id of chunk) result.set(id, null);
        continue;
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) {
        console.error("[igdb] batch games response was not a JSON array");
        for (const id of chunk) result.set(id, null);
        continue;
      }
      const found = new Set<string>();
      for (const row of rows) {
        const mapped = mapIgdbBasicRecord(row);
        if (!mapped) continue;
        found.add(mapped.id);
        result.set(mapped.id, mapped);
      }
      for (const id of chunk) {
        if (!found.has(id)) result.set(id, null);
      }
    } catch (error) {
      console.error("[igdb] batch games request failed:", error instanceof Error ? error.message : error);
      for (const id of chunk) result.set(id, null);
    }
  }

  return result;
}

export async function fetchIgdbGamesByIds(ids: readonly string[]): Promise<Map<string, IgdbBasicGame | null>> {
  const numericIds = numericIgdbIds(ids);
  const out = new Map<string, IgdbBasicGame | null>();
  const uncached: string[] = [];

  for (const id of numericIds) {
    const cached = basicGameCache.get(id);
    if (cached !== undefined) {
      out.set(id, cached);
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) return out;

  const fetched = await fetchIgdbBasicUncached(uncached);
  for (const id of uncached) {
    const value = fetched.get(id) ?? null;
    basicGameCache.set(id, value, value !== null);
    out.set(id, value);
  }

  return out;
}

async function fetchIgdbGameByIdUncached(id: string): Promise<IgdbLiveGame | null> {
  if (!credentials()) return null;

  try {
    const response = await igdbPost("games", `fields ${detailFields}; where id = ${id}; limit 1;`);
    if (!response || !response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return mapIgdbApiRecord(rows[0]);
  } catch {
    return null;
  }
}

async function fetchIgdbGameByIdServerCached(id: string): Promise<IgdbLiveGame | null> {
  const cached = liveGameCache.get(id);
  if (cached !== undefined) return cached;

  let value: IgdbLiveGame | null;
  try {
    value = await unstable_cache(
      () => fetchIgdbGameByIdUncached(id),
      ["igdb-live-game", id],
      { revalidate: LIVE_GAME_CACHE_SECONDS, tags: [`igdb-game-${id}`] },
    )();
  } catch {
    value = await fetchIgdbGameByIdUncached(id);
  }

  liveGameCache.set(id, value, value !== null);
  return value;
}

export async function fetchIgdbGameById(id: string): Promise<IgdbLiveGame | null> {
  if (!/^\d+$/.test(id)) return null;

  if (igdbMockEnabled()) {
    return mockIgdbGame(id);
  }

  return fetchIgdbGameByIdServerCached(id);
}

/** Test hooks */
export function __testSearchCache(): LruCache<IgdbSearchHit[]> {
  return searchCache;
}

export function __testThrottle(): RequestThrottle {
  return throttle;
}

export function __testBasicGameCache(): TtlCache<IgdbBasicGame | null> {
  return basicGameCache;
}

export function __testLiveGameCache(): TtlCache<IgdbLiveGame | null> {
  return liveGameCache;
}

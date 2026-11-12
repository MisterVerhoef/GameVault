import { dedupeIgdbAgainstCatalogue } from "./dedupe";
import { getCatalogueIgdbIds } from "./catalogue-ids";
import { LruCache } from "./lru-cache";
import { mapIgdbApiRecord } from "./map-record";
import { igdbMockEnabled, mockIgdbGame, mockIgdbSearch } from "./mock";
import { normalizeIgdbQuery } from "./normalize-query";
import { RequestThrottle } from "./throttle";
import type { IgdbLiveGame, IgdbSearchHit } from "./types";

export const IGDB_SEARCH_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

const throttle = new RequestThrottle(4);
const searchCache = new LruCache<IgdbSearchHit[]>({ maxEntries: 256 });

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
    const record = row as { id?: number; name?: string; cover?: { url?: string } };
    if (!record.id || !record.name) continue;
    const coverUrl = record.cover?.url?.replace(/^\/\//, "https://");
    hits.push({
      id: String(record.id),
      title: record.name,
      ...(coverUrl ? { cover: { url: coverUrl.replace(/\/t_[^/]+\//, "/t_cover_big/") } } : {}),
    });
  }
  return hits;
}

export async function searchIgdbLive(query: string): Promise<IgdbSearchHit[]> {
  const normalized = normalizeIgdbQuery(query);
  if (normalized.length < 3) return [];

  const cached = searchCache.get(normalized);
  if (cached) return cached;

  if (igdbMockEnabled()) {
    const hits = dedupeIgdbAgainstCatalogue(mockIgdbSearch(query), getCatalogueIgdbIds());
    searchCache.set(normalized, hits);
    return hits;
  }

  if (!credentials()) return [];

  try {
    const escaped = query.trim().replace(/"/g, '\\"');
    const body = [
      "fields id,name,cover.url;",
      `search "${escaped}";`,
      "where category = (0,8,9,10,11) & version_parent = null;",
      "limit 12;",
    ].join(" ");
    const response = await igdbPost("games", body);
    if (!response || !response.ok) {
      if (response?.status === 429) return [];
      return [];
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) return [];
    const hits = dedupeIgdbAgainstCatalogue(mapSearchRows(rows), getCatalogueIgdbIds());
    searchCache.set(normalized, hits);
    return hits;
  } catch {
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

export async function fetchIgdbGameById(id: string): Promise<IgdbLiveGame | null> {
  if (!/^\d+$/.test(id)) return null;

  if (igdbMockEnabled()) {
    return mockIgdbGame(id);
  }

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

/** Test hooks */
export function __testSearchCache(): LruCache<IgdbSearchHit[]> {
  return searchCache;
}

export function __testThrottle(): RequestThrottle {
  return throttle;
}

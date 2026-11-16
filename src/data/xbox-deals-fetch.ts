import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { isStoreDeal } from "./store-offer-index";
import { buildXboxBigIdGameIndex } from "./xbox-deals-match";
import {
  parseDealsBigIdsScript,
  parseRecoDealIds,
  xboxDealFromAppsListItem,
  xboxDealFromDisplayCatalog,
  xboxStoreProductUrl,
  discountPercent,
} from "./xbox-deals-normalize";
import type { XboxDeal, XboxDealSource, XboxDealsPayload } from "./xbox-deals-types";

const REVALIDATE_SECONDS = 10_800;
const RECO_URL =
  "https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/Deal?Market=NL&Language=NL&ItemTypes=Game&deviceFamily=Windows.Xbox";
const APPS_GAME_DEALS_URL =
  "https://apps.microsoft.com/api/Reco/GetComputedProductsList?gl=NL&hl=nl-NL&listName=Deal&filteredCategories=AllProducts&mediaType=games";
const APPS_ADDON_DEALS_URL =
  "https://apps.microsoft.com/api/Reco/GetComputedProductsList?gl=NL&hl=nl-NL&listName=DealAddOns&mediaType=games";
const DISPLAY_URL = "https://displaycatalog.mp.microsoft.com/v7.0/products";
const DEALS_BIGIDS_URL = "https://www.xbox.com/nl-NL/xbox-game-pass/deals/JS/deals-bigids.js";

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "MS-CV": "GameVault1",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function fetchRecoBigIds(): Promise<string[]> {
  const ids: string[] = [];
  let skip = 0;
  for (let page = 0; page < 20; page += 1) {
    const url = `${RECO_URL}&count=200&skipitems=${skip}`;
    const body = await fetchJson(url);
    const batch = parseRecoDealIds(body);
    if (batch.length === 0) break;
    ids.push(...batch);
    skip += batch.length;
    if (batch.length < 200) break;
  }
  return [...new Set(ids)];
}

async function fetchAppsListPage(baseUrl: string, page: number): Promise<{
  productsList?: Record<string, unknown>[];
  hasMorePages?: boolean;
  nextPageNumber?: number;
}> {
  const url = `${baseUrl}&pgNo=${page}&noItems=50`;
  return fetchJson(url) as Promise<{
    productsList?: Record<string, unknown>[];
    hasMorePages?: boolean;
    nextPageNumber?: number;
  }>;
}

async function fetchAppsDealsList(baseUrl: string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let page = 1;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const body = await fetchAppsListPage(baseUrl, page);
    const batch = body.productsList ?? [];
    if (batch.length === 0) break;
    items.push(...batch);
    if (!body.hasMorePages) break;
    page = body.nextPageNumber ?? page + 1;
  }
  return items;
}

interface MergedAppsDeal {
  entry: Record<string, unknown>;
  sources: ("game-deal" | "addon-deal")[];
}

async function fetchMergedAppsDeals(): Promise<MergedAppsDeal[]> {
  const [gameList, addonList] = await Promise.all([
    fetchAppsDealsList(APPS_GAME_DEALS_URL),
    fetchAppsDealsList(APPS_ADDON_DEALS_URL),
  ]);
  const merged = new Map<string, MergedAppsDeal>();
  for (const entry of gameList) {
    const id = String(entry.productId ?? "").toUpperCase();
    merged.set(id, { entry, sources: ["game-deal"] });
  }
  for (const entry of addonList) {
    const id = String(entry.productId ?? "").toUpperCase();
    const existing = merged.get(id);
    if (existing) {
      if (!existing.sources.includes("addon-deal")) existing.sources.push("addon-deal");
    } else {
      merged.set(id, { entry, sources: ["addon-deal"] });
    }
  }
  return [...merged.values()];
}

async function fetchDisplayCatalogProducts(bigIds: readonly string[]): Promise<Map<string, Record<string, unknown>>> {
  const found = new Map<string, Record<string, unknown>>();
  for (let offset = 0; offset < bigIds.length; offset += 20) {
    const chunk = bigIds.slice(offset, offset + 20);
    const url = `${DISPLAY_URL}?bigIds=${encodeURIComponent(chunk.join(","))}&market=NL&languages=nl-NL`;
    const body = await fetchJson(url) as { Products?: Record<string, unknown>[] };
    for (const product of body.Products ?? []) {
      const id = String(product.ProductId ?? "").toUpperCase();
      if (id) found.set(id, product);
    }
  }
  return found;
}

async function dealsFromBigIds(
  bigIds: readonly string[],
  source: XboxDealSource,
  gameIdByBigId: ReadonlyMap<string, string>,
): Promise<XboxDealsPayload> {
  const catalog = await fetchDisplayCatalogProducts(bigIds);
  const deals: XboxDeal[] = [];
  const seen = new Set<string>();
  for (const bigId of bigIds) {
    const product = catalog.get(bigId);
    const deal = product
      ? xboxDealFromDisplayCatalog(product, gameIdByBigId)
      : undefined;
    if (!deal || seen.has(deal.bigId)) continue;
    seen.add(deal.bigId);
    deals.push(deal);
  }
  return {
    source,
    updatedAt: new Date().toISOString(),
    deals,
  };
}

async function dealsFromAppsList(gameIdByBigId: ReadonlyMap<string, string>): Promise<XboxDealsPayload> {
  const list = await fetchMergedAppsDeals();
  const bigIds = list.map(({ entry }) => String(entry.productId ?? "").toUpperCase()).filter((id) => id.length > 0);
  const catalog = await fetchDisplayCatalogProducts(bigIds);
  const deals: XboxDeal[] = [];
  const seen = new Set<string>();
  for (const { entry, sources } of list) {
    const bigId = String(entry.productId ?? "").toUpperCase();
    const deal = xboxDealFromAppsListItem(entry, gameIdByBigId, catalog, sources);
    if (!deal || seen.has(bigId)) continue;
    seen.add(bigId);
    deals.push(deal);
  }
  return {
    source: "microsoft-apps-store",
    updatedAt: new Date().toISOString(),
    deals,
  };
}

function dealsFromCatalogueCache(gameIdByBigId: ReadonlyMap<string, string>): XboxDealsPayload {
  const path = join(process.cwd(), "public/catalog/store-offers.json");
  const browsePath = join(process.cwd(), "public/catalog/browse-index.json");
  let offersFile: {
    games?: Record<string, { offers?: {
      store?: string;
      productId?: string;
      title?: string;
      price?: number;
      regularPrice?: number;
      url?: string;
    }[] }>;
  } = {};
  let browseFile: { games?: { id?: string; title?: string; cover?: string }[] } = {};
  try {
    offersFile = JSON.parse(readFileSync(path, "utf8"));
    browseFile = JSON.parse(readFileSync(browsePath, "utf8"));
  } catch {
    return { source: "empty", updatedAt: new Date().toISOString(), deals: [], error: "Cached store offers could not be read." };
  }
  const titleById = new Map((browseFile.games ?? []).map((game) => [String(game.id), String(game.title ?? "")]));
  const coverById = new Map((browseFile.games ?? []).map((game) => [String(game.id), typeof game.cover === "string" ? game.cover : null]));
  const deals: XboxDeal[] = [];
  for (const [gameId, entry] of Object.entries(offersFile.games ?? {})) {
    for (const offer of entry.offers ?? []) {
      if (offer.store !== "xbox") continue;
      const price = typeof offer.price === "number" ? offer.price : null;
      const regularPrice = typeof offer.regularPrice === "number" ? offer.regularPrice : null;
      if (!isStoreDeal(price, regularPrice)) continue;
      const bigId = String(offer.productId ?? "").toUpperCase();
      const title = offer.title || titleById.get(gameId) || "Xbox game";
      deals.push({
        bigId,
        title,
        coverUrl: coverById.get(gameId) ?? null,
        price: price as number,
        regularPrice: regularPrice as number,
        discountPercent: discountPercent(price as number, regularPrice as number),
        currency: "EUR",
        productKind: "game",
        saleEndsAt: null,
        storeUrl: offer.url || xboxStoreProductUrl(bigId, undefined, title),
        gameId: gameIdByBigId.get(bigId) ?? gameId,
      });
    }
  }
  return {
    source: "catalogue-cache",
    updatedAt: new Date().toISOString(),
    deals,
    error: deals.length === 0 ? "No cached Xbox deals were available." : undefined,
  };
}

async function fetchXboxDealsLive(): Promise<XboxDealsPayload> {
  const gameIdByBigId = buildXboxBigIdGameIndex();
  try {
    const recoIds = await fetchRecoBigIds();
    if (recoIds.length > 0) {
      const payload = await dealsFromBigIds(recoIds, "microsoft-reco", gameIdByBigId);
      if (payload.deals.length > 0) return payload;
    }
  } catch {
    // Reco is deprecated in some networks; fall back below.
  }

  try {
    const appsPayload = await dealsFromAppsList(gameIdByBigId);
    if (appsPayload.deals.length > 0) return appsPayload;
  } catch {
    // Try the Xbox.com bigId list next.
  }

  try {
    const response = await fetch(DEALS_BIGIDS_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (response.ok) {
      const script = await response.text();
      const bigIds = parseDealsBigIdsScript(script);
      if (bigIds.length > 0) {
        const payload = await dealsFromBigIds(bigIds, "microsoft-xbox-deals-js", gameIdByBigId);
        if (payload.deals.length > 0) return payload;
      }
    }
  } catch {
    // Final fallback below.
  }

  const cached = dealsFromCatalogueCache(gameIdByBigId);
  if (cached.deals.length > 0) {
    return {
      ...cached,
      error: "Live Microsoft Store fetching was unavailable; showing cached catalogue offers instead.",
    };
  }
  return {
    source: "empty",
    updatedAt: new Date().toISOString(),
    deals: [],
    error: "Live Microsoft Store deals could not be loaded.",
  };
}

function readE2eFixture(): XboxDealsPayload | null {
  if (process.env.GAMEVAULT_E2E_XBOX_DEALS !== "1") return null;
  const fileName =
    process.env.GAMEVAULT_E2E_XBOX_DEALS_FIXTURE === "pagination"
      ? "xbox-deals-e2e.json"
      : "xbox-deals-e2e-smoke.json";
  const path = join(process.cwd(), "test/fixtures", fileName);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as XboxDealsPayload;
  } catch {
    return null;
  }
}

export async function getXboxDeals(): Promise<XboxDealsPayload> {
  const fixture = readE2eFixture();
  if (fixture) return fixture;
  return unstable_cache(fetchXboxDealsLive, ["xbox-deals-nl-v2"], { revalidate: REVALIDATE_SECONDS })();
}
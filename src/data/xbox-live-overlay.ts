import { unstable_cache } from "next/cache";
import {
  discountBadge,
  appendDailyPrice,
  lowestRecorded,
  normalizePriceHistory,
  type PriceHistoryPoint,
} from "./price-history";
import {
  xboxListPriceFromDisplayCatalog,
  xboxStoreProductUrl,
} from "./xbox-deals-normalize";
import { getXboxDeals, fetchDisplayCatalogProducts } from "./xbox-deals-fetch";
import {
  isStoreDeal,
  type CachedStoreOffer,
} from "./store-offer-index";
import { xboxIdentitiesOrdered, type StoreOffer } from "./store-match";
import type { Game } from "./games";

const REVALIDATE_SECONDS = 10_800;

export interface XboxLivePrice {
  price: number;
  regularPrice: number;
  productId: string;
  url: string;
}

/** Merge a live Netherlands Xbox price onto a cached offer for display. */
export function overlayXboxCachedOffer(
  offer: CachedStoreOffer,
  history: readonly PriceHistoryPoint[] | undefined,
  live: XboxLivePrice | null | undefined,
  today: string,
): CachedStoreOffer {
  if (!live) return offer;
  const mergedHistory = appendDailyPrice(history, today, live.price);
  const lowest = lowestRecorded(mergedHistory);
  const price = live.price;
  const regularPrice = live.regularPrice;
  return {
    ...offer,
    url: live.url || offer.url,
    price,
    regularPrice,
    deal: isStoreDeal(price, regularPrice),
    discountLabel: discountBadge(price, regularPrice),
    lowestRecorded: lowest
      ? { price: lowest.cents / 100, date: lowest.date }
      : offer.lowestRecorded,
  };
}

function rawXboxOffer(
  rawOffers: readonly StoreOffer[] | undefined,
): (StoreOffer & { history?: PriceHistoryPoint[] }) | undefined {
  const match = rawOffers?.find((offer) => offer.store === "xbox");
  return match as (StoreOffer & { history?: PriceHistoryPoint[] }) | undefined;
}

function dealForGame(
  deals: readonly { gameId: string | null; bigId: string; price: number; regularPrice: number; storeUrl: string }[],
  gameId: string,
  productId: string,
): XboxLivePrice | null {
  const normalized = productId.toUpperCase();
  const byId = deals.find((deal) => deal.bigId === normalized);
  if (byId && (byId.gameId === gameId || byId.gameId == null)) {
    return {
      price: byId.price,
      regularPrice: byId.regularPrice,
      productId: byId.bigId,
      url: byId.storeUrl,
    };
  }
  const byGame = deals.find((deal) => deal.gameId === gameId);
  if (byGame) {
    return {
      price: byGame.price,
      regularPrice: byGame.regularPrice,
      productId: byGame.bigId,
      url: byGame.storeUrl,
    };
  }
  return null;
}

function catalogLivePrice(
  product: Record<string, unknown> | undefined,
  productId: string,
  fallbackTitle: string,
): XboxLivePrice | null {
  const priced = xboxListPriceFromDisplayCatalog(product);
  if (!priced) return null;
  return {
    ...priced,
    productId: productId.toUpperCase(),
    url: xboxStoreProductUrl(productId, undefined, fallbackTitle),
  };
}

const fetchCatalogPricesCached = unstable_cache(
  async (idsKey: string) => {
    const ids = idsKey.split(",").filter(Boolean);
    if (ids.length === 0) return {} as Record<string, Record<string, unknown>>;
    const found = await fetchDisplayCatalogProducts(ids);
    return Object.fromEntries(found);
  },
  ["xbox-catalog-prices-overlay-v1"],
  { revalidate: REVALIDATE_SECONDS },
);

async function resolveLiveXboxPrices(
  jobs: readonly {
    gameId: string;
    productId: string;
    title: string;
    alternateProductIds: readonly string[];
  }[],
): Promise<Map<string, XboxLivePrice | null>> {
  const dealsPayload = await getXboxDeals();
  const deals = dealsPayload.deals;
  const result = new Map<string, XboxLivePrice | null>();
  const catalogIds = new Set<string>();

  for (const job of jobs) {
    const fromDeal = dealForGame(deals, job.gameId, job.productId);
    if (fromDeal) {
      result.set(job.gameId, fromDeal);
      continue;
    }
    catalogIds.add(job.productId.toUpperCase());
    for (const alt of job.alternateProductIds) catalogIds.add(alt.toUpperCase());
    result.set(job.gameId, null);
  }

  const pending = jobs.filter((job) => !result.get(job.gameId));
  if (pending.length === 0) return result;

  const catalogRecord = await fetchCatalogPricesCached([...catalogIds].sort().join(","));
  const catalog = new Map(Object.entries(catalogRecord));
  for (const job of pending) {
    const ids = [job.productId, ...job.alternateProductIds].map((id) => id.toUpperCase());
    let live: XboxLivePrice | null = null;
    for (const id of ids) {
      const priced = catalogLivePrice(catalog.get(id), id, job.title);
      if (!priced) continue;
      if (!live || priced.price < live.price) live = priced;
    }
    result.set(job.gameId, live);
  }
  return result;
}

export async function overlayXboxOffersForGame(
  game: Pick<Game, "id" | "title" | "platforms" | "websites" | "externalIds">,
  offers: readonly CachedStoreOffer[],
  rawOffers: readonly StoreOffer[] | undefined,
  today = new Date().toISOString().slice(0, 10),
): Promise<CachedStoreOffer[]> {
  const xbox = offers.find((offer) => offer.store === "xbox");
  const raw = rawXboxOffer(rawOffers);
  if (!xbox || !raw?.productId) return [...offers];
  const liveMap = await resolveLiveXboxPrices([{
    gameId: game.id,
    productId: raw.productId,
    title: game.title,
    alternateProductIds: xboxIdentitiesOrdered(game).map((identity) => identity.id),
  }]);
  const live = liveMap.get(game.id) ?? null;
  const history = normalizePriceHistory(raw.history);
  return offers.map((offer) => (
    offer.store === "xbox" ? overlayXboxCachedOffer(offer, history, live, today) : offer
  ));
}

export async function overlayXboxOffersForGames(
  entries: readonly {
    game: Pick<Game, "id" | "title" | "platforms" | "websites" | "externalIds">;
    offers: readonly CachedStoreOffer[];
    rawOffers: readonly StoreOffer[] | undefined;
  }[],
  today = new Date().toISOString().slice(0, 10),
): Promise<Map<string, CachedStoreOffer[]>> {
  const jobs = entries.flatMap((entry) => {
    const xbox = entry.offers.find((offer) => offer.store === "xbox");
    const raw = rawXboxOffer(entry.rawOffers);
    if (!xbox || !raw?.productId) return [];
    return [{
      gameId: entry.game.id,
      productId: raw.productId,
      title: entry.game.title,
      alternateProductIds: xboxIdentitiesOrdered(entry.game).map((identity) => identity.id),
      offers: entry.offers,
      raw,
    }];
  });

  const liveMap = await resolveLiveXboxPrices(jobs);
  const out = new Map<string, CachedStoreOffer[]>();
  for (const entry of entries) {
    const job = jobs.find((item) => item.gameId === entry.game.id);
    if (!job) {
      out.set(entry.game.id, [...entry.offers]);
      continue;
    }
    const history = normalizePriceHistory(job.raw.history);
    const live = liveMap.get(entry.game.id) ?? null;
    out.set(
      entry.game.id,
      entry.offers.map((offer) => (
        offer.store === "xbox" ? overlayXboxCachedOffer(offer, history, live, today) : offer
      )),
    );
  }
  return out;
}

export { pickBestMicrosoftProduct } from "./store-match";
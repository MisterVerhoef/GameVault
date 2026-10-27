import { storePlatform, type StoreId } from "./store-match";

/** A cached Netherlands store offer, matched to a catalogue game id. */
export interface CachedStoreOffer {
  store: StoreId;
  platform: "Xbox" | "PS5" | "Switch";
  url: string;
  title: string;
  /** Current price in EUR. Null when the catalogue has a link but no usable price. */
  price: number | null;
  /** List price in EUR, when the cache recorded one. */
  regularPrice: number | null;
  currency: "EUR";
  /** True when the cached price is lower than the list price. */
  deal: boolean;
}

export interface StoreOfferIndex {
  region: string;
  currency: string;
  byGameId: ReadonlyMap<string, readonly CachedStoreOffer[]>;
}

const STORE_ORDER: Record<StoreId, number> = {
  xbox: 0,
  playstation: 1,
  nintendo: 2,
};

const EMPTY_INDEX: StoreOfferIndex = {
  region: "",
  currency: "",
  byGameId: new Map(),
};

function isStore(value: unknown): value is StoreId {
  return value === "xbox" || value === "playstation" || value === "nintendo";
}

/** A negative amount is a sentinel for "unknown", not a price. */
function euroAmount(value: unknown): number | null | undefined {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0) return null;
  return value;
}

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function isStoreDeal(price: number | null, regularPrice: number | null): boolean {
  return price != null && regularPrice != null && regularPrice > price;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function parseOffer(value: unknown): CachedStoreOffer | undefined {
  if (!value || typeof value !== "object") return undefined;
  const offer = value as Record<string, unknown>;
  if (!isStore(offer.store)) return undefined;
  const platform = storePlatform(offer.store);
  if (offer.platform !== platform) return undefined;
  if (offer.currency !== "EUR") return undefined;
  if (typeof offer.title !== "string") return undefined;
  const url = httpsUrl(offer.url);
  if (!url) return undefined;
  const price = euroAmount(offer.price);
  const regularPrice = euroAmount(offer.regularPrice);
  if (price === undefined || regularPrice === undefined) return undefined;
  return {
    store: offer.store,
    platform,
    url,
    title: offer.title,
    price,
    regularPrice,
    currency: "EUR",
    deal: isStoreDeal(price, regularPrice),
  };
}

/**
 * Index the checked-in store-offers document by catalogue game id.
 * An unsupported file yields an empty index so callers show no price.
 */
export function indexStoreOffers(raw: unknown): StoreOfferIndex {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY_INDEX;
  const file = raw as {
    schemaVersion?: unknown;
    region?: unknown;
    currency?: unknown;
    games?: unknown;
  };
  if (file.schemaVersion !== 1) return EMPTY_INDEX;
  if (typeof file.currency === "string" && file.currency !== "EUR") return EMPTY_INDEX;
  if (typeof file.region === "string" && file.region.toUpperCase() !== "NL") return EMPTY_INDEX;
  if (!file.games || typeof file.games !== "object" || Array.isArray(file.games)) return EMPTY_INDEX;

  const byGameId = new Map<string, readonly CachedStoreOffer[]>();
  for (const [gameId, entry] of Object.entries(file.games as Record<string, unknown>)) {
    if (!gameId || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rawOffers = (entry as { offers?: unknown }).offers;
    if (!Array.isArray(rawOffers)) continue;
    const seen = new Set<StoreId>();
    const offers: CachedStoreOffer[] = [];
    for (const rawOffer of rawOffers) {
      const offer = parseOffer(rawOffer);
      if (!offer || seen.has(offer.store)) continue;
      seen.add(offer.store);
      offers.push(offer);
    }
    if (offers.length === 0) continue;
    offers.sort((left, right) => STORE_ORDER[left.store] - STORE_ORDER[right.store]);
    byGameId.set(gameId, offers);
  }

  return {
    region: typeof file.region === "string" ? file.region : "",
    currency: typeof file.currency === "string" ? file.currency : "EUR",
    byGameId,
  };
}

/**
 * Offers for one catalogue game id.
 * When `platforms` is provided, offers for other platforms are left out.
 */
export function offersForGame(
  index: StoreOfferIndex,
  gameId: string,
  platforms?: readonly string[],
): readonly CachedStoreOffer[] {
  const offers = index.byGameId.get(gameId) ?? [];
  if (!platforms) return offers;
  return offers.filter((offer) => platforms.includes(offer.platform));
}

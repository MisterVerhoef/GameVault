import type { Game, StoreId } from "./games";
import type { PriceHistoryPoint } from "./price-history";

export type { StoreId };

export type StoreMatch = "external-id" | "exact-title" | "edition";

export interface StoreIdentity {
  store: StoreId;
  /** Xbox bigId, `concept:<id>`, `product:<id>`, or a Nintendo nsuid. */
  id: string;
}

export interface StoreOffer {
  store: StoreId;
  platform: "Xbox" | "PS5" | "Switch" | "PC";
  productId: string;
  url: string;
  title: string;
  price: number | null;
  regularPrice: number | null;
  currency: "EUR";
  match: StoreMatch;
  score: number;
  checkedAt: string;
  /** Daily Netherlands prices GameVault has stored for this product, in cents. */
  history?: PriceHistoryPoint[];
}

export interface FieldSource {
  store: StoreId;
}

export interface StoreFills {
  cover?: { url: string } & FieldSource;
  description?: { text: string } & FieldSource;
  screenshots?: ({ url: string } & FieldSource)[];
  trailer?: { url: string } & FieldSource;
}

export interface StoreMedia {
  store: StoreId;
  score: number;
  description?: string;
  cover?: string;
  screenshots?: string[];
  trailer?: string;
}

export interface StoreCandidate {
  id: string;
  title: string;
  kind?: "game" | "other";
  year?: number;
}

export type StoreAttempt =
  | { status: "matched"; offer: StoreOffer }
  | { status: "miss" }
  | { status: "failed" };

const EXTRA_TOKENS = [
  "soundtrack",
  "demo",
  "dlc",
  "costume",
  "avatar",
  "addon",
  "skin",
  "upgrade pack",
  "add on",
];
const SKIPPED_MICROSOFT_SKU = new Set(["trial", "subscription", "consumable"]);

const STORE_PLATFORM = {
  xbox: "Xbox",
  playstation: "PS5",
  nintendo: "Switch",
  steam: "PC",
  epic: "PC",
  gog: "PC",
} as const;

const IGDB_STORE_SOURCES: Record<number, StoreId> = {
  1: "steam",
  5: "gog",
  11: "xbox",
  26: "epic",
  31: "xbox",
  36: "playstation",
  54: "xbox",
};

const STORE_NAMES: Record<StoreId, string> = {
  xbox: "Microsoft Store",
  playstation: "PlayStation Store",
  nintendo: "Nintendo eShop",
  steam: "Steam",
  epic: "Epic Games Store",
  gog: "GOG",
};

export function storePlatform(store: StoreId): StoreOffer["platform"] {
  return STORE_PLATFORM[store];
}

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function plainText(value: string, max = 480): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function extraTokens(title: string): string[] {
  const padded = ` ${normalizeTitle(title)} `;
  return EXTRA_TOKENS.filter((token) => padded.includes(` ${token} `));
}

export function titleScore(
  query: { title: string; year?: number },
  candidate: StoreCandidate,
): { match: StoreMatch; score: number } | undefined {
  if (candidate.kind === "other") return undefined;
  if (!candidate.title || !query.title) return undefined;
  const candidateExtras = extraTokens(candidate.title);
  const queryExtras = new Set(extraTokens(query.title));
  if (candidateExtras.some((token) => !queryExtras.has(token)))
    return undefined;
  // Title fallback is an exact normalized title inside a two-year window.
  // A missing year, a remake, or an edition suffix is not a match.
  if (typeof query.year !== "number" || typeof candidate.year !== "number")
    return undefined;
  if (Math.abs(query.year - candidate.year) > 2) return undefined;
  if (normalizeTitle(query.title) !== normalizeTitle(candidate.title))
    return undefined;
  return { match: "exact-title", score: 0.95 };
}

export function chooseCandidate<T extends StoreCandidate>(
  query: { title: string; year?: number },
  candidates: readonly T[],
): { candidate: T; match: StoreMatch; score: number } | undefined {
  const scored = candidates.flatMap((candidate) => {
    const score = titleScore(query, candidate);
    return score ? [{ candidate, ...score }] : [];
  });
  if (scored.length === 0) return undefined;
  scored.sort((left, right) => right.score - left.score);
  const best = scored[0];
  const tied = scored.filter(
    (entry) =>
      entry.score === best.score && entry.candidate.id !== best.candidate.id,
  );
  if (tied.length > 0) return undefined;
  return best;
}

export function parseStoreUrl(url: string): StoreIdentity | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "xbox.com" || host.endsWith(".xbox.com")) {
    const match = parsed.pathname.match(
      /\/games\/store\/[^/]+\/([A-Za-z0-9]{12})\/?$/i,
    );
    if (!match) return undefined;
    return { store: "xbox", id: match[1].toUpperCase() };
  }
  if (host === "store.playstation.com") {
    const concept = parsed.pathname.match(/\/concept\/(\d+)\/?$/);
    if (concept) return { store: "playstation", id: `concept:${concept[1]}` };
    const product = parsed.pathname.match(/\/product\/([A-Za-z0-9_-]+)\/?$/);
    if (product) return { store: "playstation", id: `product:${product[1]}` };
  }
  if (host === "nintendo.com" || host.endsWith(".nintendo.com")) {
    const nsuid = url.match(/700\d{11,14}/);
    if (nsuid) return { store: "nintendo", id: nsuid[0] };
  }
  if (host === "store.steampowered.com") {
    const app = parsed.pathname.match(/\/(?:agecheck\/)?app\/(\d+)/i);
    if (app) return { store: "steam", id: app[1] };
  }
  if (host === "gog.com") {
    const slug = parsed.pathname.match(
      /\/game\/([A-Za-z0-9][A-Za-z0-9_-]*)\/?$/i,
    );
    if (slug) return { store: "gog", id: slug[1] };
  }
  if (host === "store.epicgames.com" || host === "epicgames.com") {
    const slug = parsed.pathname.match(
      /\/(?:p|product)\/([A-Za-z0-9][A-Za-z0-9_-]*)(?:\/|$)/i,
    );
    if (slug) return { store: "epic", id: slug[1] };
    const bundle = parsed.pathname.match(
      /\/bundles\/([A-Za-z0-9][A-Za-z0-9_-]*)(?:\/|$)/i,
    );
    if (bundle) return { store: "epic", id: bundle[1] };
  }
  return undefined;
}

/** Steam app id from an IGDB Steam website link. */
export function parseSteamAppId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "store.steampowered.com") return undefined;
    return parsed.pathname.match(/^\/app\/(\d+)(?:\/|$)/)?.[1];
  } catch {
    return undefined;
  }
}

export function identitiesFromGame(game: {
  websites?: { url: string }[];
  externalIds?: { store: StoreId; id: string }[];
}): StoreIdentity[] {
  const identities: StoreIdentity[] = [];
  const seen = new Set<string>();
  const add = (identity: StoreIdentity | undefined) => {
    if (!identity) return;
    const key = `${identity.store}:${identity.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    identities.push(identity);
  };
  for (const entry of game.externalIds ?? []) add(entry);
  for (const site of game.websites ?? []) add(parseStoreUrl(site.url));
  return identities;
}

const EPIC_CATALOG_ID = /^[0-9a-f]{32}$/i;
const EPIC_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_ONLY_STORES = new Set<StoreId>(["xbox", "steam", "epic", "gog"]);

/** Microsoft Store product id. Xbox 360 title ids and GUIDs are not bigIds. */
export function isXboxBigId(id: string): boolean {
  return /^[A-Z0-9]{12}$/.test(id.toUpperCase());
}

/** Digital Nintendo eShop game id. Upgrade and retail ids use other 700 prefixes. */
export function isNintendoGameNsuid(id: string): boolean {
  return /^700100\d{8}$/.test(id);
}

export function isUsableStoreId(store: StoreId, id: string): boolean {
  if (store === "xbox") return isXboxBigId(id);
  if (store === "nintendo") return isNintendoGameNsuid(id);
  if (store === "playstation") {
    if (id.startsWith("concept:"))
      return /^\d+$/.test(id.slice("concept:".length));
    if (id.startsWith("product:")) return id.length > "product:".length;
    return id.trim().length > 0;
  }
  return id.trim().length > 0;
}

/** Xbox prices come from a product id. PlayStation and Nintendo may also use an exact title. */
export function isAllowedStoreMatch(store: StoreId, match: string): boolean {
  if (store === "xbox") return match === "external-id";
  if (store === "playstation" || store === "nintendo") {
    return match === "external-id" || match === "exact-title";
  }
  return true;
}

/** Steam, Epic, and GOG prices come from store ids. Title search is not a match. */
export function matchesStoreIdOnly(store: StoreId): boolean {
  return ID_ONLY_STORES.has(store);
}

/** Epic page slug. Catalog item hashes and sandbox UUIDs are not page slugs. */
export function isEpicPageSlug(id: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id) &&
    !EPIC_CATALOG_ID.test(id) &&
    !EPIC_UUID.test(id)
  );
}

/** Numeric Steam app ids. IGDB sometimes stores several ids in one field. */
export function steamAppIds(id: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const part of id.split(/[^0-9]+/)) {
    if (!part || seen.has(part)) continue;
    seen.add(part);
    ids.push(part);
  }
  return ids;
}

export function preferIdentity(
  identities: readonly StoreIdentity[],
  store: StoreId,
): StoreIdentity | undefined {
  const matches = identities.filter((identity) => identity.store === store);
  if (store === "xbox" || store === "nintendo") {
    return matches.find((identity) => isUsableStoreId(store, identity.id));
  }
  if (store === "playstation") {
    return (
      matches.find((identity) => identity.id.startsWith("concept:")) ??
      matches[0]
    );
  }
  if (store === "epic") {
    return (
      matches.find((identity) => isEpicPageSlug(identity.id)) ?? matches[0]
    );
  }
  return matches[0];
}

export function storeIdsFromIgdb(
  externalGames: readonly {
    uid?: string;
    external_game_source?: number;
    category?: number;
  }[] = [],
): { store: StoreId; id: string }[] {
  const ids: { store: StoreId; id: string }[] = [];
  const seen = new Set<string>();
  for (const entry of externalGames) {
    const store =
      IGDB_STORE_SOURCES[entry.external_game_source ?? entry.category ?? -1];
    const uid = typeof entry.uid === "string" ? entry.uid.trim() : "";
    if (!store || !uid) continue;
    const key = `${store}:${uid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push({ store, id: uid });
  }
  return ids;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function rawEuro(value: string | undefined): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return roundCents(parsed);
}

/**
 * Outright Netherlands purchase price. A cheaper availability that requires
 * remediation is a subscription upsell, not the store price.
 */
export function selectMicrosoftPrice(
  availabilities: readonly {
    skuType?: string;
    actions?: readonly string[];
    remediationRequired?: boolean;
    currency?: string | null;
    listPrice?: number | null;
    msrp?: number | null;
  }[],
): { price: number; regularPrice: number } | undefined {
  for (const availability of availabilities) {
    const skuType = (availability.skuType ?? "").toLowerCase();
    if (SKIPPED_MICROSOFT_SKU.has(skuType)) continue;
    if (availability.remediationRequired) continue;
    if (!(availability.actions ?? []).includes("Purchase")) continue;
    if (availability.currency !== "EUR") continue;
    if (
      typeof availability.listPrice !== "number" ||
      !Number.isFinite(availability.listPrice) ||
      availability.listPrice < 0
    ) {
      continue;
    }
    const regular =
      typeof availability.msrp === "number" &&
      Number.isFinite(availability.msrp) &&
      availability.msrp >= availability.listPrice
        ? availability.msrp
        : availability.listPrice;
    return {
      price: roundCents(availability.listPrice),
      regularPrice: roundCents(regular),
    };
  }
  return undefined;
}

/** Official NL eShop price for one NSUID. Search-index prices are not used. */
export function selectNintendoPrice(
  entry:
    | {
        sales_status?: string;
        regular_price?: { currency?: string; raw_value?: string };
        discount_price?: { currency?: string; raw_value?: string };
      }
    | null
    | undefined,
): { price: number; regularPrice: number } | undefined {
  if (!entry) return undefined;
  const status = (entry.sales_status ?? "").toLowerCase();
  if (status !== "onsale" && status !== "preorder") return undefined;
  if (entry.regular_price?.currency !== "EUR") return undefined;
  const regular = rawEuro(entry.regular_price.raw_value);
  if (regular == null) return undefined;
  const discount =
    entry.discount_price?.currency === "EUR"
      ? rawEuro(entry.discount_price.raw_value)
      : undefined;
  if (discount != null && discount <= regular)
    return { price: discount, regularPrice: regular };
  return { price: regular, regularPrice: regular };
}

export function selectPlayStationPrice(
  ctas: readonly {
    price?: {
      isTiedToSubscription?: boolean | null;
      basePriceValue?: number | null;
      discountedValue?: number | null;
      currencyCode?: string | null;
    };
  }[],
): { price: number; regularPrice: number } | undefined {
  const outright = ctas.find(
    (cta) =>
      cta.price?.currencyCode === "EUR" &&
      cta.price.isTiedToSubscription !== true &&
      typeof cta.price.discountedValue === "number" &&
      typeof cta.price.basePriceValue === "number",
  );
  if (!outright?.price) return undefined;
  return {
    price: outright.price.discountedValue! / 100,
    regularPrice: outright.price.basePriceValue! / 100,
  };
}

export function mergeStoreOffers(
  previous: readonly StoreOffer[] | undefined,
  attempts: Partial<Record<StoreId, StoreAttempt>>,
): StoreOffer[] {
  const stores: StoreId[] = [
    "xbox",
    "playstation",
    "nintendo",
    "steam",
    "epic",
    "gog",
  ];
  const offers: StoreOffer[] = [];
  for (const store of stores) {
    const attempt = attempts[store];
    const prior = previous?.find((offer) => offer.store === store);
    const retained =
      prior && isAllowedStoreMatch(store, prior.match) ? prior : undefined;
    if (!attempt) {
      if (retained) offers.push(retained);
      continue;
    }
    if (
      attempt.status === "matched" &&
      isAllowedStoreMatch(store, attempt.offer.match)
    )
      offers.push(attempt.offer);
    else if (attempt.status === "failed" && retained) offers.push(retained);
  }
  return offers;
}

export function reconcileFills(
  game: Pick<Game, "cover" | "description" | "screenshots" | "videos">,
  previous: StoreFills | undefined,
  fresh: readonly StoreMedia[],
): StoreFills {
  const fills: StoreFills = {};
  const ranked = [...fresh].sort((left, right) => right.score - left.score);

  if (!game.cover?.url) {
    const source = ranked.find((media) => media.cover);
    if (source?.cover) fills.cover = { url: source.cover, store: source.store };
    else if (previous?.cover) fills.cover = previous.cover;
  }
  if (!game.description) {
    const source = ranked.find((media) => media.description);
    const description = source
      ? { text: plainText(source.description!), store: source.store }
      : previous?.description;
    if (description?.text) fills.description = description;
  }
  if (game.screenshots.length === 0) {
    const source = ranked.find((media) => (media.screenshots?.length ?? 0) > 0);
    const screenshots = source
      ? source
          .screenshots!.slice(0, 4)
          .map((url) => ({ url, store: source.store }))
      : previous?.screenshots;
    if (screenshots && screenshots.length > 0) fills.screenshots = screenshots;
  }
  if (game.videos.length === 0) {
    const source = ranked.find(
      (media) => media.trailer && watchableTrailer(media.trailer),
    );
    const trailer = source
      ? { url: source.trailer!, store: source.store }
      : previous?.trailer && watchableTrailer(previous.trailer.url)
        ? previous.trailer
        : undefined;
    if (trailer) fills.trailer = trailer;
  }
  return fills;
}

export function watchableTrailer(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return (
      path.endsWith(".mp4") ||
      path.endsWith(".webm") ||
      parsed.hostname.endsWith("youtube.com") ||
      parsed.hostname === "youtu.be"
    );
  } catch {
    return false;
  }
}

export function applyFills(
  game: Game,
  fills: StoreFills | undefined,
): { game: Game; captions: string[] } {
  if (!fills) return { game, captions: [] };
  const captions: string[] = [];
  let next = game;
  if (!game.cover?.url && fills.cover) {
    next = { ...next, cover: { url: fills.cover.url } };
    captions.push(`Cover from the ${storeName(fills.cover.store)}.`);
  }
  if (!game.description && fills.description?.text) {
    next = {
      ...next,
      description: fills.description.text,
      summary: next.summary ?? fills.description.text,
    };
    captions.push(
      `Description from the ${storeName(fills.description.store)}.`,
    );
  }
  if (
    game.screenshots.length === 0 &&
    fills.screenshots &&
    fills.screenshots.length > 0
  ) {
    next = {
      ...next,
      screenshots: fills.screenshots.map((shot) => ({ url: shot.url })),
    };
    captions.push(
      `Screenshots from the ${storeName(fills.screenshots[0].store)}.`,
    );
  }
  if (game.videos.length === 0 && fills.trailer) {
    next = {
      ...next,
      videos: [
        {
          id: `${fills.trailer.store}-trailer`,
          name: "Trailer",
          url: fills.trailer.url,
        },
      ],
    };
    captions.push(`Trailer from the ${storeName(fills.trailer.store)}.`);
  }
  return { game: next, captions };
}

export function storeName(store: StoreId): string {
  return STORE_NAMES[store];
}

export function ageInDays(checkedAt: string, today: string): number {
  const checked = Date.parse(`${checkedAt}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(checked) || Number.isNaN(current))
    return Number.POSITIVE_INFINITY;
  return Math.floor((current - checked) / 86_400_000);
}

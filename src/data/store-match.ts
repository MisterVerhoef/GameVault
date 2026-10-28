import type { Game, StoreId } from "./games";

export type { StoreId };

export type StoreMatch = "external-id" | "exact-title" | "edition";

export interface StoreIdentity {
  store: StoreId;
  /** Xbox bigId, `concept:<id>`, `product:<id>`, or a Nintendo nsuid. */
  id: string;
}

export interface StoreOffer {
  store: StoreId;
  platform: "Xbox" | "PS5" | "Switch";
  productId: string;
  url: string;
  title: string;
  price: number | null;
  regularPrice: number | null;
  currency: "EUR";
  match: StoreMatch;
  score: number;
  checkedAt: string;
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

const EDITION_SUFFIXES = [
  "game of the year edition",
  "goty edition",
  "definitive edition",
  "complete edition",
  "deluxe edition",
  "gold edition",
  "ultimate edition",
  "anniversary edition",
  "remastered",
  "remaster",
];

const EXTRA_TOKENS = ["soundtrack", "demo", "dlc", "costume", "avatar", "addon", "skin", "upgrade pack", "add on"];

const STORE_PLATFORM = {
  xbox: "Xbox",
  playstation: "PS5",
  nintendo: "Switch",
} as const;

const IGDB_STORE_SOURCES: Record<number, StoreId> = {
  11: "xbox",
  31: "xbox",
  36: "playstation",
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

function stripEdition(title: string): string {
  let base = normalizeTitle(title);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of EDITION_SUFFIXES) {
      if (base.endsWith(` ${suffix}`)) {
        base = base.slice(0, -(suffix.length + 1)).trim();
        changed = true;
      }
    }
  }
  return base;
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
  if (candidateExtras.some((token) => !queryExtras.has(token))) return undefined;
  if (
    typeof query.year === "number" &&
    typeof candidate.year === "number" &&
    Math.abs(query.year - candidate.year) > 2
  ) {
    return undefined;
  }

  const normalizedQuery = normalizeTitle(query.title);
  if (normalizedQuery === normalizeTitle(candidate.title)) {
    return { match: "exact-title", score: 0.95 };
  }
  // A store listing that only adds a generic edition suffix can fill a base-title
  // catalogue entry. The reverse is rejected: a more specific catalogue title
  // must match that edition exactly.
  const queryBase = stripEdition(query.title);
  const candidateBase = stripEdition(candidate.title);
  if (
    queryBase.length >= 3 &&
    queryBase === normalizedQuery &&
    queryBase === candidateBase &&
    candidateBase !== normalizeTitle(candidate.title)
  ) {
    return { match: "edition", score: 0.86 };
  }
  return undefined;
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
  const tied = scored.filter((entry) => entry.score === best.score && entry.candidate.id !== best.candidate.id);
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
    const match = parsed.pathname.match(/\/games\/store\/[^/]+\/([A-Za-z0-9]{12})\/?$/i);
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
  return undefined;
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

export function preferIdentity(identities: readonly StoreIdentity[], store: StoreId): StoreIdentity | undefined {
  const matches = identities.filter((identity) => identity.store === store);
  if (store === "playstation") {
    return matches.find((identity) => identity.id.startsWith("concept:")) ?? matches[0];
  }
  return matches[0];
}

export function storeIdsFromIgdb(externalGames: readonly {
  uid?: string;
  external_game_source?: number;
  category?: number;
}[] = []): { store: StoreId; id: string }[] {
  const ids: { store: StoreId; id: string }[] = [];
  const seen = new Set<string>();
  for (const entry of externalGames) {
    const store = IGDB_STORE_SOURCES[entry.external_game_source ?? entry.category ?? -1];
    const uid = entry.uid?.trim();
    if (!store || !uid) continue;
    const key = `${store}:${uid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push({ store, id: uid });
  }
  return ids;
}

export function selectPlayStationPrice(ctas: readonly {
  price?: {
    isTiedToSubscription?: boolean | null;
    basePriceValue?: number | null;
    discountedValue?: number | null;
    currencyCode?: string | null;
  };
}[]): { price: number; regularPrice: number } | undefined {
  const outright = ctas.find((cta) => (
    cta.price?.currencyCode === "EUR" &&
    cta.price.isTiedToSubscription !== true &&
    typeof cta.price.discountedValue === "number" &&
    typeof cta.price.basePriceValue === "number"
  ));
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
  const stores: StoreId[] = ["xbox", "playstation", "nintendo"];
  const offers: StoreOffer[] = [];
  for (const store of stores) {
    const attempt = attempts[store];
    const prior = previous?.find((offer) => offer.store === store);
    if (!attempt) {
      if (prior) offers.push(prior);
      continue;
    }
    if (attempt.status === "matched") offers.push(attempt.offer);
    else if (attempt.status === "failed" && prior) offers.push(prior);
  }
  return offers;
}

export function reconcileFills(game: Pick<Game, "cover" | "description" | "screenshots" | "videos">, previous: StoreFills | undefined, fresh: readonly StoreMedia[]): StoreFills {
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
      ? source.screenshots!.slice(0, 4).map((url) => ({ url, store: source.store }))
      : previous?.screenshots;
    if (screenshots && screenshots.length > 0) fills.screenshots = screenshots;
  }
  if (game.videos.length === 0) {
    const source = ranked.find((media) => media.trailer && watchableTrailer(media.trailer));
    const trailer = source
      ? { url: source.trailer!, store: source.store }
      : previous?.trailer && watchableTrailer(previous.trailer.url) ? previous.trailer : undefined;
    if (trailer) fills.trailer = trailer;
  }
  return fills;
}

export function watchableTrailer(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return path.endsWith(".mp4") || path.endsWith(".webm") || parsed.hostname.endsWith("youtube.com") || parsed.hostname === "youtu.be";
  } catch {
    return false;
  }
}

export function applyFills(game: Game, fills: StoreFills | undefined): { game: Game; captions: string[] } {
  if (!fills) return { game, captions: [] };
  const captions: string[] = [];
  let next = game;
  if (!game.cover?.url && fills.cover) {
    next = { ...next, cover: { url: fills.cover.url } };
    captions.push(`Cover from the ${storeName(fills.cover.store)}.`);
  }
  if (!game.description && fills.description?.text) {
    next = { ...next, description: fills.description.text, summary: next.summary ?? fills.description.text };
    captions.push(`Description from the ${storeName(fills.description.store)}.`);
  }
  if (game.screenshots.length === 0 && fills.screenshots && fills.screenshots.length > 0) {
    next = { ...next, screenshots: fills.screenshots.map((shot) => ({ url: shot.url })) };
    captions.push(`Screenshots from the ${storeName(fills.screenshots[0].store)}.`);
  }
  if (game.videos.length === 0 && fills.trailer) {
    next = {
      ...next,
      videos: [{ id: `${fills.trailer.store}-trailer`, name: "Trailer", url: fills.trailer.url }],
    };
    captions.push(`Trailer from the ${storeName(fills.trailer.store)}.`);
  }
  return { game: next, captions };
}

export function storeName(store: StoreId): string {
  if (store === "xbox") return "Microsoft Store";
  if (store === "playstation") return "PlayStation Store";
  return "Nintendo eShop";
}

export function ageInDays(checkedAt: string, today: string): number {
  const checked = Date.parse(`${checkedAt}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(checked) || Number.isNaN(current)) return Number.POSITIVE_INFINITY;
  return Math.floor((current - checked) / 86_400_000);
}

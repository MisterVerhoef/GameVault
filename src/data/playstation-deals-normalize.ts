import { discountPercent } from "./xbox-deals-normalize";
import type {
  CategoryGridRetrievePayload,
  CategoryGridRow,
} from "./playstation-deals-schema";
import type {
  PlayStationDeal,
  PlayStationDealPlatform,
  PlayStationDealProductKind,
} from "./playstation-deals-types";

const DLC_CLASSIFICATIONS = new Set([
  "ADD_ON_PACK",
  "EPISODE",
  "ITEM",
  "LEVEL",
  "OTHER",
  "SEASON_PASS",
  "VIRTUAL_CURRENCY",
  "VEHICLE",
]);

const GAME_CLASSIFICATIONS = new Set([
  "FULL_GAME",
  "GAME_BUNDLE",
  "PREMIUM_EDITION",
]);

const IMAGE_ROLES = ["GAMEHUB_COVER_ART", "MASTER", "EDITION_KEY_ART"];

export function parsePlayStationEuroPrice(value: string | null | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const match = value.replace(/\s/g, "").match(/€([\d.,]+)/);
  if (!match) return null;
  const normalized = match[1].includes(",")
    ? match[1].replace(/\./g, "").replace(",", ".")
    : match[1];
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentText(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/-?\s*(\d+)\s*%/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyPlayStationProductKind(
  row: Pick<CategoryGridRow, "storeDisplayClassification" | "localizedStoreDisplayClassification">,
): PlayStationDealProductKind {
  const code = String(row.storeDisplayClassification ?? "").toUpperCase();
  if (DLC_CLASSIFICATIONS.has(code)) return "dlc";
  if (GAME_CLASSIFICATIONS.has(code)) return "game";
  const label = String(row.localizedStoreDisplayClassification ?? "").toLowerCase();
  if (/\b(add-on|dlc|valuta|level|item|pas)\b/i.test(label)) return "dlc";
  return "game";
}

function coverFromMedia(
  media: CategoryGridRow["media"],
  personalized?: CategoryGridRow["media"],
): string | null {
  const combined = [...(personalized ?? []), ...(media ?? [])];
  for (const role of IMAGE_ROLES) {
    const hit = combined.find((entry) => entry?.role === role && entry?.type === "IMAGE" && entry.url);
    if (hit?.url) return hit.url;
  }
  const any = combined.find((entry) => entry?.type === "IMAGE" && entry.url);
  return any?.url ?? null;
}

function platformTags(platforms: string[] | undefined): PlayStationDealPlatform[] {
  const tags = new Set<PlayStationDealPlatform>();
  for (const platform of platforms ?? []) {
    if (platform === "PS4" || platform === "PS5") tags.add(platform);
  }
  return [...tags];
}

function pricesFromSkuPrice(price: Record<string, unknown> | undefined): {
  price: number;
  regularPrice: number;
  discountPercent: number;
  psPlusPrice: number | null;
} | null {
  if (!price) return null;
  const tied = price.isTiedToSubscription === true;
  const base = parsePlayStationEuroPrice(price.basePrice as string | undefined);
  const sale = parsePlayStationEuroPrice(price.discountedPrice as string | undefined);
  if (base == null || sale == null) return null;
  if (tied) {
    return {
      price: base,
      regularPrice: base,
      discountPercent: 0,
      psPlusPrice: sale,
    };
  }
  if (sale >= base) return null;
  const fromText = parsePercentText(price.discountText as string | undefined);
  return {
    price: sale,
    regularPrice: base,
    discountPercent: fromText ?? discountPercent(sale, base),
    psPlusPrice: null,
  };
}

function playStationStoreUrl(
  kind: "product" | "concept",
  id: string,
): string {
  return `https://store.playstation.com/nl-nl/${kind}/${encodeURIComponent(id)}`;
}

export function playStationDealFromGridRow(
  row: CategoryGridRow,
  gameIdByStoreId: ReadonlyMap<string, string>,
): PlayStationDeal | null {
  const isConcept = row.__typename === "Concept";
  const conceptId = isConcept ? String(row.id) : null;
  const productId = isConcept
    ? String(row.products?.[0]?.id ?? "")
    : String(row.id ?? "");
  if (!productId && !conceptId) return null;

  const title = typeof row.name === "string" ? row.name.trim() : "";
  if (!title) return null;

  const priced = pricesFromSkuPrice(row.price as Record<string, unknown> | undefined);
  if (!priced) return null;
  if (priced.psPlusPrice == null && priced.discountPercent <= 0 && priced.price >= priced.regularPrice) {
    return null;
  }

  const storeUrl = isConcept && conceptId
    ? playStationStoreUrl("concept", conceptId)
    : playStationStoreUrl("product", productId);

  const lookupKeys = [productId, conceptId].filter((value): value is string => Boolean(value));
  let gameId: string | null = null;
  for (const key of lookupKeys) {
    const hit = gameIdByStoreId.get(key);
    if (hit) {
      gameId = hit;
      break;
    }
  }

  return {
    platform: "playstation",
    productId,
    conceptId,
    title,
    coverUrl: coverFromMedia(row.media, (row as { personalizedMeta?: { media?: CategoryGridRow["media"] } }).personalizedMeta?.media),
    price: priced.price,
    regularPrice: priced.regularPrice,
    discountPercent: priced.discountPercent,
    currency: "EUR",
    productKind: classifyPlayStationProductKind(row),
    platformTags: platformTags(row.platforms),
    psPlusPrice: priced.psPlusPrice,
    storeUrl,
    gameId,
    publisherName: undefined,
  };
}

export function playStationDealsFromCategoryGrid(
  grid: CategoryGridRetrievePayload,
  gameIdByStoreId: ReadonlyMap<string, string>,
): PlayStationDeal[] {
  const rows = [...(grid.products ?? []), ...(grid.concepts ?? [])];
  const deals: PlayStationDeal[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const deal = playStationDealFromGridRow(row, gameIdByStoreId);
    if (!deal) continue;
    const key = deal.productId || deal.conceptId || deal.title;
    if (seen.has(key)) continue;
    seen.add(key);
    deals.push(deal);
  }
  return deals;
}
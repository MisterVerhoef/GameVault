import { selectMicrosoftPrice, isXboxBigId, plainText } from "./store-match";
import type {
  XboxDeal,
  XboxDealKindFilter,
  XboxDealProductKind,
  XboxDealPublisherOption,
  XboxDealSort,
} from "./xbox-deals-types";

export type MicrosoftDealListSource = "game-deal" | "addon-deal";

const IMAGE_HOST = "https:";

const NON_GAME_PRODUCT_KINDS = new Set(["Durable", "Consumable", "UnmanagedConsumable"]);
const NON_GAME_SKU_TYPES = new Set(["addon", "consumable", "durable", "unmanagedconsumable"]);
const DLC_TITLE_PATTERN =
  /\b(dlc|add-?ons?|expansion(?:\s+pass)?|season pass|map pack|coin pack|currency|credit packs?|upgrade pack|content pack|character pack|skin pack)\b/i;
const DLC_BUNDLE_PATTERN = /\b(premium add-ons bundle|add-ons bundle|ultimate dlc|dlc bundle)\b/i;

function httpsStoreImage(uri: string | undefined): string | null {
  if (typeof uri !== "string" || uri.trim() === "") return null;
  if (uri.startsWith("//")) return `${IMAGE_HOST}${uri}`;
  if (uri.startsWith("https://")) return uri;
  return null;
}

function slugFromEncodedTitle(encodedTitle: string): string | null {
  try {
    return decodeURIComponent(encodedTitle)
      .toLowerCase()
      .replace(/'/g, "")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  } catch {
    return null;
  }
}

export function xboxStoreProductUrl(bigId: string, encodedTitle?: string, title?: string): string {
  const id = bigId.toUpperCase();
  const slug = (encodedTitle ? slugFromEncodedTitle(encodedTitle) : null)
    ?? plainText(title ?? "game", 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://www.xbox.com/nl-NL/games/store/${slug}/${id}`;
}

export function publisherNameSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "publisher";
}

export function publisherNameFromDisplayCatalog(
  product?: Record<string, unknown>,
): string | null {
  const localized = (product?.LocalizedProperties as Record<string, unknown>[] | undefined)?.[0];
  const publisher = localized?.PublisherName;
  return typeof publisher === "string" && publisher.trim() ? publisher.trim() : null;
}

export function discountPercent(price: number, regularPrice: number): number {
  if (!(regularPrice > 0) || price >= regularPrice) return 0;
  return Math.round(((regularPrice - price) / regularPrice) * 100);
}

function catalogParentProduct(product?: Record<string, unknown>): boolean {
  const properties = product?.Properties as { ParentProducts?: unknown[] } | undefined;
  if (Array.isArray(properties?.ParentProducts) && properties.ParentProducts.length > 0) return true;
  const related = product?.RelatedProducts as { RelationshipType?: string }[] | undefined;
  return Array.isArray(related) && related.some((entry) => /^parent$/i.test(entry.RelationshipType ?? ""));
}

function catalogSkuTypes(product?: Record<string, unknown>): string[] {
  return ((product?.DisplaySkuAvailabilities as { Sku?: { SkuType?: string } }[] | undefined) ?? [])
    .map((sku) => String(sku.Sku?.SkuType ?? "").toLowerCase())
    .filter(Boolean);
}

function titleSuggestsAddOn(title: string): boolean {
  return DLC_TITLE_PATTERN.test(title) || DLC_BUNDLE_PATTERN.test(title);
}

/** Some full games appear on Microsoft's add-on deal list; keep those as games. */
function standaloneGameOnAddonList(
  product: Record<string, unknown> | undefined,
  appsEntry: Record<string, unknown> | undefined,
  title: string,
): boolean {
  if (titleSuggestsAddOn(title)) return false;
  if (appsEntry?.isCoreGame === true) return true;
  if (/^(Minecraft: Java|Candy Crush|Township|Gardenscapes|Homescapes|Fishdom|Call of Duty®: Modern Warfare)/i.test(title)) {
    return true;
  }
  const properties = product?.Properties as { HasAddOns?: boolean } | undefined;
  if (properties?.HasAddOns === true && !/\b(bundle|dlc|add)\b/i.test(title)) return true;
  return false;
}

/** Classify using Display Catalog fields, list provenance, and add-on title cues. */
export function classifyMicrosoftProductKind(
  product: Record<string, unknown> | undefined,
  appsEntry: Record<string, unknown> | undefined,
  sources: readonly MicrosoftDealListSource[],
  title = "",
): XboxDealProductKind {
  const catalogKind = String(product?.ProductKind ?? "");
  if (NON_GAME_PRODUCT_KINDS.has(catalogKind)) return "dlc";

  const productType = String(product?.ProductType ?? "");
  if (productType && productType !== "Game") return "dlc";

  if (catalogParentProduct(product)) return "dlc";
  if (catalogSkuTypes(product).some((sku) => NON_GAME_SKU_TYPES.has(sku))) return "dlc";

  const group = String((product?.Properties as { ProductGroupName?: string } | undefined)?.ProductGroupName ?? "");
  const category = String((product?.Properties as { Category?: string } | undefined)?.Category ?? "");
  if (/\b(add-?on|dlc|consumable|durable)\b/i.test(`${group} ${category}`)) return "dlc";

  const addonOnly = sources.includes("addon-deal") && !sources.includes("game-deal");
  if (addonOnly) {
    if (titleSuggestsAddOn(title) || /\bupgrade\b/i.test(title)) return "dlc";
    if (!standaloneGameOnAddonList(product, appsEntry, title)) {
      // Add-on deal list provenance: treat unknown items as DLC unless catalog says game and title is a full title.
      if (catalogKind === "Game" && !/\b(pack|bundle|coin|credit)\b/i.test(title)) return "game";
      return "dlc";
    }
    return "game";
  }

  if (titleSuggestsAddOn(title)) return "dlc";

  return "game";
}

export function xboxDealKindCounts(deals: readonly XboxDeal[]): { game: number; dlc: number } {
  let game = 0;
  let dlc = 0;
  for (const deal of deals) {
    if (deal.productKind === "game") game += 1;
    else dlc += 1;
  }
  return { game, dlc };
}

export function hasMultipleDealKinds(deals: readonly XboxDeal[]): boolean {
  const { game, dlc } = xboxDealKindCounts(deals);
  return game > 0 && dlc > 0;
}

function saleEndFromCatalog(product: Record<string, unknown> | undefined): string | null {
  for (const sku of product?.DisplaySkuAvailabilities as Record<string, unknown>[] | undefined ?? []) {
    for (const availability of (sku?.Availabilities as Record<string, unknown>[] | undefined) ?? []) {
      const end = (availability?.Conditions as { EndDate?: string } | undefined)?.EndDate;
      if (typeof end === "string" && end.length > 0) return end;
    }
  }
  return null;
}

function coverFromCatalog(product: Record<string, unknown> | undefined): string | null {
  const localized = (product?.LocalizedProperties as Record<string, unknown>[] | undefined)?.[0];
  const images = (localized?.Images as { ImagePurpose?: string; Uri?: string }[] | undefined) ?? [];
  const cover = images.find((image) => image.ImagePurpose === "BoxArt")
    ?? images.find((image) => image.ImagePurpose === "Poster");
  return httpsStoreImage(cover?.Uri);
}

function coverFromApps(entry: Record<string, unknown>): string | null {
  const box = typeof entry.boxArtUrl === "string" ? entry.boxArtUrl : null;
  const poster = typeof entry.posterArtUrl === "string" ? entry.posterArtUrl : null;
  return box ?? poster ?? (typeof entry.iconUrl === "string" ? entry.iconUrl : null);
}

function microsoftAvailabilities(product: Record<string, unknown>) {
  return ((product.DisplaySkuAvailabilities as Record<string, unknown>[] | undefined) ?? []).flatMap((sku) => (
    ((sku.Availabilities as Record<string, unknown>[] | undefined) ?? []).map((availability) => {
      const price = availability?.OrderManagementData as { Price?: { CurrencyCode?: string; ListPrice?: number; MSRP?: number } } | undefined;
      return {
        skuType: (sku.Sku as { SkuType?: string } | undefined)?.SkuType,
        actions: availability?.Actions as string[] | undefined,
        remediationRequired: availability?.RemediationRequired === true,
        currency: price?.Price?.CurrencyCode,
        listPrice: price?.Price?.ListPrice,
        msrp: price?.Price?.MSRP,
      };
    })
  ));
}

/** Current Netherlands purchase price from Display Catalog, including non-sale list prices. */
export function xboxListPriceFromDisplayCatalog(
  product: Record<string, unknown> | undefined,
): { price: number; regularPrice: number } | null {
  if (!product) return null;
  const priced = selectMicrosoftPrice(microsoftAvailabilities(product));
  return priced ?? null;
}

/** Normalize a Display Catalog product into a deal row when it is on sale. */
export function xboxDealFromDisplayCatalog(
  product: Record<string, unknown>,
  gameIdByBigId: ReadonlyMap<string, string>,
  sources: readonly MicrosoftDealListSource[] = ["game-deal"],
): XboxDeal | null {
  const bigId = String(product.ProductId ?? "").toUpperCase();
  if (!isXboxBigId(bigId)) return null;
  const localized = (product.LocalizedProperties as Record<string, unknown>[] | undefined)?.[0] ?? {};
  const title = typeof localized.ProductTitle === "string" ? localized.ProductTitle : "";
  if (!title) return null;
  const priced = selectMicrosoftPrice(microsoftAvailabilities(product));
  if (!priced || priced.regularPrice <= priced.price) return null;
  const productKind = classifyMicrosoftProductKind(product, undefined, sources, title);
  return {
    bigId,
    title,
    coverUrl: coverFromCatalog(product),
    price: priced.price,
    regularPrice: priced.regularPrice,
    discountPercent: discountPercent(priced.price, priced.regularPrice),
    currency: "EUR",
    productKind,
    saleEndsAt: saleEndFromCatalog(product),
    storeUrl: xboxStoreProductUrl(bigId, undefined, title),
    gameId: gameIdByBigId.get(bigId) ?? null,
    publisherName: publisherNameFromDisplayCatalog(product),
  };
}

/** Normalize one apps.microsoft.com deal list item. */
export function xboxDealFromAppsListItem(
  entry: Record<string, unknown>,
  gameIdByBigId: ReadonlyMap<string, string>,
  catalogById?: ReadonlyMap<string, Record<string, unknown>>,
  sources: readonly MicrosoftDealListSource[] = ["game-deal"],
): XboxDeal | null {
  const bigId = String(entry.productId ?? "").toUpperCase();
  if (!isXboxBigId(bigId)) return null;
  const title = typeof entry.title === "string" ? entry.title : "";
  if (!title) return null;
  const catalog = catalogById?.get(bigId);
  const fromCatalog = catalog ? xboxDealFromDisplayCatalog(catalog, gameIdByBigId, sources) : null;
  if (fromCatalog) {
    return {
      ...fromCatalog,
      coverUrl: fromCatalog.coverUrl ?? coverFromApps(entry),
      publisherName: fromCatalog.publisherName ?? publisherNameFromDisplayCatalog(catalog),
      storeUrl: xboxStoreProductUrl(
        bigId,
        typeof entry.encodedTitle === "string" ? entry.encodedTitle : undefined,
        fromCatalog.title,
      ),
    };
  }

  const priceInfo = entry.priceInfo as { price?: number; msrp?: number } | undefined;
  const price = typeof priceInfo?.price === "number" ? priceInfo.price : typeof entry.price === "number" ? entry.price : null;
  const regularPrice = typeof priceInfo?.msrp === "number" ? priceInfo.msrp : price;
  if (price == null || regularPrice == null || regularPrice <= price) return null;

  const productKind = classifyMicrosoftProductKind(catalog, entry, sources, title);
  const coverUrl = coverFromCatalog(catalog) ?? coverFromApps(entry);

  return {
    bigId,
    title,
    coverUrl,
    price,
    regularPrice,
    discountPercent: discountPercent(price, regularPrice),
    currency: "EUR",
    productKind,
    saleEndsAt: null,
    storeUrl: xboxStoreProductUrl(bigId, typeof entry.encodedTitle === "string" ? entry.encodedTitle : undefined, title),
    gameId: gameIdByBigId.get(bigId) ?? null,
    publisherName: publisherNameFromDisplayCatalog(catalog),
  };
}

export function parseRecoDealIds(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as { Items?: unknown[]; items?: unknown[] };
  const items = record.Items ?? record.items ?? [];
  const ids: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { Id?: string; id?: string; ProductId?: string }).Id
      ?? (item as { id?: string }).id
      ?? (item as { ProductId?: string }).ProductId;
    if (typeof id === "string" && isXboxBigId(id)) ids.push(id.toUpperCase());
  }
  return ids;
}

export function parseDealsBigIdsScript(script: string): string[] {
  const match = script.match(/fullGameArray\s*=\s*(\[[^\]]+\])/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as unknown[];
    return parsed.filter((value): value is string => typeof value === "string" && isXboxBigId(value)).map((value) => value.toUpperCase());
  } catch {
    return [];
  }
}

export function sortXboxDeals(deals: readonly XboxDeal[], sort: XboxDealSort): XboxDeal[] {
  const copy = [...deals];
  copy.sort((left, right) => {
    switch (sort) {
      case "price-asc":
        return left.price - right.price || left.title.localeCompare(right.title, "nl");
      case "price-desc":
        return right.price - left.price || left.title.localeCompare(right.title, "nl");
      case "discount-desc":
        return right.discountPercent - left.discountPercent
          || left.price - right.price
          || left.title.localeCompare(right.title, "nl");
      case "title-asc":
      default:
        return left.title.localeCompare(right.title, "nl");
    }
  });
  return copy;
}

export function filterXboxDeals(deals: readonly XboxDeal[], kind: XboxDealKindFilter): XboxDeal[] {
  if (kind === "all") return [...deals];
  return deals.filter((deal) => (kind === "game" ? deal.productKind === "game" : deal.productKind === "dlc"));
}

export function filterXboxDealsByPublisher(
  deals: readonly XboxDeal[],
  publisherSlug: string | null,
): XboxDeal[] {
  if (!publisherSlug) return [...deals];
  return deals.filter(
    (deal) => deal.publisherName && publisherNameSlug(deal.publisherName) === publisherSlug,
  );
}

export function listXboxDealPublishers(deals: readonly XboxDeal[]): XboxDealPublisherOption[] {
  const buckets = new Map<string, { name: string; count: number }>();
  for (const deal of deals) {
    if (!deal.publisherName) continue;
    const slug = publisherNameSlug(deal.publisherName);
    const existing = buckets.get(slug);
    if (existing) existing.count += 1;
    else buckets.set(slug, { name: deal.publisherName, count: 1 });
  }
  return [...buckets.entries()]
    .map(([slug, value]) => ({ slug, name: value.name, count: value.count }))
    .sort((left, right) => left.name.localeCompare(right.name, "nl"));
}

const FAR_FUTURE_SALE_YEAR = 2040;

export function formatSaleEndNl(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  if (new Date(parsed).getUTCFullYear() >= FAR_FUTURE_SALE_YEAR) return null;
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
import { selectMicrosoftPrice, isXboxBigId, plainText } from "./store-match";
import type { XboxDeal, XboxDealKindFilter, XboxDealProductKind, XboxDealSort } from "./xbox-deals-types";

const IMAGE_HOST = "https:";

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

export function discountPercent(price: number, regularPrice: number): number {
  if (!(regularPrice > 0) || price >= regularPrice) return 0;
  return Math.round(((regularPrice - price) / regularPrice) * 100);
}

function productKindFromCatalog(product: Record<string, unknown> | undefined): XboxDealProductKind {
  const kind = String(product?.ProductKind ?? "").toLowerCase();
  const type = String(product?.ProductType ?? "").toLowerCase();
  if (kind === "game" || type === "game") return "game";
  return "dlc";
}

function productKindFromApps(entry: Record<string, unknown>): XboxDealProductKind {
  if (entry.isGame === true && entry.isCoreGame !== false) return "game";
  const family = String(entry.productFamilyName ?? "").toLowerCase();
  if (family.includes("game")) return "game";
  const categories = Array.isArray(entry.categories) ? entry.categories.map(String) : [];
  if (categories.some((value) => /dlc|add-?on|consumable|durable/i.test(value))) return "dlc";
  return entry.isGame === true ? "game" : "dlc";
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

/** Normalize a Display Catalog product into a deal row when it is on sale. */
export function xboxDealFromDisplayCatalog(
  product: Record<string, unknown>,
  gameIdByBigId: ReadonlyMap<string, string>,
): XboxDeal | null {
  const bigId = String(product.ProductId ?? "").toUpperCase();
  if (!isXboxBigId(bigId)) return null;
  const localized = (product.LocalizedProperties as Record<string, unknown>[] | undefined)?.[0] ?? {};
  const title = typeof localized.ProductTitle === "string" ? localized.ProductTitle : "";
  if (!title) return null;
  const priced = selectMicrosoftPrice(
    ((product.DisplaySkuAvailabilities as Record<string, unknown>[] | undefined) ?? []).flatMap((sku) => (
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
    )),
  );
  if (!priced || priced.regularPrice <= priced.price) return null;
  const productKind = productKindFromCatalog(product);
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
  };
}

/** Normalize one apps.microsoft.com deal list item. */
export function xboxDealFromAppsListItem(
  entry: Record<string, unknown>,
  gameIdByBigId: ReadonlyMap<string, string>,
  catalogById?: ReadonlyMap<string, Record<string, unknown>>,
): XboxDeal | null {
  const bigId = String(entry.productId ?? "").toUpperCase();
  if (!isXboxBigId(bigId)) return null;
  const title = typeof entry.title === "string" ? entry.title : "";
  if (!title) return null;
  const priceInfo = entry.priceInfo as { price?: number; msrp?: number } | undefined;
  const price = typeof priceInfo?.price === "number" ? priceInfo.price : typeof entry.price === "number" ? entry.price : null;
  const regularPrice = typeof priceInfo?.msrp === "number" ? priceInfo.msrp : price;
  if (price == null || regularPrice == null || regularPrice <= price) return null;

  const catalog = catalogById?.get(bigId);
  const productKind = catalog ? productKindFromCatalog(catalog) : productKindFromApps(entry);
  const coverUrl = coverFromCatalog(catalog) ?? coverFromApps(entry);
  const saleEndsAt = catalog ? saleEndFromCatalog(catalog) : null;

  return {
    bigId,
    title,
    coverUrl,
    price,
    regularPrice,
    discountPercent: discountPercent(price, regularPrice),
    currency: "EUR",
    productKind,
    saleEndsAt,
    storeUrl: xboxStoreProductUrl(bigId, typeof entry.encodedTitle === "string" ? entry.encodedTitle : undefined, title),
    gameId: gameIdByBigId.get(bigId) ?? null,
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

export function formatSaleEndNl(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
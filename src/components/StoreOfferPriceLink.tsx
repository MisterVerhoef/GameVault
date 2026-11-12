import type { CSSProperties } from "react";
import {
  formatEuro,
  formatLowestRecorded,
  formatOfferPrice,
  isLowestCurrentPrice,
  type CachedStoreOffer,
} from "@/data/store-offer-index";
import { formatHistoryDate } from "@/data/price-history";
import { storeName, type StoreId } from "@/data/store-match";

const STORE_LABEL: Record<StoreId, string> = {
  xbox: "Xbox",
  playstation: "PlayStation",
  nintendo: "Nintendo",
  steam: "Steam",
  epic: "Epic",
  gog: "GOG",
};

type Variant = "wishlist" | "detail";

export function storePriceLinkClass(lowestNow: boolean, variant: Variant): string {
  if (lowestNow) return "border-accent bg-accent/10";
  if (variant === "detail") {
    return "border-foreground/15 bg-card hover:bg-foreground/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10";
  }
  return "border-foreground/15 bg-card hover:bg-foreground/5";
}

export function StoreOfferPriceLink({
  offers,
  offer,
  gameTitle,
  variant,
  themeColor,
}: {
  offers: readonly CachedStoreOffer[];
  offer: CachedStoreOffer;
  gameTitle: string;
  variant: Variant;
  themeColor?: string;
}) {
  const priceLabel = formatOfferPrice(offer.price);
  const lowestNow = isLowestCurrentPrice(offers, offer);
  const saleLabel =
    offer.discountLabel && offer.regularPrice != null
      ? `, ${offer.discountLabel} off, was ${formatEuro(offer.regularPrice)}, on sale`
      : "";
  const lowestLabel = offer.lowestRecorded
    ? ` Lowest price GameVault has recorded: ${formatEuro(offer.lowestRecorded.price)} on ${formatHistoryDate(offer.lowestRecorded.date)}.`
    : "";
  const currentLabel = lowestNow ? " Lowest current price." : "";
  const storeLabel = variant === "detail" ? storeName(offer.store) : STORE_LABEL[offer.store];

  const wishlistClass =
    "flex min-h-[3.625rem] h-full min-w-0 flex-col justify-center gap-0.5 rounded-full border px-3 py-2 text-left text-xs leading-snug text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const detailClass =
    "inline-flex min-h-[3.625rem] min-w-0 flex-col items-start justify-center gap-0.5 rounded-full border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${gameTitle} on the ${storeName(offer.store)}, ${priceLabel}${saleLabel}.${lowestLabel}${currentLabel} Opens in a new tab.`}
      className={`${variant === "detail" ? detailClass : wishlistClass} ${storePriceLinkClass(lowestNow, variant)} text-foreground`}
      style={
        variant === "detail" && !lowestNow && themeColor
          ? ({ borderColor: `${themeColor}66`, "--store-theme": themeColor } as CSSProperties)
          : undefined
      }
    >
      <span className={`flex flex-wrap items-center gap-1${variant === "detail" ? " gap-2" : ""}`}>
        <span
          className={[
            variant === "wishlist" ? "font-semibold" : undefined,
            variant === "detail" && themeColor && !lowestNow
              ? "dark:text-[color:var(--store-theme)]"
              : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {storeLabel}
        </span>
        {lowestNow && (
          <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
            Lowest
          </span>
        )}
        {offer.discountLabel && (
          <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
            {offer.discountLabel}
          </span>
        )}
        {variant === "detail" &&
          offer.regularPrice != null &&
          offer.price != null &&
          offer.regularPrice > offer.price && (
            <span className="text-xs text-muted line-through">
              {formatEuro(offer.regularPrice)}
            </span>
          )}
        {variant === "detail" ? (
          offer.price != null ? (
            <span className="font-semibold text-foreground tabular-nums">{priceLabel}</span>
          ) : (
            <span className="text-muted">{priceLabel}</span>
          )
        ) : (
          <span className="flex flex-wrap items-baseline gap-1">
            {offer.price != null ? (
              <span className="font-semibold tabular-nums">{priceLabel}</span>
            ) : (
              <span className="text-[color:var(--muted-strong)]">Price unavailable</span>
            )}
            {offer.deal && offer.regularPrice != null && (
              <span className="text-[color:var(--muted-strong)] line-through tabular-nums">
                {formatEuro(offer.regularPrice)}
              </span>
            )}
          </span>
        )}
      </span>
      {offer.lowestRecorded && (
        <span
          className={
            variant === "wishlist"
              ? "text-[11px] leading-snug text-[color:var(--muted-strong)]"
              : "text-[10px] font-normal text-muted"
          }
        >
          {formatLowestRecorded(offer.lowestRecorded)}
        </span>
      )}
    </a>
  );
}

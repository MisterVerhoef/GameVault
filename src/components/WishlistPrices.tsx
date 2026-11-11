import { LOWEST_RECORDED_NOTE, formatHistoryDate } from "@/data/price-history";
import { offersForGame, formatEuro, formatLowestRecorded, formatOfferPrice, isLowestCurrentPrice, type StoreOfferIndex } from "@/data/store-offer-index";
import { storeName, type StoreId } from "@/data/store-match";

const STORE_LABEL: Record<StoreId, string> = {
  xbox: "Xbox",
  playstation: "PlayStation",
  nintendo: "Nintendo",
  steam: "Steam",
  epic: "Epic",
  gog: "GOG",
};

export type WishlistOfferState =
  | { status: "hidden" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; index: StoreOfferIndex };

export function WishlistPriceNote({ state }: { state: WishlistOfferState }) {
  if (state.status === "loading") {
    return <p className="mb-3 text-xs text-muted">Loading cached Netherlands store prices…</p>;
  }
  if (state.status === "error") {
    return (
      <p className="mb-3 text-xs text-muted" role="status">
        Cached store prices could not be loaded. Wishlist games are still listed.
      </p>
    );
  }
  if (state.status === "ready") {
    return (
      <p className="mb-3 text-xs text-muted">
        Netherlands EUR prices from the cached store catalogue. Games without a match stay unpriced. {LOWEST_RECORDED_NOTE}
      </p>
    );
  }
  return null;
}

export default function WishlistPrices({
  gameId,
  title,
  platforms,
  state,
  className = "",
}: {
  gameId: string;
  title: string;
  platforms?: readonly string[];
  state: WishlistOfferState;
  className?: string;
}) {
  if (state.status !== "ready") return null;
  const offers = offersForGame(state.index, gameId, platforms);
  if (offers.length === 0) {
    return <p className={`mt-1.5 text-[11px] leading-snug text-muted ${className}`}>No cached store price</p>;
  }

  return (
    <ul className={`grid min-w-0 grid-cols-2 content-start gap-1.5 ${className}`} aria-label={`${title} store prices`}>
      {offers.map((offer) => {
        const priceLabel = formatOfferPrice(offer.price);
        const lowestNow = isLowestCurrentPrice(offers, offer);
        const saleLabel = offer.discountLabel && offer.regularPrice != null
          ? `, ${offer.discountLabel} off, was ${formatEuro(offer.regularPrice)}, on sale`
          : "";
        const lowestLabel = offer.lowestRecorded
          ? ` Lowest price GameVault has recorded: ${formatEuro(offer.lowestRecorded.price)} on ${formatHistoryDate(offer.lowestRecorded.date)}.`
          : "";
        const currentLabel = lowestNow ? " Lowest current price." : "";
        return (
          <li key={offer.store} className="min-w-0">
            <a
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${title} on the ${storeName(offer.store)}, ${priceLabel}${saleLabel}.${lowestLabel}${currentLabel} Opens in a new tab.`}
              className={`flex h-full min-w-0 flex-col gap-0.5 rounded-full border px-3 py-2 text-left text-xs leading-snug text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                lowestNow
                  ? "border-accent bg-accent/10"
                  : "border-foreground/15 bg-card hover:bg-foreground/5"
              }`}
            >
              <span className="flex flex-wrap items-center gap-1">
                <span className="font-semibold">{STORE_LABEL[offer.store]}</span>
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
              </span>
              <span className="flex flex-wrap items-baseline gap-1">
                {offer.price != null ? (
                  <span className="font-semibold tabular-nums">{priceLabel}</span>
                ) : (
                  <span className="text-[color:var(--muted-strong)]">Price unavailable</span>
                )}
                {offer.deal && offer.regularPrice != null && (
                  <span className="text-[color:var(--muted-strong)] line-through tabular-nums">{formatEuro(offer.regularPrice)}</span>
                )}
              </span>
              {offer.lowestRecorded && (
                <span className="text-[11px] leading-snug text-[color:var(--muted-strong)]">{formatLowestRecorded(offer.lowestRecorded)}</span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

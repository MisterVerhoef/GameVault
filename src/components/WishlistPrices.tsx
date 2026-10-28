import { offersForGame, formatEuro, type StoreOfferIndex } from "@/data/store-offer-index";
import { storeName, type StoreId } from "@/data/store-match";

const STORE_LABEL: Record<StoreId, string> = {
  xbox: "Xbox",
  playstation: "PlayStation",
  nintendo: "Nintendo",
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
        Netherlands EUR prices from the cached store catalogue. Games without a match stay unpriced.
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
}: {
  gameId: string;
  title: string;
  platforms?: readonly string[];
  state: WishlistOfferState;
}) {
  if (state.status !== "ready") return null;
  const offers = offersForGame(state.index, gameId, platforms);
  if (offers.length === 0) {
    return <p className="mt-1.5 text-[11px] leading-snug text-muted">No cached store price</p>;
  }

  return (
    <ul className="mt-1.5 space-y-1" aria-label={`${title} store prices`}>
      {offers.map((offer) => {
        const priceLabel = offer.price != null ? formatEuro(offer.price) : "Price unavailable";
        const dealLabel = offer.deal && offer.regularPrice != null
          ? `, was ${formatEuro(offer.regularPrice)}, on sale`
          : "";
        return (
          <li key={offer.store}>
            <a
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${title} on the ${storeName(offer.store)}, ${priceLabel}${dealLabel}. Opens in a new tab.`}
              className="block rounded-lg bg-white/5 px-2 py-1.5 text-[11px] leading-snug text-foreground transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="flex flex-wrap items-center gap-1">
                <span className="font-medium">{STORE_LABEL[offer.store]}</span>
                {offer.deal && (
                  <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Deal
                  </span>
                )}
              </span>
              <span className="mt-0.5 flex flex-wrap items-baseline gap-1">
                {offer.price != null ? (
                  <span className="font-semibold">{formatEuro(offer.price)}</span>
                ) : (
                  <span className="text-muted">Price unavailable</span>
                )}
                {offer.deal && offer.regularPrice != null && (
                  <span className="text-muted line-through">{formatEuro(offer.regularPrice)}</span>
                )}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

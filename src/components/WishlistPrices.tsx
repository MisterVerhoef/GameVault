import { LOWEST_RECORDED_NOTE } from "@/data/price-history";
import { offersForGame, type StoreOfferIndex } from "@/data/store-offer-index";
import { StoreOfferPriceLink } from "@/components/StoreOfferPriceLink";

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
      {offers.map((offer) => (
        <li key={offer.store} className="min-w-0">
          <StoreOfferPriceLink offers={offers} offer={offer} gameTitle={title} variant="wishlist" />
        </li>
      ))}
    </ul>
  );
}

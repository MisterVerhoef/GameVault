import { formatOfferPrice } from "@/data/store-offer-index";

/**
 * Price shown beside a store link on the game page.
 * A missing amount uses the same wording and muted styling as the wishlist.
 */
export function GameStorePrice({ price }: { price: number | null }) {
  const label = formatOfferPrice(price);
  if (price == null) return <span className="text-muted">{label}</span>;
  return <span className="font-semibold text-foreground">{label}</span>;
}

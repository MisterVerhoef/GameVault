export type PlayStationDealPlatform = "PS4" | "PS5";

export type PlayStationDealProductKind = "game" | "dlc";

export type PlayStationDealSource =
  | "playstation-category-grid"
  | "catalog-snapshot"
  | "fixture"
  | "unavailable";

export type PlayStationDealStatus = "live" | "cached" | "unavailable";

export interface PlayStationDeal {
  platform: "playstation";
  /** PlayStation Store product id (SKU anchor). */
  productId: string;
  /** Concept id when the grid row is a concept; otherwise null. */
  conceptId: string | null;
  title: string;
  coverUrl: string | null;
  price: number;
  regularPrice: number;
  discountPercent: number;
  currency: "EUR";
  productKind: PlayStationDealProductKind;
  platformTags: PlayStationDealPlatform[];
  /** Member / PS Plus price when the store marks the offer as subscription-tied. */
  psPlusPrice: number | null;
  storeUrl: string;
  /** Catalogue game id when matched by concept or product id (exact id only). */
  gameId: string | null;
  publisherName?: string;
}

export interface PlayStationDealsPayload {
  source: PlayStationDealSource;
  status: PlayStationDealStatus;
  updatedAt: string;
  /** Timestamp of the last successful live fetch (for stale fallbacks). */
  lastUpdated?: string;
  deals: PlayStationDeal[];
  error?: string;
}
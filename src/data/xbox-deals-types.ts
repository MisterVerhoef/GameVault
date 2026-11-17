export type XboxDealSource =
  | "microsoft-reco"
  | "microsoft-apps-store"
  | "microsoft-xbox-deals-js"
  | "catalogue-cache"
  | "empty";

export type XboxDealProductKind = "game" | "dlc";

export type XboxDealSort = "price-asc" | "price-desc" | "discount-desc" | "title-asc";

export type XboxDealKindFilter = "all" | "game" | "dlc";

export interface XboxDeal {
  bigId: string;
  title: string;
  coverUrl: string | null;
  price: number;
  regularPrice: number;
  discountPercent: number;
  currency: "EUR";
  productKind: XboxDealProductKind;
  saleEndsAt: string | null;
  storeUrl: string;
  /** Catalogue game id when matched by Xbox bigId. */
  gameId: string | null;
  /** Microsoft Store or catalogue publisher label, when known. */
  publisherName: string | null;
}

export interface XboxDealPublisherOption {
  slug: string;
  name: string;
  count: number;
}

export interface XboxDealsPayload {
  source: XboxDealSource;
  updatedAt: string;
  deals: XboxDeal[];
  error?: string;
}
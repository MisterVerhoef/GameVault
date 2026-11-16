export interface IgdbSearchHit {
  id: string;
  title: string;
  cover?: { url: string };
  releaseYear?: number;
  rating?: number;
  ratingCount?: number;
  gameType?: number;
  hasPlatforms?: boolean;
  hasCompanies?: boolean;
  parentGameId?: string;
  versionParentId?: string;
}

export interface IgdbBasicGame {
  id: string;
  title: string;
  cover?: { url: string };
  releaseYear?: number;
  platforms?: string[];
}

export interface IgdbLiveGame {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  releaseYear?: number;
  genres: string[];
  themes: string[];
  platforms: import("@/data/platforms").Platform[];
  platformVariants: string[];
  developers: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
  cover?: { url: string };
  rating?: number;
  ratingCount?: number;
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  releases: { platform: string; date?: string; label?: string }[];
}

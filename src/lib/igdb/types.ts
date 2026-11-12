export interface IgdbSearchHit {
  id: string;
  title: string;
  cover?: { url: string };
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

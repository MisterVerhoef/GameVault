import type { Game } from "@/data/games";

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

/** Canonical game row returned from {@link import("./client").fetchIgdbGameById}. */
export type IgdbLiveGame = Game;
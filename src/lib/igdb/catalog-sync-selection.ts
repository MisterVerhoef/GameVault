/** Main retail games on IGDB (excludes DLC, mods, episodes, etc.). */
export const IGDB_MAIN_GAME_TYPE_FILTER = "game_type = (0,8,9,10,11) & version_parent = null";

export const DEFAULT_IGDB_RECENT_PAST_MONTHS = 18;
export const DEFAULT_IGDB_RECENT_FUTURE_MONTHS = 6;
export const DEFAULT_IGDB_RECENT_LIMIT = 500;
export const DEFAULT_IGDB_RECENT_PAGES = 5;

export const IGDB_CATALOG_GAME_FIELDS = [
  "fields id,name,slug,summary,storyline,first_release_date,rating,rating_count,aggregated_rating,aggregated_rating_count,",
  "genres.name,themes.name,game_modes.name,player_perspectives.name,platforms.name,cover.url,artworks.url,",
  "age_ratings.organization.name,age_ratings.rating_category.rating,age_ratings.category,age_ratings.rating,",
  "multiplayer_modes.campaigncoop,multiplayer_modes.dropin,multiplayer_modes.lancoop,multiplayer_modes.offlinecoop,multiplayer_modes.offlinecoopmax,multiplayer_modes.offlinemax,multiplayer_modes.onlinecoop,multiplayer_modes.onlinecoopmax,multiplayer_modes.onlinemax,multiplayer_modes.splitscreen,multiplayer_modes.splitscreenonline,",
  "release_dates.date,release_dates.human,release_dates.platform.name,release_dates.region,release_dates.release_region.region,",
  "screenshots.url,screenshots.width,screenshots.height,",
  "videos.id,videos.name,videos.video_id,websites.url,websites.category,websites.type.type,",
  "external_games.uid,external_games.external_game_source,external_games.category,external_games.url,",
  "involved_companies.developer,involved_companies.publisher,involved_companies.company.id,involved_companies.company.name,",
  "involved_companies.company.logo.image_id,involved_companies.company.logo.url,involved_companies.company.logo.width,involved_companies.company.logo.height,involved_companies.company.logo.alpha_channel,involved_companies.company.logo.animated,",
  "dlcs.id,dlcs.name,expansions.id,expansions.name,",
  "remakes.id,remakes.name,remasters.id,remasters.name,similar_games.id,similar_games.name,similar_games.cover.url,",
  "franchises.name,collections.name;",
].join(" ");

export type RecentSyncConfig = {
  pastMonths: number;
  futureMonths: number;
  limit: number;
  pages: number;
  sort: string;
};

export function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function firstReleaseWindowUnix(
  pastMonths: number,
  futureMonths: number,
  referenceDate: Date = new Date(),
): { start: number; end: number } {
  const startDate = addUtcMonths(referenceDate, -pastMonths);
  const endDate = addUtcMonths(referenceDate, futureMonths);
  return {
    start: Math.floor(startDate.getTime() / 1000),
    end: Math.floor(endDate.getTime() / 1000),
  };
}

export function buildPopularCatalogQuery(limit: number): string {
  return [
    IGDB_CATALOG_GAME_FIELDS,
    `limit ${limit};`,
    "where platforms != null;",
    "sort rating desc;",
  ].join(" ");
}

export function buildRecentCatalogQuery(
  options: {
    limit: number;
    pastMonths?: number;
    futureMonths?: number;
    sort?: string;
    referenceDate?: Date;
  },
): string {
  const pastMonths = options.pastMonths ?? DEFAULT_IGDB_RECENT_PAST_MONTHS;
  const futureMonths = options.futureMonths ?? DEFAULT_IGDB_RECENT_FUTURE_MONTHS;
  const sort = options.sort ?? "hypes desc;";
  const { start, end } = firstReleaseWindowUnix(pastMonths, futureMonths, options.referenceDate);
  return [
    IGDB_CATALOG_GAME_FIELDS,
    `limit ${options.limit};`,
    `where platforms != null & ${IGDB_MAIN_GAME_TYPE_FILTER} & first_release_date >= ${start} & first_release_date <= ${end};`,
    `sort ${sort}`,
  ].join(" ");
}

export function paginateIgdbQuery(query: string, limit: number, offset: number): string {
  return query.replace(/\blimit\s+\d+\s*;/i, `limit ${limit}; offset ${offset};`);
}

/** Same dedupe as the original sync script: later rows replace earlier ones. */
export function dedupeIgdbGamesLastWins<T extends { id: number }>(games: T[]): T[] {
  return Array.from(new Map(games.map((game) => [game.id, game])).values());
}

/** Keep every game from `primary`; add `secondary` only for ids not already present. */
export function mergeIgdbGamesPreferPrimary<T extends { id: number }>(primary: T[], secondary: T[]): T[] {
  const merged = new Map(primary.map((game) => [game.id, game]));
  for (const game of secondary) {
    if (!merged.has(game.id)) merged.set(game.id, game);
  }
  return Array.from(merged.values());
}

export function resolveRecentSyncConfig(env: NodeJS.ProcessEnv = process.env): RecentSyncConfig {
  const pastMonths = Number.parseInt(env.IGDB_RECENT_PAST_MONTHS ?? String(DEFAULT_IGDB_RECENT_PAST_MONTHS), 10);
  const futureMonths = Number.parseInt(env.IGDB_RECENT_FUTURE_MONTHS ?? String(DEFAULT_IGDB_RECENT_FUTURE_MONTHS), 10);
  const limit = Number.parseInt(env.IGDB_RECENT_LIMIT ?? String(DEFAULT_IGDB_RECENT_LIMIT), 10);
  const pages = Number.parseInt(env.IGDB_RECENT_PAGES ?? String(DEFAULT_IGDB_RECENT_PAGES), 10);
  const sort = (env.IGDB_RECENT_SORT ?? "hypes desc").trim();
  return {
    pastMonths,
    futureMonths,
    limit,
    pages,
    sort: sort.endsWith(";") ? sort : `${sort};`,
  };
}

export function assertRecentSyncConfig(config: RecentSyncConfig): void {
  if (!Number.isInteger(config.pastMonths) || config.pastMonths < 1 || config.pastMonths > 120) {
    throw new Error("IGDB_RECENT_PAST_MONTHS must be an integer between 1 and 120.");
  }
  if (!Number.isInteger(config.futureMonths) || config.futureMonths < 0 || config.futureMonths > 60) {
    throw new Error("IGDB_RECENT_FUTURE_MONTHS must be an integer between 0 and 60.");
  }
  if (!Number.isInteger(config.limit) || config.limit < 1 || config.limit > 500) {
    throw new Error("IGDB_RECENT_LIMIT must be an integer between 1 and 500.");
  }
  if (!Number.isInteger(config.pages) || config.pages < 0 || config.pages > 10) {
    throw new Error("IGDB_RECENT_PAGES must be an integer between 0 and 10.");
  }
  if (!config.sort || !/^[a-z_]+ desc;$/i.test(config.sort)) {
    throw new Error("IGDB_RECENT_SORT must be a single IGDB sort field ending in desc (for example hypes desc).");
  }
}
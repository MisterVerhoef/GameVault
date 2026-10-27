import { browseQuery, byRatingThenTitle, gameMatchesGenre, genreDefinition, GENRE_DEFINITIONS } from "./browse";
import type { CatalogueCard } from "./catalogue-card";
import { gameIsPlatformExclusive, gameMatchesPlatformVariant, isPcPlatformBrowse, type Platform } from "./platforms";
import { matchesSearchTerms } from "./search-terms";

const PLATFORMS: readonly Platform[] = ["PC", "PS5", "Xbox", "Switch", "Other"];

export interface BrowseRecord {
  id: string;
  slug: string;
  title: string;
  cover?: string;
  releaseYear?: number;
  rating?: number;
  genres?: string[];
  themes?: string[];
  platforms?: string[];
  platformVariants?: string[];
  multiplayer?: boolean;
  downloadable?: boolean;
  sourceIds?: string[];
}

export interface BrowseIndexFile {
  schemaVersion: number;
  games: BrowseRecord[];
}

export interface SearchIndexFile {
  schemaVersion: number;
  games: { id: string; terms: string }[];
}

export interface BrowseGame {
  id: string;
  slug: string;
  title: string;
  cover?: string;
  releaseYear?: number;
  rating?: number;
  genres: string[];
  themes: string[];
  platforms: Platform[];
  platformVariants: string[];
  multiplayer: boolean;
  downloadable: boolean;
  sourceIds: string[];
}

export interface BrowseCatalogue {
  games: BrowseGame[];
  byId: Map<string, BrowseGame>;
  bySourceId: Map<string, BrowseGame>;
  termsById: Map<string, string> | null;
  hasVariants: boolean;
}

export interface HomeQuery {
  search: string;
  family: string | null;
  platform: Platform | null;
  variant: string | null;
  genre: string | null;
  exclusives: boolean;
}

export interface LibraryWallSection {
  id: string;
  title: string;
  kind: "games" | "dlc";
  games: CatalogueCard[];
}

export interface LibraryView {
  query: HomeQuery;
  place: string | null;
  searching: boolean;
  trimmedSearch: string;
  featuredGame: CatalogueCard | null;
  /** Continue-playing titles, or the seeded recently played row. */
  continueGames: CatalogueCard[];
  heroGames: CatalogueCard[];
  topGames: CatalogueCard[];
  exclusivePreview: CatalogueCard[];
  exclusiveHref: string;
  genreRows: { key: string; label: string; href: string; games: CatalogueCard[] }[];
  wall: {
    key: string;
    title: string;
    games: CatalogueCard[];
    sections?: LibraryWallSection[];
    backHref: string;
    backLabel: string;
    emptyLabel?: string;
  } | null;
}

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function createBrowseCatalogue(browse: BrowseIndexFile, search: SearchIndexFile | null): BrowseCatalogue {
  if (browse.schemaVersion !== 1 || !Array.isArray(browse.games)) {
    throw new Error("Unsupported browse index.");
  }
  if (search && (search.schemaVersion !== 1 || !Array.isArray(search.games))) {
    throw new Error("Unsupported search index.");
  }

  const games: BrowseGame[] = browse.games.map((record) => {
    if (!record.id || !record.title || !record.slug) {
      throw new Error("Browse index record is missing an id, slug, or title.");
    }
    const platforms = (record.platforms ?? []).filter(isPlatform);
    if (platforms.length === 0) {
      throw new Error(`Browse index record ${record.id} has no platforms.`);
    }
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      cover: record.cover,
      releaseYear: record.releaseYear,
      rating: record.rating,
      genres: record.genres ?? [],
      themes: record.themes ?? [],
      platforms,
      platformVariants: record.platformVariants ?? [],
      multiplayer: record.multiplayer === true,
      downloadable: record.downloadable === true,
      sourceIds: record.sourceIds ?? [],
    };
  });

  const byId = new Map(games.map((game) => [game.id, game]));
  const bySourceId = new Map<string, BrowseGame>();
  for (const game of games) {
    for (const sourceId of game.sourceIds) {
      if (!byId.has(sourceId) && !bySourceId.has(sourceId)) bySourceId.set(sourceId, game);
    }
  }

  return {
    games,
    byId,
    bySourceId,
    termsById: search ? new Map(search.games.map((game) => [game.id, game.terms])) : null,
    hasVariants: games.some((game) => game.platformVariants.length > 0),
  };
}

export function findBrowseGame(catalogue: BrowseCatalogue, id: string) {
  return catalogue.byId.get(id) ?? catalogue.bySourceId.get(id);
}

export function toCard(game: BrowseGame): CatalogueCard {
  return {
    id: game.id,
    title: game.title,
    cover: game.cover ? { url: game.cover } : undefined,
    platforms: game.platforms,
    platformVariants: game.platformVariants,
    releaseYear: game.releaseYear,
    rating: game.rating,
  };
}

function oneParam(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function readHomeQuery(params: {
  search?: string | string[] | null;
  family?: string | string[] | null;
  platform?: string | string[] | null;
  variant?: string | string[] | null;
  genre?: string | string[] | null;
  exclusives?: string | string[] | null;
}): HomeQuery {
  const platform = oneParam(params.platform);
  const family = oneParam(params.family).trim();
  const variant = oneParam(params.variant).trim();
  const genre = oneParam(params.genre).trim();
  return {
    search: oneParam(params.search).trim(),
    family: family || null,
    platform: PLATFORMS.find((item) => item === platform) ?? null,
    variant: variant || null,
    genre: genre || null,
    exclusives: oneParam(params.exclusives) === "1",
  };
}

export function sameHomeQuery(left: HomeQuery, right: HomeQuery) {
  return left.search === right.search
    && left.family === right.family
    && left.platform === right.platform
    && left.variant === right.variant
    && left.genre === right.genre
    && left.exclusives === right.exclusives;
}

function onThisPlatform(game: BrowseGame, catalogue: BrowseCatalogue, platform: Platform | null, variant: string | null) {
  if (variant && catalogue.hasVariants) return gameMatchesPlatformVariant(game, variant);
  if (platform) return game.platforms.includes(platform);
  return true;
}

function matchesGenre(game: BrowseGame, genreKey: string) {
  if (genreDefinition(genreKey)?.key === "multiplayer") return game.multiplayer;
  return gameMatchesGenre(game, genreKey);
}

const RECENT_SEEDS = ["bg3", "god-of-war", "forza-horizon-5", "zelda-totk", "cyberpunk"];

const SEED_TITLE_HINTS: Record<string, string> = {
  bg3: "baldur's gate iii",
  "god-of-war": "god of war",
  "forza-horizon-5": "forza horizon 5",
  "zelda-totk": "tears of the kingdom",
  cyberpunk: "cyberpunk 2077",
  "elden-ring": "elden ring",
  "spider-man-2": "marvel's spider-man 2",
  "halo-infinite": "halo infinite",
  ff16: "final fantasy xvi",
  starfield: "starfield",
  "black-myth": "black myth",
};

function resolveSeed(catalogue: BrowseCatalogue, seed: string) {
  const direct = catalogue.byId.get(seed);
  if (direct) return direct;
  const slugNeedle = seed.toLowerCase();
  const compact = slugNeedle.replace(/-/g, "");
  const bySlug = catalogue.games.find((game) => {
    const slug = game.slug.toLowerCase();
    return slug === slugNeedle || slug.includes(compact);
  });
  if (bySlug) return bySlug;
  const titleHint = SEED_TITLE_HINTS[seed] ?? seed.replace(/-/g, " ").toLowerCase();
  return catalogue.games.find((game) => game.title.toLowerCase().includes(titleHint));
}

function recentlyPlayed(catalogue: BrowseCatalogue) {
  const resolved: BrowseGame[] = [];
  const seen = new Set<string>();
  for (const seed of RECENT_SEEDS) {
    const game = resolveSeed(catalogue, seed);
    if (game && !seen.has(game.id)) {
      seen.add(game.id);
      resolved.push(game);
    }
  }
  if (resolved.length > 0) return resolved;
  return [...catalogue.games]
    .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0) || (right.releaseYear ?? 0) - (left.releaseYear ?? 0))
    .slice(0, 5);
}

function searchGames(catalogue: BrowseCatalogue, query: string) {
  const termsById = catalogue.termsById;
  if (!termsById) return [];
  return catalogue.games.filter((game) => matchesSearchTerms(termsById.get(game.id) ?? "", query));
}

export function buildLibraryView(
  catalogue: BrowseCatalogue,
  query: HomeQuery,
  playingIds: readonly string[],
): LibraryView {
  const { platform, variant, family, genre: genreKey } = query;
  const trimmedSearch = query.search.trim();
  const place = variant || family || platform;
  const pcBrowse = isPcPlatformBrowse(platform, variant);
  const libraryHref = browseQuery({ family, platform, variant });

  const playing = playingIds.flatMap((id) => {
    const game = findBrowseGame(catalogue, id);
    return game ? [game] : [];
  });
  const continueGames = (playing.length > 0 ? playing : recentlyPlayed(catalogue))
    .filter((game) => onThisPlatform(game, catalogue, platform, variant));

  const platformGames = variant
    ? catalogue.games.filter((game) => gameMatchesPlatformVariant(game, variant))
    : platform
      ? catalogue.games.filter((game) => game.platforms.includes(platform))
      : [];
  const topGames = [...platformGames].sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));

  const exclusiveList = trimmedSearch || genreKey || pcBrowse || (!platform && !variant)
    ? []
    : catalogue.games
      .filter((game) => gameIsPlatformExclusive(game, { platform, variant }))
      .sort(byRatingThenTitle);

  const genreGames = trimmedSearch || !genreKey
    ? []
    : catalogue.games
      .filter((game) => matchesGenre(game, genreKey) && onThisPlatform(game, catalogue, platform, variant))
      .sort(byRatingThenTitle);

  const genreRows = trimmedSearch || genreKey
    ? []
    : GENRE_DEFINITIONS.map((definition) => ({
      key: definition.key,
      label: definition.label,
      href: browseQuery({ family, platform, variant, genre: definition.key }),
      games: catalogue.games
        .filter((game) => matchesGenre(game, definition.key) && onThisPlatform(game, catalogue, platform, variant))
        .sort(byRatingThenTitle)
        .slice(0, 12)
        .map(toCard),
    }));

  const searchResults = trimmedSearch
    ? searchGames(catalogue, trimmedSearch).filter((game) => onThisPlatform(game, catalogue, platform, variant))
    : [];

  const heroSource = variant ? platformGames.slice(0, 8) : continueGames;
  const heroGames = heroSource.map(toCard);
  const featuredFallback = platformGames[0] ?? continueGames[0];
  const featuredGame = heroGames.length > 0 || !featuredFallback ? null : toCard(featuredFallback);

  let wall: LibraryView["wall"] = null;
  if (trimmedSearch) {
    const games = searchResults.filter((game) => !game.downloadable).map(toCard);
    const dlc = searchResults.filter((game) => game.downloadable).map(toCard);
    const sections = dlc.length > 0
      ? [
        ...(games.length > 0 ? [{ id: "games", title: "Games", kind: "games" as const, games }] : []),
        { id: "dlc", title: "DLC", kind: "dlc" as const, games: dlc },
      ]
      : undefined;
    wall = {
      key: `search:${trimmedSearch}:${place ?? ""}`,
      title: `Search results for "${trimmedSearch}"`,
      games: searchResults.map(toCard),
      sections,
      backHref: libraryHref,
      backLabel: place ? `Back to ${place}` : "All games",
      emptyLabel: `"${trimmedSearch}"`,
    };
  } else if (genreKey) {
    const label = genreDefinition(genreKey)?.label ?? genreKey.trim();
    wall = {
      key: `genre:${genreKey}:${place ?? ""}`,
      title: place ? `${label} on ${place}` : label,
      games: genreGames.map(toCard),
      backHref: libraryHref,
      backLabel: place ? `Back to ${place}` : "All games",
    };
  } else if (query.exclusives && !pcBrowse) {
    wall = {
      key: `exclusives:${place ?? ""}`,
      title: place ? `${place} Exclusives` : "Exclusives",
      games: exclusiveList.map(toCard),
      backHref: libraryHref,
      backLabel: place ? `Back to ${place}` : "All games",
    };
  }

  return {
    query,
    place,
    searching: trimmedSearch.length > 0,
    trimmedSearch,
    featuredGame,
    continueGames: continueGames.map(toCard),
    heroGames,
    topGames: topGames.map(toCard),
    exclusivePreview: exclusiveList.slice(0, 12).map(toCard),
    exclusiveHref: browseQuery({ family, platform, variant, exclusives: true }),
    genreRows,
    wall,
  };
}

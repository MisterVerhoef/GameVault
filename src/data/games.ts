import generatedCatalogue from "../../public/catalog/games-index.json";
import { normalizeCatalogue } from "./catalogue";

export type Platform = "PC" | "PS5" | "Xbox" | "Switch";

// Platform theme colors (Xbox green, PS5 blue, Switch red, PC purple)
export const PLATFORM_COLORS: Record<Platform, string> = {
  PC: "#8B5CF6",      // Purple
  PS5: "#0070FF",     // Blue
  Xbox: "#107C10",    // Green
  Switch: "#E60012",  // Red
};

export interface CompanyRef {
  id: string;
  name: string;
}

export interface ImageAsset {
  url: string;
  width?: number;
  height?: number;
}

export interface VideoAsset {
  id: string;
  name?: string;
  url: string;
}

export interface ExternalLink {
  label: string;
  url: string;
  category?: "store" | "website" | "community";
}

export interface ContentRef {
  id: string;
  title: string;
}

export interface RelatedGame extends ContentRef {
  relation: "sequel" | "prequel" | "spinoff" | "collection" | "remake";
}

export interface AchievementSummary {
  total: number;
  earned: number;
}

export interface SourceRef {
  provider: string;
  id: string;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  releaseYear?: number;
  genres: string[];
  themes: string[];
  developers: CompanyRef[];
  publishers: CompanyRef[];
  platforms: Platform[];
  cover?: ImageAsset;
  background?: ImageAsset;
  rating?: number;
  ratingCount?: number;
  screenshots: ImageAsset[];
  videos: VideoAsset[];
  websites: ExternalLink[];
  dlc: ContentRef[];
  expansions: ContentRef[];
  editions: ContentRef[];
  relatedGames: RelatedGame[];
  similarGames: ContentRef[];
  franchises: string[];
  collections: string[];
  achievements?: AchievementSummary;
  source: SourceRef[];
  updatedAt: string;
}

/** Shape retained while the demo catalogue is migrated to the canonical model. */
interface LegacyGame {
  id: string;
  title: string;
  cover: string;
  platforms: Platform[];
  genre: string;
  year?: number;
  rating?: number;
  description?: string;
  achievements?: AchievementSummary;
  collections?: string[];
}

const now = "2026-01-01";

function toCanonicalGame(game: LegacyGame): Game {
  return {
    id: game.id,
    slug: game.id,
    title: game.title,
    summary: game.description,
    description: game.description,
    releaseYear: game.year,
    genres: [game.genre],
    themes: [],
    developers: [],
    publishers: [],
    platforms: game.platforms,
    cover: { url: game.cover },
    screenshots: [],
    videos: [],
    websites: [],
    dlc: [],
    expansions: [],
    editions: [],
    relatedGames: [],
    similarGames: [],
    franchises: [],
    collections: game.collections ?? [],
    achievements: game.achievements,
    source: [{ provider: "demo", id: game.id }],
    updatedAt: now,
    rating: game.rating,
  };
}

/** Compatibility view used by the existing presentation components. */
export function toLegacyGame(game: Game): LegacyGame & {
  cover: string;
  genre: string;
  year?: number;
} {
  return {
    ...game,
    cover: game.cover?.url ?? "",
    genre: game.genres[0] ?? "Unknown",
    year: game.releaseYear,
  };
}

// Steam's CDN provides stable, static cover art without requiring a runtime API call.
const steamAppIds: Record<string, number> = {
  "Baldur's Gate 3": 1086940,
  "Cyberpunk 2077": 1091500,
  "Elden Ring": 1245620,
  Starfield: 1716740,
  "Black Myth": 2358720,
  "God of War": 1593500,
  "Spider-Man 2": 1817070,
  "FF XVI": 2515020,
  "Horizon FW": 2420110,
  "Ghost of Tsushima": 2215430,
  "Forza H5": 1551360,
  "Halo Infinite": 1240440,
  "Gears 5": 1097840,
  "Sea of Thieves": 1172620,
  Hades: 1145360,
  Celeste: 504230,
  "Stardew Valley": 413150,
  "Hollow Knight": 367520,
  "Disco Elysium": 632470,
  "Helldivers 2": 553850,
  Palworld: 1623730,
  "Deep Rock": 548430,
  "It Takes Two": 1426210,
  "Overcooked 2": 728880,
};

const getCover = (title: string) => {
  const appId = steamAppIds[title];
  return appId
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`
    : undefined;
};

// Local catalogue entries without a Steam release retain a deterministic placeholder.
const cover = (title: string, color = "1a1a2e") =>
  getCover(title) ?? `https://placehold.co/400x600/${color}/ffffff?text=${encodeURIComponent(title)}&font=roboto`;

// ============================================
// TOP 5 GAMES PER PLATFORM (2023-2025)
// ============================================

// PC Top 5
const pcGamesSource: LegacyGame[] = [
  {
    id: "bg3",
    title: "Baldur's Gate 3",
    cover: cover("Baldur's Gate 3", "1a0a0a"),
    platforms: ["PC"],
    genre: "RPG",
    year: 2023,
    rating: 9.7,
    description: "A deep, narrative-driven RPG with unparalleled player choice and turn-based combat. Create your own character and explore the vast world of the Forgotten Realms.",
    achievements: { total: 80, earned: 35 },
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk 2077",
    cover: cover("Cyberpunk 2077", "0a1a2a"),
    platforms: ["PC"],
    genre: "Action",
    year: 2020,
    rating: 8.8,
    description: "An open-world RPG set in Night City, with deep customization and immersive storytelling. Play as V, a mercenary with a powerful cyberware implant.",
    achievements: { total: 75, earned: 66 },
  },
  {
    id: "elden-ring",
    title: "Elden Ring",
    cover: cover("Elden Ring", "1a0a0a"),
    platforms: ["PC"],
    genre: "Action",
    year: 2022,
    rating: 9.5,
    description: "An open-world Soulslike with challenging combat and deep lore. Explore the Lands Between and face powerful foes in this masterpiece from FromSoftware.",
    achievements: { total: 60, earned: 40 },
  },
  {
    id: "starfield",
    title: "Starfield",
    cover: cover("Starfield", "0a0a2a"),
    platforms: ["PC", "Xbox"],
    genre: "RPG",
    year: 2023,
    rating: 7.8,
    description: "Bethesda's space-faring RPG with planet exploration and deep character customization. Join Constellation and explore the settled systems.",
    achievements: { total: 50, earned: 15 },
  },
  {
    id: "black-myth",
    title: "Black Myth: Wukong",
    cover: cover("Black Myth", "1a0a2a"),
    platforms: ["PC"],
    genre: "Action",
    year: 2024,
    rating: 8.9,
    description: "A visually stunning action-adventure game inspired by Chinese mythology. Play as the Destined One and uncover the truth behind the Black Myth.",
    achievements: { total: 45, earned: 7 },
  },
];

// PS5 Top 5
const ps5GamesSource: LegacyGame[] = [
  {
    id: "god-of-war",
    title: "God of War Ragnarök",
    cover: cover("God of War", "1a1a0a"),
    platforms: ["PS5"],
    genre: "Action",
    year: 2022,
    rating: 9.4,
    description: "Kratos and Atreus embark on a mythic journey through the Nine Realms. Face the gods of Norse mythology in this epic conclusion to the Norse saga.",
    achievements: { total: 50, earned: 45 },
  },
  {
    id: "spider-man-2",
    title: "Marvel's Spider-Man 2",
    cover: cover("Spider-Man 2", "e60012"),
    platforms: ["PS5"],
    genre: "Action",
    year: 2023,
    rating: 9.1,
    description: "Swing through New York as Peter Parker and Miles Morales in this open-world adventure. Face new threats and discover the power of friendship.",
    achievements: { total: 60, earned: 0 },
  },
  {
    id: "ff16",
    title: "Final Fantasy XVI",
    cover: cover("FF XVI", "1a0a1a"),
    platforms: ["PS5"],
    genre: "RPG",
    year: 2023,
    rating: 8.7,
    description: "A dark fantasy epic with real-time combat and a gripping political narrative. Step into the world of Valisthea and witness the clash of Eikons.",
    achievements: { total: 55, earned: 17 },
  },
  {
    id: "horizon-fw",
    title: "Horizon Forbidden West",
    cover: cover("Horizon FW", "0a2a1a"),
    platforms: ["PS5"],
    genre: "Action",
    year: 2022,
    rating: 8.9,
    description: "Aloy's journey continues in a beautiful, post-apocalyptic America. Explore the mysterious Forbidden West and uncover its secrets.",
    achievements: { total: 50, earned: 25 },
  },
  {
    id: "ghost-tsushima",
    title: "Ghost of Tsushima",
    cover: cover("Ghost of Tsushima", "1a1a1a"),
    platforms: ["PS5"],
    genre: "Action",
    year: 2020,
    rating: 9.2,
    description: "A samurai epic set on Tsushima Island during the Mongol invasion. Choose between honorable samurai combat and the way of the Ghost.",
    achievements: { total: 45, earned: 40 },
  },
];

// Xbox Top 5
const xboxGamesSource: LegacyGame[] = [
  {
    id: "starfield",
    title: "Starfield",
    cover: cover("Starfield", "0a0a2a"),
    platforms: ["Xbox"],
    genre: "RPG",
    year: 2023,
    rating: 7.8,
    description: "Explore the settled systems and uncover the mysteries of the universe. Build your own ship, join a crew, and chart your own destiny among the stars.",
    achievements: { total: 50, earned: 10 },
  },
  {
    id: "forza-horizon-5",
    title: "Forza Horizon 5",
    cover: cover("Forza H5", "0a2a0a"),
    platforms: ["Xbox"],
    genre: "Racing",
    year: 2021,
    rating: 9.0,
    description: "The ultimate open-world racing experience in Mexico. Drive over 500 cars across beautiful and diverse landscapes in this critically acclaimed racing game.",
    achievements: { total: 70, earned: 53 },
  },
  {
    id: "halo-infinite",
    title: "Halo Infinite",
    cover: cover("Halo Infinite", "0a1a2a"),
    platforms: ["Xbox"],
    genre: "Shooter",
    year: 2021,
    rating: 8.5,
    description: "Master Chief returns in a new chapter of the legendary Halo franchise. Experience the next generation of Halo's iconic multiplayer and campaign.",
    achievements: { total: 60, earned: 36 },
  },
  {
    id: "gears-5",
    title: "Gears 5",
    cover: cover("Gears 5", "1a0a0a"),
    platforms: ["Xbox"],
    genre: "Shooter",
    year: 2019,
    rating: 8.8,
    description: "A cinematic third-person shooter with a gripping campaign and multiplayer. Join Kait Diaz on her journey to uncover the truth about her past and the Locust threat.",
    achievements: { total: 55, earned: 45 },
  },
  {
    id: "sea-of-thieves",
    title: "Sea of Thieves",
    cover: cover("Sea of Thieves", "0a1a2a"),
    platforms: ["Xbox"],
    genre: "Adventure",
    year: 2018,
    rating: 8.2,
    description: "A shared-world adventure game with piracy, exploration, and treasure hunting. Sail with friends, battle skeletons, and discover the legends of the Sea of Thieves.",
    achievements: { total: 40, earned: 16 },
  },
];

// Nintendo Switch Top 5
const switchGamesSource: LegacyGame[] = [
  {
    id: "zelda-totk",
    title: "The Legend of Zelda: Tears of the Kingdom",
    cover: cover("Zelda TotK", "0a2a1a"),
    platforms: ["Switch"],
    genre: "Adventure",
    year: 2023,
    rating: 9.6,
    description: "Link's greatest adventure yet, with new abilities and a vast open world. Explore the skies and depths of Hyrule in this groundbreaking sequel to Breath of the Wild.",
    achievements: { total: 0, earned: 0 },
  },
  {
    id: "mario-wonder",
    title: "Super Mario Bros. Wonder",
    cover: cover("Mario Wonder", "e60012"),
    platforms: ["Switch"],
    genre: "Platformer",
    year: 2023,
    rating: 9.3,
    description: "A vibrant 2D platformer with new power-ups and creative level design. Join Mario, Luigi, and friends in the Flower Kingdom for a wonderful new adventure.",
  },
  {
    id: "metroid-prime-4",
    title: "Metroid Prime 4",
    cover: cover("Metroid Prime 4", "1a0a2a"),
    platforms: ["Switch"],
    genre: "Adventure",
    year: 2025,
    rating: 9.0,
    description: "Samus Aran returns in a first-person adventure with exploration and combat. Discover the mysteries of a new planet in this long-awaited sequel.",
  },
  {
    id: "mario-kart-8",
    title: "Mario Kart 8 Deluxe",
    cover: cover("Mario Kart 8", "e60012"),
    platforms: ["Switch"],
    genre: "Racing",
    year: 2017,
    rating: 9.1,
    description: "The definitive kart racing experience with all DLC included. Race as your favorite Mario characters across 48 tracks in this beloved multiplayer classic.",
  },
  {
    id: "animal-crossing",
    title: "Animal Crossing: New Horizons",
    cover: cover("Animal Crossing", "0a2a1a"),
    platforms: ["Switch"],
    genre: "Simulation",
    year: 2020,
    rating: 8.9,
    description: "Build your own island paradise in this relaxing life simulation game. Collect, craft, and make friends with charming animal villagers.",
  },
];

// ============================================
// CATEGORIES (for genre-based browsing)
// ============================================

const indieGamesSource: LegacyGame[] = [
  {
    id: "hades",
    title: "Hades",
    cover: cover("Hades", "2a0a0a"),
    platforms: ["PC", "Switch"],
    genre: "Roguelike",
    year: 2020,
    rating: 9.3,
    description: "A critically acclaimed roguelike with fast-paced combat and rich narrative. Escape the Underworld as Zagreus, son of Hades, in this award-winning indie masterpiece.",
  },
  {
    id: "celeste",
    title: "Celeste",
    cover: cover("Celeste", "2a1a2a"),
    platforms: ["PC", "Switch"],
    genre: "Platformer",
    year: 2018,
    rating: 9.1,
    description: "A challenging platformer with a heartfelt story about mental health. Help Madeline climb Celeste Mountain in this touching and difficult indie game.",
  },
  {
    id: "stardew",
    title: "Stardew Valley",
    cover: cover("Stardew Valley", "0a2a1a"),
    platforms: ["PC", "Switch"],
    genre: "Simulation",
    year: 2016,
    rating: 9.2,
    description: "Escape to the countryside and build the farm of your dreams. Grow crops, raise animals, make friends, and find love in this beloved farming simulation.",
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    cover: cover("Hollow Knight", "1a2a0a"),
    platforms: ["PC", "Switch"],
    genre: "Metroidvania",
    year: 2017,
    rating: 9.0,
    description: "Explore the ruined kingdom of Hallownest in this beautiful Metroidvania. Battle challenging foes, discover hidden secrets, and uncover the mysteries of this atmospheric world.",
  },
  {
    id: "disco-elysium",
    title: "Disco Elysium",
    cover: cover("Disco Elysium", "1a1a0a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "RPG",
    year: 2019,
    rating: 9.4,
    description: "A unique RPG with deep dialogue, skill systems, and political intrigue. Play as a detective with a terrible hangover trying to solve a murder in this narrative masterpiece.",
  },
];

const multiplayerGamesSource: LegacyGame[] = [
  {
    id: "helldivers-2",
    title: "Helldivers 2",
    cover: cover("Helldivers 2", "2a1a0a"),
    platforms: ["PC", "PS5"],
    genre: "Shooter",
    year: 2024,
    rating: 8.6,
    description: "A cooperative third-person shooter with strategic teamwork and friendly fire. Fight for Super Earth in this chaotic and challenging multiplayer experience.",
  },
  {
    id: "palworld",
    title: "Palworld",
    cover: cover("Palworld", "0a2a2a"),
    platforms: ["PC", "Xbox"],
    genre: "Survival",
    year: 2024,
    rating: 8.0,
    description: "An open-world survival game with creature collection and base building. Capture Pals, build your base, and survive in this unique multiplayer adventure.",
  },
  {
    id: "deep-rock",
    title: "Deep Rock Galactic",
    cover: cover("Deep Rock", "1a0a0a"),
    platforms: ["PC", "PS5", "Xbox"],
    genre: "Shooter",
    year: 2020,
    rating: 9.0,
    description: "Cooperative mining and shooting with dwarves in procedurally generated caves. Dig, shoot, and drink beer with your fellow dwarves in this fantastic co-op experience.",
  },
  {
    id: "it-takes-two",
    title: "It Takes Two",
    cover: cover("It Takes Two", "2a0a1a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "Adventure",
    year: 2021,
    rating: 9.1,
    description: "A co-op only adventure game with creative gameplay and emotional storytelling. Work together with a friend in this award-winning cooperative experience.",
  },
  {
    id: "overcooked-2",
    title: "Overcooked! 2",
    cover: cover("Overcooked 2", "2a1a0a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "Party",
    year: 2018,
    rating: 8.5,
    description: "Chaotic cooking fun for up to four players in local or online multiplayer. Work together (or scream at each other) in this frantic cooking simulation.",
  },
];

// ============================================
// CANONICAL CATALOGUE AND COMPATIBILITY VIEWS
// ============================================
const sourceGames = [
  ...pcGamesSource,
  ...ps5GamesSource,
  ...xboxGamesSource,
  ...switchGamesSource,
  ...indieGamesSource,
  ...multiplayerGamesSource,
];

export const fallbackGames: Game[] = sourceGames.reduce<Game[]>((games, sourceGame) => {
  const existing = games.find((game) => game.id === sourceGame.id);
  if (existing) {
    existing.platforms = Array.from(new Set([...existing.platforms, ...sourceGame.platforms]));
    return games;
  }

  games.push(toCanonicalGame(sourceGame));
  return games;
}, []);

export const allGames: Game[] = normalizeCatalogue(generatedCatalogue, fallbackGames);

const gamesById = new Map(allGames.map((game) => [game.id, game]));
const getGames = (ids: string[]) => ids.flatMap((id) => {
  const game = gamesById.get(id);
  return game ? [game] : [];
});

export const pcGames = getGamesByPlatform("PC");
export const ps5Games = getGamesByPlatform("PS5");
export const xboxGames = getGamesByPlatform("Xbox");
export const switchGames = getGamesByPlatform("Switch");
export const recentlyPlayed = getGames(["bg3", "god-of-war", "forza-horizon-5", "zelda-totk", "cyberpunk"]);
export const actionGames = getGames(["elden-ring", "spider-man-2", "halo-infinite", "zelda-totk", "cyberpunk"]);
export const rpgGames = getGames(["bg3", "ff16", "starfield", "black-myth", "elden-ring"]);
export const indieGames = getGames(indieGamesSource.map((game) => game.id));
export const multiplayerGames = getGames(multiplayerGamesSource.map((game) => game.id));

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get games by platform
export function getGamesByPlatform(platform: Platform): Game[] {
  return allGames.filter(game => game.platforms.includes(platform));
}

// Get featured game (first from recently played)
export function getFeaturedGame(): Game {
  return recentlyPlayed[0];
}

// Get games by genre
export function getGamesByGenre(genre: string): Game[] {
  return allGames.filter(game => game.genres.some((value) => value.toLowerCase() === genre.toLowerCase()));
}

function buildSearchText(game: Game) {
  return [
    game.id,
    game.slug,
    game.title,
    game.summary ?? "",
    game.description ?? "",
    ...game.genres,
    ...game.themes,
    ...game.developers.map((company) => company.name),
    ...game.publishers.map((company) => company.name),
    ...game.franchises,
    ...game.collections,
  ]
    .join(" ")
    .toLowerCase();
}

// Search games across the generated catalogue metadata.
export function searchGames(query: string): Game[] {
  const lowerQuery = query.trim().toLowerCase();
  if (!lowerQuery) return allGames;

  return allGames.filter((game) => buildSearchText(game).includes(lowerQuery));
}

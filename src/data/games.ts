export type Platform = "PC" | "PS5" | "Xbox" | "Switch";

// Platform theme colors (Xbox green, PS5 blue, Switch red, PC purple)
export const PLATFORM_COLORS: Record<Platform, string> = {
  PC: "#8B5CF6",      // Purple
  PS5: "#0070FF",     // Blue
  Xbox: "#107C10",    // Green
  Switch: "#E60012",  // Red
};

export interface Game {
  id: string;
  title: string;
  cover: string;
  platforms: Platform[];
  genre: string;
  progress?: number; // 0-100 for "Continue Gaming"
  year?: number;
  rating?: number;
  description?: string;
  achievements?: { total: number; earned: number };
  collections?: string[]; // IDs of related games
}

// Using placehold.co for reliable demo covers (replace with real IGDB/Steam URLs later)
const cover = (title: string, color = "1a1a2e") =>
  `https://placehold.co/400x600/${color}/e0e0e0?text=${encodeURIComponent(title)}&font=roboto`;

// ============================================
// TOP 5 GAMES PER PLATFORM (2023-2025)
// ============================================

// PC Top 5
export const pcGames: Game[] = [
  {
    id: "bg3",
    title: "Baldur's Gate 3",
    cover: cover("Baldur's Gate 3", "2a1a0a"),
    platforms: ["PC"],
    genre: "RPG",
    progress: 42,
    year: 2023,
    rating: 9.7,
    description: "A deep, narrative-driven RPG with unparalleled player choice and turn-based combat.",
    achievements: { total: 80, earned: 35 },
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk 2077",
    cover: cover("Cyberpunk 2077", "0a1a2a"),
    platforms: ["PC"],
    genre: "Action",
    progress: 88,
    year: 2020,
    rating: 8.8,
    description: "An open-world RPG set in Night City, with deep customization and immersive storytelling.",
    achievements: { total: 75, earned: 66 },
  },
  {
    id: "elden-ring",
    title: "Elden Ring",
    cover: cover("Elden Ring", "1a0a0a"),
    platforms: ["PC"],
    genre: "Action",
    progress: 67,
    year: 2022,
    rating: 9.5,
    description: "An open-world Soulslike with challenging combat and deep lore.",
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
    description: "Bethesda's space-faring RPG with planet exploration and deep character customization.",
    achievements: { total: 50, earned: 15 },
  },
  {
    id: "black-myth",
    title: "Black Myth: Wukong",
    cover: cover("Black Myth", "1a0a2a"),
    platforms: ["PC"],
    genre: "Action",
    progress: 15,
    year: 2024,
    rating: 8.9,
    description: "A visually stunning action-adventure game inspired by Chinese mythology.",
    achievements: { total: 45, earned: 7 },
  },
];

// PS5 Top 5
export const ps5Games: Game[] = [
  {
    id: "god-of-war",
    title: "God of War Ragnarök",
    cover: cover("God of War", "1a1a0a"),
    platforms: ["PS5"],
    genre: "Action",
    progress: 90,
    year: 2022,
    rating: 9.4,
    description: "Kratos and Atreus embark on a mythic journey through the Nine Realms.",
    achievements: { total: 50, earned: 45 },
  },
  {
    id: "spider-man-2",
    title: "Marvel's Spider-Man 2",
    cover: cover("Spider-Man 2", "0a0a2a"),
    platforms: ["PS5"],
    genre: "Action",
    year: 2023,
    rating: 9.1,
    description: "Swing through New York as Peter Parker and Miles Morales in this open-world adventure.",
    achievements: { total: 60, earned: 0 },
  },
  {
    id: "ff16",
    title: "Final Fantasy XVI",
    cover: cover("FF XVI", "1a0a1a"),
    platforms: ["PS5"],
    genre: "RPG",
    progress: 30,
    year: 2023,
    rating: 8.7,
    description: "A dark fantasy epic with real-time combat and a gripping political narrative.",
    achievements: { total: 55, earned: 17 },
  },
  {
    id: "horizon-fw",
    title: "Horizon Forbidden West",
    cover: cover("Horizon FW", "0a2a0a"),
    platforms: ["PS5"],
    genre: "Action",
    year: 2022,
    rating: 8.9,
    description: "Aloy's journey continues in a beautiful, post-apocalyptic America.",
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
    description: "A samurai epic set on Tsushima Island during the Mongol invasion.",
    achievements: { total: 45, earned: 40 },
  },
];

// Xbox Top 5
export const xboxGames: Game[] = [
  {
    id: "starfield-xbox",
    title: "Starfield",
    cover: cover("Starfield", "0a0a2a"),
    platforms: ["Xbox"],
    genre: "RPG",
    progress: 20,
    year: 2023,
    rating: 7.8,
    description: "Explore the settled systems and uncover the mysteries of the universe.",
    achievements: { total: 50, earned: 10 },
  },
  {
    id: "forza-horizon-5",
    title: "Forza Horizon 5",
    cover: cover("Forza H5", "0a2a0a"),
    platforms: ["Xbox"],
    genre: "Racing",
    progress: 75,
    year: 2021,
    rating: 9.0,
    description: "The ultimate open-world racing experience in Mexico.",
    achievements: { total: 70, earned: 53 },
  },
  {
    id: "halo-infinite",
    title: "Halo Infinite",
    cover: cover("Halo Infinite", "0a1a2a"),
    platforms: ["Xbox"],
    genre: "Shooter",
    progress: 60,
    year: 2021,
    rating: 8.5,
    description: "Master Chief returns in a new chapter of the legendary Halo franchise.",
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
    description: "A cinematic third-person shooter with a gripping campaign and multiplayer.",
    achievements: { total: 55, earned: 45 },
  },
  {
    id: "sea-of-thieves",
    title: "Sea of Thieves",
    cover: cover("Sea of Thieves", "0a1a2a"),
    platforms: ["Xbox"],
    genre: "Adventure",
    progress: 40,
    year: 2018,
    rating: 8.2,
    description: "A shared-world adventure game with piracy, exploration, and treasure hunting.",
    achievements: { total: 40, earned: 16 },
  },
];

// Nintendo Switch Top 5
export const switchGames: Game[] = [
  {
    id: "zelda-totk",
    title: "The Legend of Zelda: Tears of the Kingdom",
    cover: cover("Zelda TotK", "0a2a1a"),
    platforms: ["Switch"],
    genre: "Adventure",
    progress: 71,
    year: 2023,
    rating: 9.6,
    description: "Link's greatest adventure yet, with new abilities and a vast open world.",
    achievements: { total: 0, earned: 0 }, // Switch uses different achievement system
  },
  {
    id: "mario-wonder",
    title: "Super Mario Bros. Wonder",
    cover: cover("Mario Wonder", "2a0a0a"),
    platforms: ["Switch"],
    genre: "Platformer",
    year: 2023,
    rating: 9.3,
    description: "A vibrant 2D platformer with new power-ups and creative level design.",
  },
  {
    id: "metroid-prime-4",
    title: "Metroid Prime 4",
    cover: cover("Metroid Prime 4", "1a0a2a"),
    platforms: ["Switch"],
    genre: "Adventure",
    year: 2025,
    rating: 9.0,
    description: "Samus Aran returns in a first-person adventure with exploration and combat.",
  },
  {
    id: "mario-kart-8",
    title: "Mario Kart 8 Deluxe",
    cover: cover("Mario Kart 8", "2a0a0a"),
    platforms: ["Switch"],
    genre: "Racing",
    progress: 80,
    year: 2017,
    rating: 9.1,
    description: "The definitive kart racing experience with all DLC included.",
  },
  {
    id: "animal-crossing",
    title: "Animal Crossing: New Horizons",
    cover: cover("Animal Crossing", "0a2a1a"),
    platforms: ["Switch"],
    genre: "Simulation",
    progress: 95,
    year: 2020,
    rating: 8.9,
    description: "Build your own island paradise in this relaxing life simulation game.",
  },
];

// ============================================
// CATEGORIES (for genre-based browsing)
// ============================================

export const recentlyPlayed: Game[] = [
  pcGames[0],  // Baldur's Gate 3
  ps5Games[0], // God of War Ragnarök
  xboxGames[1], // Forza Horizon 5
  switchGames[0], // Zelda: Tears of the Kingdom
  pcGames[1],  // Cyberpunk 2077
];

export const actionGames: Game[] = [
  pcGames[2],  // Elden Ring
  ps5Games[1], // Spider-Man 2
  xboxGames[2], // Halo Infinite
  switchGames[0], // Zelda: Tears of the Kingdom
  pcGames[1],  // Cyberpunk 2077
];

export const rpgGames: Game[] = [
  pcGames[0],  // Baldur's Gate 3
  ps5Games[2], // Final Fantasy XVI
  xboxGames[0], // Starfield
  pcGames[4],  // Black Myth: Wukong
  pcGames[2],  // Elden Ring
];

export const indieGames: Game[] = [
  {
    id: "hades",
    title: "Hades",
    cover: cover("Hades", "2a0a0a"),
    platforms: ["PC", "Switch"],
    genre: "Roguelike",
    year: 2020,
    rating: 9.3,
    description: "A critically acclaimed roguelike with fast-paced combat and rich narrative.",
  },
  {
    id: "celeste",
    title: "Celeste",
    cover: cover("Celeste", "2a1a2a"),
    platforms: ["PC", "Switch"],
    genre: "Platformer",
    year: 2018,
    rating: 9.1,
    description: "A challenging platformer with a heartfelt story about mental health.",
  },
  {
    id: "stardew",
    title: "Stardew Valley",
    cover: cover("Stardew Valley", "0a2a1a"),
    platforms: ["PC", "Switch"],
    genre: "Simulation",
    year: 2016,
    rating: 9.2,
    description: "Escape to the countryside and build the farm of your dreams.",
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    cover: cover("Hollow Knight", "1a2a0a"),
    platforms: ["PC", "Switch"],
    genre: "Metroidvania",
    year: 2017,
    rating: 9.0,
    description: "Explore the ruined kingdom of Hallownest in this beautiful Metroidvania.",
  },
  {
    id: "disco-elysium",
    title: "Disco Elysium",
    cover: cover("Disco Elysium", "1a1a0a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "RPG",
    year: 2019,
    rating: 9.4,
    description: "A unique RPG with deep dialogue, skill systems, and political intrigue.",
  },
];

export const multiplayerGames: Game[] = [
  {
    id: "helldivers-2",
    title: "Helldivers 2",
    cover: cover("Helldivers 2", "2a1a0a"),
    platforms: ["PC", "PS5"],
    genre: "Shooter",
    year: 2024,
    rating: 8.6,
    description: "A cooperative third-person shooter with strategic teamwork and friendly fire.",
  },
  {
    id: "palworld",
    title: "Palworld",
    cover: cover("Palworld", "0a2a2a"),
    platforms: ["PC", "Xbox"],
    genre: "Survival",
    year: 2024,
    rating: 8.0,
    description: "An open-world survival game with creature collection and base building.",
  },
  {
    id: "deep-rock",
    title: "Deep Rock Galactic",
    cover: cover("Deep Rock", "1a0a0a"),
    platforms: ["PC", "PS5", "Xbox"],
    genre: "Shooter",
    year: 2020,
    rating: 9.0,
    description: "Cooperative mining and shooting with dwarves in procedurally generated caves.",
  },
  {
    id: "it-takes-two",
    title: "It Takes Two",
    cover: cover("It Takes Two", "2a0a1a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "Adventure",
    year: 2021,
    rating: 9.1,
    description: "A co-op only adventure game with creative gameplay and emotional storytelling.",
  },
  {
    id: "overcooked-2",
    title: "Overcooked! 2",
    cover: cover("Overcooked 2", "2a1a0a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genre: "Party",
    year: 2018,
    rating: 8.5,
    description: "Chaotic cooking fun for up to four players in local or online multiplayer.",
  },
];

// ============================================
// ALL GAMES (for search functionality)
// ============================================
export const allGames: Game[] = [
  ...pcGames,
  ...ps5Games,
  ...xboxGames,
  ...switchGames,
  ...indieGames,
  ...multiplayerGames,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get games by platform
export function getGamesByPlatform(platform: Platform): Game[] {
  return allGames.filter(game => game.platforms.includes(platform));
}

// Get featured game (highest progress from recently played)
export function getFeaturedGame(): Game {
  const gameWithProgress = recentlyPlayed.find(g => g.progress !== undefined);
  return gameWithProgress || recentlyPlayed[0];
}

// Get games by genre
export function getGamesByGenre(genre: string): Game[] {
  return allGames.filter(game => game.genre.toLowerCase() === genre.toLowerCase());
}

// Search games by title
export function searchGames(query: string): Game[] {
  const lowerQuery = query.toLowerCase();
  return allGames.filter(game => 
    game.title.toLowerCase().includes(lowerQuery) ||
    game.genre.toLowerCase().includes(lowerQuery)
  );
}

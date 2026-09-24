export type Platform = "PC" | "PS5" | "Xbox" | "Switch" | "Steam Deck";

export interface Game {
  id: string;
  title: string;
  cover: string;
  platforms: Platform[];
  progress?: number; // 0-100
  year?: number;
  rating?: number;
}

// Using placehold.co for reliable demo covers (replace with real IGDB/Steam URLs later)
const cover = (title: string, color = "1a1a2e") =>
  `https://placehold.co/400x600/${color}/e0e0e0?text=${encodeURIComponent(title)}&font=roboto`;

export const recentlyPlayed: Game[] = [
  {
    id: "1",
    title: "Elden Ring",
    cover: cover("Elden Ring", "1a0a0a"),
    platforms: ["PC", "PS5", "Xbox"],
    progress: 67,
    year: 2022,
    rating: 9.5,
  },
  {
    id: "2",
    title: "Baldur's Gate 3",
    cover: cover("Baldur's Gate 3", "2a1a0a"),
    platforms: ["PC", "PS5"],
    progress: 42,
    year: 2023,
    rating: 9.7,
  },
  {
    id: "3",
    title: "Cyberpunk 2077",
    cover: cover("Cyberpunk 2077", "0a1a2a"),
    platforms: ["PC", "PS5", "Xbox"],
    progress: 88,
    year: 2020,
    rating: 8.8,
  },
  {
    id: "4",
    title: "Hades II",
    cover: cover("Hades II", "2a0a1a"),
    platforms: ["PC"],
    progress: 23,
    year: 2024,
    rating: 9.2,
  },
  {
    id: "5",
    title: "Zelda: Tears of the Kingdom",
    cover: cover("Zelda TotK", "0a2a1a"),
    platforms: ["Switch"],
    progress: 71,
    year: 2023,
    rating: 9.6,
  },
  {
    id: "6",
    title: "Black Myth: Wukong",
    cover: cover("Black Myth Wukong", "1a0a2a"),
    platforms: ["PC", "PS5"],
    progress: 15,
    year: 2024,
    rating: 8.9,
  },
];

export const actionGames: Game[] = [
  {
    id: "7",
    title: "God of War Ragnarök",
    cover: cover("God of War", "1a1a0a"),
    platforms: ["PS5", "PC"],
    year: 2022,
    rating: 9.4,
  },
  {
    id: "8",
    title: "Spider-Man 2",
    cover: cover("Spider-Man 2", "0a0a2a"),
    platforms: ["PS5"],
    year: 2023,
    rating: 9.1,
  },
  {
    id: "9",
    title: "Doom Eternal",
    cover: cover("Doom Eternal", "2a0a0a"),
    platforms: ["PC", "PS5", "Xbox"],
    year: 2020,
    rating: 9.0,
  },
  {
    id: "10",
    title: "Sekiro",
    cover: cover("Sekiro", "0a1a1a"),
    platforms: ["PC", "PS5", "Xbox"],
    year: 2019,
    rating: 9.3,
  },
  {
    id: "11",
    title: "Horizon Forbidden West",
    cover: cover("Horizon FW", "0a2a0a"),
    platforms: ["PS5", "PC"],
    year: 2022,
    rating: 8.9,
  },
  {
    id: "12",
    title: "Ghost of Tsushima",
    cover: cover("Ghost of Tsushima", "1a1a1a"),
    platforms: ["PS5", "PC"],
    year: 2020,
    rating: 9.2,
  },
];

export const rpgGames: Game[] = [
  {
    id: "13",
    title: "The Witcher 3",
    cover: cover("Witcher 3", "0a1a0a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    year: 2015,
    rating: 9.6,
  },
  {
    id: "14",
    title: "Final Fantasy XVI",
    cover: cover("FF XVI", "1a0a1a"),
    platforms: ["PS5", "PC"],
    year: 2023,
    rating: 8.7,
  },
  {
    id: "15",
    title: "Persona 5 Royal",
    cover: cover("Persona 5", "2a0a2a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    year: 2019,
    rating: 9.5,
  },
  {
    id: "16",
    title: "Dragon Age: Veilguard",
    cover: cover("Dragon Age", "0a0a1a"),
    platforms: ["PC", "PS5", "Xbox"],
    year: 2024,
    rating: 8.2,
  },
  {
    id: "17",
    title: "Starfield",
    cover: cover("Starfield", "0a0a2a"),
    platforms: ["PC", "Xbox"],
    year: 2023,
    rating: 7.8,
  },
];

export const indieGames: Game[] = [
  {
    id: "18",
    title: "Hollow Knight: Silksong",
    cover: cover("Silksong", "1a2a0a"),
    platforms: ["PC", "Switch"],
    year: 2025,
    rating: 9.4,
  },
  {
    id: "19",
    title: "Celeste",
    cover: cover("Celeste", "2a1a2a"),
    platforms: ["PC", "Switch", "PS5", "Xbox"],
    year: 2018,
    rating: 9.1,
  },
  {
    id: "20",
    title: "Hades",
    cover: cover("Hades", "2a0a0a"),
    platforms: ["PC", "Switch", "PS5", "Xbox"],
    year: 2020,
    rating: 9.3,
  },
  {
    id: "21",
    title: "Stardew Valley",
    cover: cover("Stardew Valley", "0a2a1a"),
    platforms: ["PC", "Switch", "PS5", "Xbox", "Steam Deck"],
    year: 2016,
    rating: 9.2,
  },
  {
    id: "22",
    title: "Disco Elysium",
    cover: cover("Disco Elysium", "1a1a0a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    year: 2019,
    rating: 9.4,
  },
];

export const multiplayerGames: Game[] = [
  {
    id: "23",
    title: "Helldivers 2",
    cover: cover("Helldivers 2", "2a1a0a"),
    platforms: ["PC", "PS5"],
    year: 2024,
    rating: 8.6,
  },
  {
    id: "24",
    title: "Palworld",
    cover: cover("Palworld", "0a2a2a"),
    platforms: ["PC", "Xbox"],
    year: 2024,
    rating: 8.0,
  },
  {
    id: "25",
    title: "Deep Rock Galactic",
    cover: cover("Deep Rock", "1a0a0a"),
    platforms: ["PC", "PS5", "Xbox"],
    year: 2020,
    rating: 9.0,
  },
  {
    id: "26",
    title: "It Takes Two",
    cover: cover("It Takes Two", "2a0a1a"),
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    year: 2021,
    rating: 9.1,
  },
];

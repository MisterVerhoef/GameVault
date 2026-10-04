import type { Game } from "./games";

export interface CatalogueIndex {
  schemaVersion: 1;
  generatedAt: string;
  games: Game[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGame(value: unknown): value is Game {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.genres) &&
    value.genres.every((genre) => typeof genre === "string") &&
    Array.isArray(value.platforms) &&
    value.platforms.length > 0 &&
    Array.isArray(value.screenshots) &&
    Array.isArray(value.videos) &&
    Array.isArray(value.websites) &&
    Array.isArray(value.dlc) &&
    Array.isArray(value.expansions) &&
    Array.isArray(value.editions) &&
    Array.isArray(value.relatedGames) &&
    Array.isArray(value.similarGames) &&
    Array.isArray(value.franchises) &&
    Array.isArray(value.collections) &&
    Array.isArray(value.source) &&
    typeof value.updatedAt === "string"
  );
}

export function validateCatalogue(value: unknown): value is CatalogueIndex {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.generatedAt !== "string") {
    return false;
  }

  return Array.isArray(value.games) && value.games.every(isGame);
}

export function normalizeCatalogue(value: unknown, fallback: Game[]): Game[] {
  return validateCatalogue(value) ? value.games : fallback;
}

import { allGames, type Game } from "./games";
import { collectStudios, type StudioRecord } from "./studio-profile";

export type { StudioRecord } from "./studio-profile";

export interface Studio extends StudioRecord {
  games: Game[];
}

const gamesById = new Map(allGames.map((game) => [game.id, game]));

function toStudio(record: StudioRecord): Studio {
  return {
    ...record,
    games: record.gameIds
      .map((id) => gamesById.get(id))
      .filter((game): game is Game => Boolean(game)),
  };
}

const studios = collectStudios(allGames).map(toStudio);
const studiosById = new Map(studios.map((studio) => [studio.id, studio]));

export function getStudio(id: string): Studio | undefined {
  return studiosById.get(id);
}

export function allStudios(): Studio[] {
  return studios;
}

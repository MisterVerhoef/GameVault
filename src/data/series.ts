import { allGames, type Game } from "./games";
import { collectSeries, seriesPath, type SeriesKind, type SeriesRecord } from "./series-profile";

export type { SeriesKind, SeriesRecord } from "./series-profile";
export { describeSeries, seriesInitials, seriesMetadata, seriesPath, seriesSlug } from "./series-profile";

export interface Series extends SeriesRecord {
  games: Game[];
}

const gamesById = new Map(allGames.map((game) => [game.id, game]));

function toSeries(record: SeriesRecord): Series {
  return {
    ...record,
    games: record.gameIds
      .map((id) => gamesById.get(id))
      .filter((game): game is Game => Boolean(game)),
  };
}

function indexSeries(kind: SeriesKind) {
  const series = collectSeries(allGames, kind).map(toSeries);
  return {
    series,
    byId: new Map(series.map((entry) => [entry.id, entry])),
    byName: new Map(series.map((entry) => [entry.name, entry])),
  };
}

const franchises = indexSeries("franchise");
const collections = indexSeries("collection");

export function getFranchise(id: string): Series | undefined {
  return franchises.byId.get(id);
}

export function allFranchises(): Series[] {
  return franchises.series;
}

export function getCollection(id: string): Series | undefined {
  return collections.byId.get(id);
}

export function allCollections(): Series[] {
  return collections.series;
}

export function franchiseHref(name: string): string | undefined {
  const series = franchises.byName.get(name);
  return series ? seriesPath("franchise", series.id) : undefined;
}

export function collectionHref(name: string): string | undefined {
  const series = collections.byName.get(name);
  return series ? seriesPath("collection", series.id) : undefined;
}

import { allGames, type Game } from "./games";
import { collectPublishers, sortPublisherGames, type PublisherRecord } from "./publisher-profile";

export type { PublisherRecord } from "./publisher-profile";
export { publisherHref, publisherMetadata, describePublisher } from "./publisher-profile";

export interface Publisher extends PublisherRecord {
  games: Game[];
}

const gamesById = new Map(allGames.map((game) => [game.id, game]));

function toPublisher(record: PublisherRecord): Publisher {
  const games = record.gameIds
    .map((id) => gamesById.get(id))
    .filter((game): game is Game => Boolean(game));
  return {
    ...record,
    games: sortPublisherGames(games),
  };
}

const publishers = collectPublishers(allGames).map(toPublisher);
const publishersById = new Map(publishers.map((publisher) => [publisher.id, publisher]));

export function getPublisher(id: string): Publisher | undefined {
  return publishersById.get(id);
}

export function allPublishers(): Publisher[] {
  return publishers;
}
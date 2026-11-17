import { catalogueCompanyLogo, type CatalogueCompanyLogo } from "./studio-logo";
import type { StudioCompany, StudioSourceGame } from "./studio-profile";

export interface PublisherRecord {
  id: string;
  name: string;
  publishedIds: string[];
  gameIds: string[];
  yearStart?: number;
  yearEnd?: number;
  notableTitles: string[];
  backgroundUrl?: string;
  logo?: CatalogueCompanyLogo;
  summary: string;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function describePublisher(input: {
  name: string;
  publishedCount: number;
  yearStart?: number;
  yearEnd?: number;
  notableTitles: string[];
}) {
  const count = input.publishedCount === 1 ? "1 game" : `${input.publishedCount} games`;
  const years = input.yearStart != null && input.yearEnd != null
    ? input.yearStart === input.yearEnd
      ? ` Catalogue releases are from ${input.yearStart}.`
      : ` Catalogue releases run from ${input.yearStart} to ${input.yearEnd}.`
    : "";
  const notable = input.notableTitles.length > 0
    ? ` Notable titles include ${joinList(input.notableTitles)}.`
    : "";
  return `${input.name} is a publisher in the GameVault catalogue, with ${count} published here.${years}${notable}`;
}

export function publisherMetadata(input: {
  gameCount: number;
  yearStart?: number;
  yearEnd?: number;
}) {
  const parts = [
    "Publisher",
    input.gameCount === 1 ? "1 game" : `${input.gameCount} games`,
  ];
  if (input.yearStart != null && input.yearEnd != null) {
    parts.push(input.yearStart === input.yearEnd ? String(input.yearStart) : `${input.yearStart}–${input.yearEnd}`);
  }
  return parts.join(" · ");
}

export function publisherHref(id: string) {
  return `/publisher/${encodeURIComponent(id)}`;
}

export function sortPublisherGames<T extends { title: string; releaseYear?: number; rating?: number }>(
  games: readonly T[],
): T[] {
  const copy = [...games];
  copy.sort((left, right) => {
    const leftYear = left.releaseYear ?? -1;
    const rightYear = right.releaseYear ?? -1;
    if (rightYear !== leftYear) return rightYear - leftYear;
  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
  });
  return copy;
}

function byRatingThenTitle(left: StudioSourceGame, right: StudioSourceGame) {
  const rating = (right.rating ?? -1) - (left.rating ?? -1);
  if (rating !== 0) return rating;
  return left.title.localeCompare(right.title);
}

export function collectPublishers(games: readonly StudioSourceGame[]): PublisherRecord[] {
  const buckets = new Map<string, {
    id: string;
    name: string;
    published: Set<string>;
    logo?: CatalogueCompanyLogo;
  }>();

  function bucket(company: StudioCompany) {
    const id = company.id.trim();
    const name = company.name.trim();
    if (!id || !name) return undefined;
    const existing = buckets.get(id);
    const logo = existing?.logo ?? catalogueCompanyLogo(company.logo);
    if (existing) {
      if (name.length > existing.name.length) existing.name = name;
      if (logo && !existing.logo) existing.logo = logo;
      return existing;
    }
    const created = {
      id,
      name,
      published: new Set<string>(),
      ...(logo ? { logo } : {}),
    };
    buckets.set(id, created);
    return created;
  }

  for (const game of games) {
    for (const company of game.publishers ?? []) bucket(company)?.published.add(game.id);
  }

  const byGameId = new Map(games.map((game) => [game.id, game]));
  const publishers: PublisherRecord[] = [];

  for (const bucketRecord of buckets.values()) {
    if (bucketRecord.published.size === 0) continue;
    const publishedGames = [...bucketRecord.published]
      .map((id) => byGameId.get(id))
      .filter((game): game is StudioSourceGame => Boolean(game))
      .sort(byRatingThenTitle);
    const years = publishedGames
      .map((game) => game.releaseYear)
      .filter((year): year is number => typeof year === "number");
    const notableTitles = publishedGames.slice(0, 3).map((game) => game.title);
    const backgroundUrl = publishedGames.find((game) => game.background?.url)?.background?.url;
    const yearStart = years.length > 0 ? Math.min(...years) : undefined;
    const yearEnd = years.length > 0 ? Math.max(...years) : undefined;
    const publishedIds = publishedGames.map((game) => game.id);
    publishers.push({
      id: bucketRecord.id,
      name: bucketRecord.name,
      publishedIds,
      gameIds: publishedIds,
      yearStart,
      yearEnd,
      notableTitles,
      backgroundUrl,
      ...(bucketRecord.logo ? { logo: bucketRecord.logo } : {}),
      summary: describePublisher({
        name: bucketRecord.name,
        publishedCount: publishedIds.length,
        yearStart,
        yearEnd,
        notableTitles,
      }),
    });
  }

  return publishers.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}
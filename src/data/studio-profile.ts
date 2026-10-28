import { catalogueCompanyLogo, type CatalogueCompanyLogo } from "./studio-logo";

export interface StudioCompany {
  id: string;
  name: string;
  logo?: { url?: string; width?: number; height?: number } | null;
}

export interface StudioSourceGame {
  id: string;
  title: string;
  rating?: number;
  releaseYear?: number;
  developers?: StudioCompany[];
  publishers?: StudioCompany[];
  background?: { url?: string };
}

export interface StudioRecord {
  id: string;
  name: string;
  developedIds: string[];
  publishedIds: string[];
  gameIds: string[];
  yearStart?: number;
  yearEnd?: number;
  notableTitles: string[];
  backgroundUrl?: string;
  /** Company logo from catalogue sync, when any credited game stored one. */
  logo?: CatalogueCompanyLogo;
  summary: string;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function countLabel(count: number, verb: "developed" | "published") {
  return `${count} ${verb} ${count === 1 ? "game" : "games"}`;
}

/** Catalogue-derived bio. IGDB company descriptions are not stored. Logos are optional image URLs on each company. */
export function describeStudio(input: {
  name: string;
  developedCount: number;
  publishedCount: number;
  yearStart?: number;
  yearEnd?: number;
  notableTitles: string[];
}) {
  const roles = [
    input.developedCount > 0 ? "developer" : "",
    input.publishedCount > 0 ? "publisher" : "",
  ].filter(Boolean);
  const roleText = roles.length === 2
    ? "a developer and publisher"
    : roles.length === 1
      ? `a ${roles[0]}`
      : "a studio";
  const counts = [
    input.developedCount > 0 ? countLabel(input.developedCount, "developed") : "",
    input.publishedCount > 0 ? countLabel(input.publishedCount, "published") : "",
  ].filter(Boolean);
  const years = input.yearStart != null && input.yearEnd != null
    ? input.yearStart === input.yearEnd
      ? ` Catalogue releases are from ${input.yearStart}.`
      : ` Catalogue releases run from ${input.yearStart} to ${input.yearEnd}.`
    : "";
  const notable = input.notableTitles.length > 0
    ? ` Notable titles include ${joinList(input.notableTitles)}.`
    : "";
  const library = counts.length > 0 ? `, with ${joinList(counts)}` : "";
  return `${input.name} is ${roleText} in the GameVault catalogue${library}.${years}${notable}`;
}

export function studioMetadata(input: {
  developedCount: number;
  publishedCount: number;
  gameCount: number;
  yearStart?: number;
  yearEnd?: number;
}) {
  const parts: string[] = [];
  if (input.developedCount > 0) parts.push("Developer");
  if (input.publishedCount > 0) parts.push("Publisher");
  parts.push(input.gameCount === 1 ? "1 game" : `${input.gameCount} games`);
  if (input.yearStart != null && input.yearEnd != null) {
    parts.push(input.yearStart === input.yearEnd ? String(input.yearStart) : `${input.yearStart}–${input.yearEnd}`);
  }
  return parts.join(" · ");
}

export function studioInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function byRatingThenTitle(left: StudioSourceGame, right: StudioSourceGame) {
  const rating = (right.rating ?? -1) - (left.rating ?? -1);
  if (rating !== 0) return rating;
  return left.title.localeCompare(right.title);
}

export function collectStudios(games: readonly StudioSourceGame[]): StudioRecord[] {
  const buckets = new Map<string, {
    id: string;
    name: string;
    developed: Set<string>;
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
      developed: new Set<string>(),
      published: new Set<string>(),
      ...(logo ? { logo } : {}),
    };
    buckets.set(id, created);
    return created;
  }

  for (const game of games) {
    for (const company of game.developers ?? []) bucket(company)?.developed.add(game.id);
    for (const company of game.publishers ?? []) bucket(company)?.published.add(game.id);
  }

  const byGameId = new Map(games.map((game) => [game.id, game]));
  const studios: StudioRecord[] = [];

  for (const bucketRecord of buckets.values()) {
    const gameIds = [...new Set([...bucketRecord.developed, ...bucketRecord.published])];
    const studioGames = gameIds
      .map((id) => byGameId.get(id))
      .filter((game): game is StudioSourceGame => Boolean(game))
      .sort(byRatingThenTitle);
    const years = studioGames
      .map((game) => game.releaseYear)
      .filter((year): year is number => typeof year === "number");
    const developedGames = studioGames.filter((game) => bucketRecord.developed.has(game.id));
    const notableSource = developedGames.length > 0 ? developedGames : studioGames;
    const notableTitles = notableSource.slice(0, 3).map((game) => game.title);
    const backgroundUrl = studioGames.find((game) => game.background?.url)?.background?.url;
    const yearStart = years.length > 0 ? Math.min(...years) : undefined;
    const yearEnd = years.length > 0 ? Math.max(...years) : undefined;
    studios.push({
      id: bucketRecord.id,
      name: bucketRecord.name,
      developedIds: [...bucketRecord.developed],
      publishedIds: [...bucketRecord.published],
      gameIds: studioGames.map((game) => game.id),
      yearStart,
      yearEnd,
      notableTitles,
      backgroundUrl,
      ...(bucketRecord.logo ? { logo: bucketRecord.logo } : {}),
      summary: describeStudio({
        name: bucketRecord.name,
        developedCount: bucketRecord.developed.size,
        publishedCount: bucketRecord.published.size,
        yearStart,
        yearEnd,
        notableTitles,
      }),
    });
  }

  return studios.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

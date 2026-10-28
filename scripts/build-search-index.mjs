import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./load-ts-module.mjs";

const { gameMatchesGenre } = loadTsModule("src/data/browse.ts");
const { collectDownloadableIds } = loadTsModule("src/data/downloadable.ts");
const { toReleaseDateRecord } = loadTsModule("src/data/release-calendar.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = path.join(root, "public", "catalog", "games-index.json");
const outputPath = path.join(root, "public", "catalog", "search-index.json");
const browsePath = path.join(root, "public", "catalog", "browse-index.json");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const index = catalogue.games
  .map((game) => {
    const terms = new Set([
      game.id,
      game.slug,
      game.title,
      game.summary ?? "",
      game.description ?? "",
      ...(game.genres ?? []),
      ...(game.themes ?? []),
      ...(game.keywords ?? []),
      ...(game.gameModes ?? []),
      ...(game.platforms ?? []),
      ...(game.developers ?? []).map((company) => company.name),
      ...(game.publishers ?? []).map((company) => company.name),
      ...(game.franchises ?? []),
      ...(game.collections ?? []),
    ].flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)));

    return {
      id: game.id,
      title: game.title,
      terms: Array.from(terms).join(" "),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: 1, games: index }, null, 2)}\n`);
console.log(`Built search index for ${index.length} games.`);

function coverUrl(url) {
  if (!url || !url.includes("images.igdb.com/igdb/image/upload/")) return url;
  return url.replace(/\/t_[^/]+\//, "/t_cover_big/");
}

const downloadableIds = collectDownloadableIds(catalogue.games);
const browseGames = catalogue.games.map((game) => {
  const sourceIds = [];
  const seenSources = new Set();
  for (const source of game.source ?? []) {
    if (!source?.id || source.id === game.id || seenSources.has(source.id)) continue;
    seenSources.add(source.id);
    sourceIds.push(source.id);
  }
  const record = {
    id: game.id,
    slug: game.slug,
    title: game.title,
    platforms: game.platforms,
  };
  const cover = coverUrl(game.cover?.url);
  if (cover) record.cover = cover;
  if (game.releaseYear != null) record.releaseYear = game.releaseYear;
  if (game.rating != null) record.rating = game.rating;
  if (game.genres?.length) record.genres = game.genres;
  if (game.themes?.length) record.themes = game.themes;
  if (game.platformVariants?.length) record.platformVariants = game.platformVariants;
  if (gameMatchesGenre(game, "multiplayer")) record.multiplayer = true;
  if (downloadableIds.has(game.id)) record.downloadable = true;
  if (sourceIds.length > 0) record.sourceIds = sourceIds;
  return record;
});
const browseBody = `${JSON.stringify({ schemaVersion: 1, games: browseGames })}\n`;
fs.writeFileSync(browsePath, browseBody);
console.log(`Built browse index for ${browseGames.length} games (${(Buffer.byteLength(browseBody) / 1e6).toFixed(2)} MB).`);

const releasePath = path.join(root, "public", "catalog", "release-dates.json");
const releaseDates = catalogue.games
  .map((game) => toReleaseDateRecord(game))
  .filter(Boolean)
  .sort((left, right) => left.id.localeCompare(right.id));
const releaseBody = `${JSON.stringify({ schemaVersion: 1, games: releaseDates })}\n`;
fs.writeFileSync(releasePath, releaseBody);
console.log(`Built release dates for ${releaseDates.length} games (${(Buffer.byteLength(releaseBody) / 1e6).toFixed(2)} MB).`);

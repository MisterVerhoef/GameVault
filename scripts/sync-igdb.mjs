import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadTsModule } from "./load-ts-module.mjs";

const {
  buildPopularCatalogQuery,
  buildRecentCatalogQuery,
  dedupeIgdbGamesLastWins,
  mergeIgdbGamesPreferPrimary,
  paginateIgdbQuery,
  resolveRecentSyncConfig,
  assertRecentSyncConfig,
} = loadTsModule("src/lib/igdb/catalog-sync-selection.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientId = process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.IGDB_CLIENT_SECRET;
const sourceVersion = process.env.IGDB_SOURCE_VERSION ?? new Date().toISOString().slice(0, 10);
const limit = Number.parseInt(process.env.IGDB_LIMIT ?? "500", 10);
const pages = Number.parseInt(process.env.IGDB_PAGES ?? "10", 10);
const minimumGames = Number.parseInt(process.env.IGDB_MIN_GAMES ?? "5", 10);
const searchTerms = (process.env.IGDB_SEARCH_TERMS ?? "halo,the witcher")
  .split(",")
  .map((term) => term.trim())
  .filter(Boolean);

if (!clientId || !clientSecret) {
  throw new Error("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required for an IGDB sync.");
}
if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
  throw new Error("IGDB_LIMIT must be an integer between 1 and 500.");
}
if (!Number.isInteger(pages) || pages < 1 || pages > 10) {
  throw new Error("IGDB_PAGES must be an integer between 1 and 10.");
}
if (!Number.isInteger(minimumGames) || minimumGames < 1) {
  throw new Error("IGDB_MIN_GAMES must be a positive integer.");
}

const recentSync = resolveRecentSyncConfig(process.env);
assertRecentSyncConfig(recentSync);

const defaultQuery = buildPopularCatalogQuery(limit);
const query = process.env.IGDB_QUERY ?? defaultQuery;
const recentQuery = buildRecentCatalogQuery({
  limit: recentSync.limit,
  pastMonths: recentSync.pastMonths,
  futureMonths: recentSync.futureMonths,
  sort: recentSync.sort,
});

async function requestToken() {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`IGDB OAuth token request failed with HTTP ${response.status}.`);
  }
  const body = await response.json();
  if (!body.access_token) throw new Error("IGDB OAuth response did not include an access token.");
  return body.access_token;
}

async function igdbQuery(token, endpoint, body) {
  return fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
}

function pause(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function attachBatched(games, token, endpoint, queryFor, apply) {
  const ids = games.map((game) => game.id).filter((id) => Number.isInteger(id));
  const byId = new Map(games.map((game) => [game.id, game]));
  const batchSize = 200;
  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const response = await igdbQuery(token, endpoint, queryFor(batch));
    if (!response.ok) {
      const detail = await response.text();
      console.warn(`IGDB ${endpoint} request failed with HTTP ${response.status}: ${detail.slice(0, 180)}. Continuing without the rest of that enrichment.`);
      return;
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) {
      console.warn(`IGDB ${endpoint} returned an unexpected payload. Continuing without the rest of that enrichment.`);
      return;
    }
    for (const row of rows) apply(byId, row);
    if (index + batchSize < ids.length) await pause(250);
  }
}

async function attachDetailFields(games, token) {
  await attachBatched(
    games,
    token,
    "games",
    (batch) => `fields id,keywords.name; where id = (${batch.join(",")}); limit ${batch.length};`,
    (byId, row) => {
      const game = byId.get(row?.id);
      if (game && Array.isArray(row.keywords)) game.keywords = row.keywords;
    },
  );
  await pause(250);
  await attachBatched(
    games,
    token,
    "game_time_to_beats",
    (batch) => `fields game_id,hastily,normally,completely,count; where game_id = (${batch.join(",")}); limit ${batch.length};`,
    (byId, row) => {
      const gameId = typeof row?.game_id === "number" ? row.game_id : row?.game_id?.id;
      const game = byId.get(gameId);
      if (game) game.game_time_to_beat = row;
    },
  );
}

async function requestGames(token) {
  const ratingAndSearch = [];
  const recentGames = [];
  async function requestPage(pageQuery, target) {
    const response = await igdbQuery(token, "games", pageQuery);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`IGDB games request failed with HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
    const pageGames = await response.json();
    if (!Array.isArray(pageGames)) throw new Error("IGDB returned an invalid games response.");
    target.push(...pageGames);
    return pageGames.length;
  }

  for (let page = 0; page < pages; page += 1) {
    const pageQuery = paginateIgdbQuery(query, limit, page * limit);
    const count = await requestPage(pageQuery, ratingAndSearch);
    if (count < limit) break;
  }
  for (const term of searchTerms) {
    const searchQuery = defaultQuery
      .replace(/\blimit\s+\d+\s*;/i, `search "${term.replace(/"/g, '\\"')}"; limit 100;`)
      .replace(/sort rating desc;\s*$/i, "");
    await requestPage(searchQuery, ratingAndSearch);
  }
  if (recentSync.pages > 0) {
    for (let page = 0; page < recentSync.pages; page += 1) {
      const pageQuery = paginateIgdbQuery(recentQuery, recentSync.limit, page * recentSync.limit);
      const count = await requestPage(pageQuery, recentGames);
      if (count < recentSync.limit) break;
    }
  }
  if (!Array.isArray(ratingAndSearch) || ratingAndSearch.length === 0) {
    throw new Error("IGDB returned no games; refusing to replace the checked-in catalogue.");
  }
  const ratingCatalogue = dedupeIgdbGamesLastWins(ratingAndSearch);
  const unique = mergeIgdbGamesPreferPrimary(ratingCatalogue, dedupeIgdbGamesLastWins(recentGames));
  if (recentSync.pages > 0 && recentGames.length > 0) {
    const added = unique.length - ratingCatalogue.length;
    console.log(
      `IGDB recent-release pass contributed ${added} game(s) (${recentSync.pastMonths}mo lookback, ${recentSync.futureMonths}mo ahead, ${recentSync.pages} page(s)).`,
    );
  }
  await attachDetailFields(unique, token);
  return unique;
}

const temporaryInput = path.join(os.tmpdir(), `gamevault-igdb-${process.pid}.json`);
const temporaryOutput = path.join(os.tmpdir(), `gamevault-catalogue-${process.pid}.json`);
const temporaryReport = path.join(os.tmpdir(), `gamevault-quality-${process.pid}.json`);
try {
  const games = await requestGames(await requestToken());
  fs.writeFileSync(temporaryInput, `${JSON.stringify(games)}\n`);
  const result = spawnSync(process.execPath, [
    "scripts/import-catalogue.mjs",
    "--input",
    temporaryInput,
    "--provider",
    "igdb",
    "--source-version",
    sourceVersion,
    "--output",
    temporaryOutput,
    "--report",
    temporaryReport,
  ], { cwd: root, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Catalogue import exited with status ${result.status ?? "unknown"}.`);
  }
  const imported = JSON.parse(fs.readFileSync(temporaryOutput, "utf8"));
  if (!Array.isArray(imported.games) || imported.games.length < minimumGames) {
    throw new Error(`IGDB sync produced ${imported.games?.length ?? 0} games; refusing to publish fewer than ${minimumGames}.`);
  }
  fs.copyFileSync(temporaryOutput, path.join(root, "public", "catalog", "games-index.json"));
  const indexBuilder = spawnSync(process.execPath, ["scripts/build-search-index.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (indexBuilder.status !== 0) {
    throw new Error(`Search index generation exited with status ${indexBuilder.status ?? "unknown"}.`);
  }
  if (process.env.STORE_ENRICHMENT !== "0") {
    const enrichment = spawnSync(process.execPath, ["scripts/enrich-stores.mjs"], {
      cwd: root,
      encoding: "utf8",
      stdio: "inherit",
      env: process.env,
    });
    if (enrichment.status !== 0) {
      console.warn(`Store enrichment exited with status ${enrichment.status ?? "unknown"}. The IGDB catalogue was still published.`);
    }
  }
} finally {
  fs.rmSync(temporaryInput, { force: true });
  fs.rmSync(temporaryOutput, { force: true });
  fs.rmSync(temporaryReport, { force: true });
}

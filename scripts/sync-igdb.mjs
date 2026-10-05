import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientId = process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.IGDB_CLIENT_SECRET;
const sourceVersion = process.env.IGDB_SOURCE_VERSION ?? new Date().toISOString().slice(0, 10);
const limit = Number.parseInt(process.env.IGDB_LIMIT ?? "500", 10);
const pages = Number.parseInt(process.env.IGDB_PAGES ?? "5", 10);
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

const defaultQuery = [
  "fields id,name,slug,summary,storyline,first_release_date,rating,rating_count,",
  "genres.name,themes.name,platforms.name,cover.url,artworks.url,",
  "screenshots.url,screenshots.width,screenshots.height,",
  "videos.id,videos.name,videos.video_id,websites.url,websites.category,",
  "involved_companies.developer,involved_companies.publisher,involved_companies.company.id,involved_companies.company.name,",
  "dlcs.id,dlcs.name,expansions.id,expansions.name,",
  "remakes.id,remakes.name,remasters.id,remasters.name,similar_games.id,similar_games.name,",
  "franchises.name,collections.name;",
  `limit ${limit};`,
  "where platforms != null;",
  "sort rating desc;",
].join(" ");
const query = process.env.IGDB_QUERY ?? defaultQuery;

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

async function requestGames(token) {
  const games = [];
  async function requestPage(pageQuery) {
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: pageQuery,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`IGDB games request failed with HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
    const pageGames = await response.json();
    if (!Array.isArray(pageGames)) throw new Error("IGDB returned an invalid games response.");
    games.push(...pageGames);
    return pageGames.length;
  }

  for (let page = 0; page < pages; page += 1) {
    const pageQuery = query.replace(/\blimit\s+\d+\s*;/i, `limit ${limit}; offset ${page * limit};`);
    const count = await requestPage(pageQuery);
    if (count < limit) break;
  }
  for (const term of searchTerms) {
    const searchQuery = defaultQuery
      .replace(/\blimit\s+\d+\s*;/i, `search "${term.replace(/"/g, '\\"')}"; limit 100;`)
      .replace(/sort rating desc;\s*$/i, "");
    await requestPage(searchQuery);
  }
  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("IGDB returned no games; refusing to replace the checked-in catalogue.");
  }
  return Array.from(new Map(games.map((game) => [game.id, game])).values());
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
} finally {
  fs.rmSync(temporaryInput, { force: true });
  fs.rmSync(temporaryOutput, { force: true });
  fs.rmSync(temporaryReport, { force: true });
}

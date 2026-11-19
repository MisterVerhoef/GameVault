import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gamesIndexPath } from "./catalogue-paths.mjs";
import { loadTsModule } from "./load-ts-module.mjs";

const {
  normalizeXboxBigId,
  productSupportsXboxPlayAnywhere,
  resolvePlayAnywhereForGame,
  xboxBigIdsFromGame,
} = loadTsModule("src/data/play-anywhere.ts");
const { gameMatchesPlatformVariant } = loadTsModule("src/data/platforms.ts");
const { storeIdsFromIgdb } = loadTsModule("src/data/store-match.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = gamesIndexPath(root);
const outputPath = path.join(root, "public", "catalog", "play-anywhere.json");
const today = new Date().toISOString().slice(0, 10);

const clientId = process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.IGDB_CLIENT_SECRET;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "GameVault catalogue enrichment (+https://github.com/MisterVerhoef/GameVault)" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function loadMicrosoftProducts(ids) {
  const products = new Map();
  for (let offset = 0; offset < ids.length; offset += 20) {
    const chunk = ids.slice(offset, offset + 20);
    const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${encodeURIComponent(chunk.join(","))}&market=NL&languages=nl-NL&MS-CV=GameVault1`;
    const payload = await fetchJson(url);
    for (const product of payload.Products ?? []) {
      const id = normalizeXboxBigId(String(product.ProductId ?? product.BigId ?? ""));
      if (!id) continue;
      products.set(id, productSupportsXboxPlayAnywhere(product));
    }
    console.log(`Microsoft Store products ${Math.min(offset + chunk.length, ids.length)}/${ids.length}`);
  }
  return products;
}

async function requestIgdbToken() {
  if (!clientId || !clientSecret) return null;
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    { method: "POST", signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) return null;
  const body = await response.json();
  return body.access_token ?? null;
}

async function igdbGamesByIds(token, ids) {
  const byId = new Map();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = ids.slice(offset, offset + 200);
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `fields id,external_games.uid,external_games.external_game_source,external_games.category,websites.url; where id = (${batch.join(",")});`,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.warn(`IGDB games request failed: HTTP ${response.status} ${detail.slice(0, 160)}`);
      return byId;
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) return byId;
    for (const row of rows) {
      if (row?.id != null) byId.set(String(row.id), row);
    }
    console.log(`IGDB store ids ${Math.min(offset + batch.length, ids.length)}/${ids.length}`);
  }
  return byId;
}

function gameWithIgdbStoreIds(game, igdbRow) {
  if (!igdbRow) return game;
  const fromIgdb = storeIdsFromIgdb(igdbRow.external_games);
  const websites = (igdbRow.websites ?? [])
    .filter((entry) => typeof entry?.url === "string")
    .map((entry) => ({ url: entry.url }));
  return {
    ...game,
    externalIds: [...(game.externalIds ?? []), ...fromIgdb],
    websites: [...(game.websites ?? []), ...websites],
  };
}

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const games = Array.isArray(catalogue.games) ? catalogue.games : [];
const previous = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : { schemaVersion: 1, region: "NL", games: {} };
const previousGames = previous.games ?? {};

const seriesGames = games.filter(
  (game) => gameMatchesPlatformVariant({ platformVariants: game.platformVariants ?? [] }, "Xbox Series"),
);

const needsIgdbIds = seriesGames.filter((game) => xboxBigIdsFromGame(game).length === 0);
let igdbRows = new Map();
const token = await requestIgdbToken();
if (token && needsIgdbIds.length > 0) {
  igdbRows = await igdbGamesByIds(token, needsIgdbIds.map((game) => Number.parseInt(game.id, 10)).filter(Number.isInteger));
} else if (needsIgdbIds.length > 0) {
  console.warn(`Skipping IGDB store id lookup for ${needsIgdbIds.length} Xbox Series title(s); IGDB credentials are not configured.`);
}

const enrichedGames = seriesGames.map((game) => gameWithIgdbStoreIds(game, igdbRows.get(game.id)));
const withStoreId = enrichedGames.filter((game) => xboxBigIdsFromGame(game).length > 0);
const allIds = [...new Set(withStoreId.flatMap((game) => xboxBigIdsFromGame(game)))];

let productMap = new Map();
try {
  productMap = await loadMicrosoftProducts(allIds);
} catch (error) {
  console.warn(`Warning: Microsoft Store lookup failed; retaining previous Play Anywhere entries where possible: ${error instanceof Error ? error.message : String(error)}`);
}

const gamesOutput = {};
let xpaSupported = 0;
let xpaUnsupported = 0;
let retained = 0;
let resolvedViaIgdb = 0;

for (const game of enrichedGames) {
  const resolved = productMap.size > 0
    ? resolvePlayAnywhereForGame(game, productMap)
    : undefined;
  if (resolved) {
    const entry = { ...resolved, checkedAt: today };
    gamesOutput[game.id] = entry;
    if (entry.playAnywhere) xpaSupported += 1;
    else xpaUnsupported += 1;
    if (needsIgdbIds.some((candidate) => candidate.id === game.id) && xboxBigIdsFromGame(game).length > 0) {
      resolvedViaIgdb += 1;
    }
    continue;
  }
  const prior = previousGames[game.id];
  if (prior) {
    gamesOutput[game.id] = prior;
    retained += 1;
    if (prior.playAnywhere) xpaSupported += 1;
    else xpaUnsupported += 1;
  }
}

const ordered = Object.fromEntries(Object.keys(gamesOutput).sort().map((id) => [id, gamesOutput[id]]));
const document = {
  schemaVersion: 1,
  region: "NL",
  generatedAt: new Date().toISOString(),
  games: ordered,
};
const temporary = `${outputPath}.tmp`;
fs.writeFileSync(temporary, `${JSON.stringify(document)}\n`);
fs.renameSync(temporary, outputPath);

console.log(JSON.stringify({
  xboxSeriesTitles: seriesGames.length,
  xboxSeriesWithStoreIdBeforeIgdb: seriesGames.length - needsIgdbIds.length,
  xboxSeriesStoreIdsAfterIgdb: withStoreId.length,
  igdbStoreIdLookups: needsIgdbIds.length,
  igdbStoreIdsResolved: resolvedViaIgdb,
  microsoftProductsFetched: productMap.size,
  gamesWithPlayAnywhereStatus: Object.keys(ordered).length,
  playAnywhereSupported: xpaSupported,
  playAnywhereUnsupported: xpaUnsupported,
  retainedFromPrevious: retained,
  bytes: fs.statSync(outputPath).size,
}, null, 2));
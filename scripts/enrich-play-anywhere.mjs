import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gamesIndexPath } from "./catalogue-paths.mjs";
import { loadTsModule } from "./load-ts-module.mjs";

const {
  normalizeXboxBigId,
  productSupportsXboxPlayAnywhere,
  resolvePlayAnywhereForGame,
  xboxExternalIds,
} = loadTsModule("src/data/play-anywhere.ts");
const { gameMatchesPlatformVariant } = loadTsModule("src/data/platforms.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = gamesIndexPath(root);
const outputPath = path.join(root, "public", "catalog", "play-anywhere.json");
const today = new Date().toISOString().slice(0, 10);

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

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const games = Array.isArray(catalogue.games) ? catalogue.games : [];
const previous = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : { schemaVersion: 1, region: "NL", games: {} };
const previousGames = previous.games ?? {};

const seriesGames = games.filter(
  (game) => gameMatchesPlatformVariant({ platformVariants: game.platformVariants ?? [] }, "Xbox Series")
    && xboxExternalIds(game).length > 0,
);
const allIds = [...new Set(seriesGames.flatMap((game) => xboxExternalIds(game)))];

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

for (const game of seriesGames) {
  const resolved = productMap.size > 0
    ? resolvePlayAnywhereForGame(game, productMap)
    : undefined;
  if (resolved) {
    const entry = { ...resolved, checkedAt: today };
    gamesOutput[game.id] = entry;
    if (entry.playAnywhere) xpaSupported += 1;
    else xpaUnsupported += 1;
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
  xboxSeriesWithStoreId: seriesGames.length,
  microsoftProductsFetched: productMap.size,
  gamesWithPlayAnywhereStatus: Object.keys(ordered).length,
  playAnywhereSupported: xpaSupported,
  playAnywhereUnsupported: xpaUnsupported,
  retainedFromPrevious: retained,
  bytes: fs.statSync(outputPath).size,
}, null, 2));
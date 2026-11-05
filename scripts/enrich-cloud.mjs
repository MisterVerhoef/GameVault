import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./load-ts-module.mjs";

const {
  matchCloudTitle,
  normalizeCloudTitle,
  parsePlayStationConceptId,
  parseSteamAppId,
} = loadTsModule("src/data/cloud-streaming.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = path.join(root, "public", "catalog", "games-index.json");
const outputPath = path.join(root, "public", "catalog", "cloud-streaming.json");
const today = new Date().toISOString().slice(0, 10);
const xboxUrl = "https://www.xbox.com/play";
const boosteroidUrl = "https://boosteroid.com/";
const psPlusUrl = "https://www.playstation.com/nl-nl/ps-plus/";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "GameVault catalogue enrichment (+https://github.com/MisterVerhoef/GameVault)" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, output);
  else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

function xboxIdsFromSigl(payload) {
  const ids = collectStrings(payload)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[0-9A-Z]{12}$/.test(value));
  return new Set(ids);
}

function portalRecords(payload, output = []) {
  if (Array.isArray(payload)) {
    for (const item of payload) portalRecords(item, output);
    return output;
  }
  if (!payload || typeof payload !== "object") return output;
  const record = payload;
  const title = record.title ?? record.name ?? record.gameTitle ?? record.productName ?? record.Title;
  if (typeof title === "string" && title.trim()) {
    const yearValue = record.releaseYear ?? record.release_year ?? record.year ?? record.releaseDate ?? record.release_date;
    const parsedYear = typeof yearValue === "number"
      ? yearValue
      : typeof yearValue === "string" ? Number.parseInt(yearValue.slice(0, 4), 10) : NaN;
    const idValue = record.conceptId ?? record.concept_id ?? record.psStoreId ?? record.ps_store_id;
    const id = idValue == null ? undefined : String(idValue).trim();
    output.push({
      id: id && /^\d+$/.test(id) ? id : undefined,
      title: title.trim(),
      ...(Number.isInteger(parsedYear) && parsedYear >= 1970 && parsedYear <= 2100 ? { year: parsedYear } : {}),
    });
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") portalRecords(value, output);
  }
  return output;
}

function steamIds(game) {
  const ids = new Set();
  for (const site of game.websites ?? []) {
    const id = parseSteamAppId(site.url);
    if (id) ids.add(id);
  }
  return ids;
}

function playStationIds(game) {
  const ids = new Set();
  for (const entry of game.externalIds ?? []) {
    if (entry.store === "playstation") {
      const id = String(entry.id).replace(/^(concept:|product:)/, "");
      if (/^\d+$/.test(id)) ids.add(id);
    }
  }
  for (const site of game.websites ?? []) {
    const id = parsePlayStationConceptId(site.url);
    if (id) ids.add(id);
  }
  return ids;
}

function xboxIds(game) {
  return new Set((game.externalIds ?? [])
    .filter((entry) => entry.store === "xbox")
    .map((entry) => String(entry.id).toUpperCase()));
}

function service(id, name, match, url, details = {}) {
  return {
    id,
    name,
    ...details,
    url,
    match,
    checkedAt: today,
  };
}

async function loadXboxCloudIds() {
  const url = "https://catalog.gamepass.com/sigls/v2?id=29a81209-df6f-41fd-a528-2ae6b91f719c&market=NL&language=nl-NL";
  const ids = xboxIdsFromSigl(await fetchJson(url));
  if (ids.size === 0) throw new Error("The Xbox Cloud Gaming SIGL feed contained no product ids.");
  return ids;
}

async function loadBoosteroidSteamIds() {
  const urls = [
    "https://store.steampowered.com/curator/45507051/ajaxgetfilteredrecommendations/?query=&start=0&count=1000&tagid=0",
    "https://store.steampowered.com/curator/45507051/",
  ];
  let lastError;
  for (const url of urls) {
    try {
      const body = await fetchText(url);
      const ids = new Set();
      for (const match of body.matchAll(/(?:data-ds-appid|data-appid|\/app\/)(?:\s*=\s*["']?)?(\d{2,10})/g)) ids.add(match[1]);
      for (const match of body.matchAll(/"appid"\s*:\s*(\d{2,10})/g)) ids.add(match[1]);
      if (ids.size > 0) return ids;
      lastError = new Error("The Boosteroid Steam curator page contained no Steam app ids.");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Unable to load the Boosteroid Steam curator list.");
}

async function loadPlayStationPlusGames() {
  const payload = await fetchJson("https://portaldb.dev/games.json");
  const records = portalRecords(payload);
  const deduped = new Map();
  for (const record of records) {
    const key = `${record.id ?? ""}:${normalizeCloudTitle(record.title)}:${record.year ?? ""}`;
    if (!deduped.has(key)) deduped.set(key, record);
  }
  const candidates = [...deduped.values()];
  if (candidates.length === 0) throw new Error("The PortalDB feed contained no recognizable game records.");
  return candidates;
}

async function loadXboxProductDetails(ids) {
  const details = new Map();
  for (let offset = 0; offset < ids.length; offset += 20) {
    const chunk = ids.slice(offset, offset + 20);
    const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${encodeURIComponent(chunk.join(","))}&market=NL&languages=nl-NL&MS-CV=GameVault1`;
    const payload = await fetchJson(url);
    for (const product of payload.Products ?? []) {
      const id = String(product.ProductId ?? product.BigId ?? "").toUpperCase();
      if (!id) continue;
      const localized = product.LocalizedProperties?.[0] ?? {};
      details.set(id, {
        title: localized.ProductTitle,
        url: product.MarketProperties?.[0]?.Link,
      });
    }
  }
  return details;
}

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const games = Array.isArray(catalogue.games) ? catalogue.games : [];
const previous = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : { schemaVersion: 1, region: "NL", games: {} };
const previousGames = previous.games ?? {};
const feeds = {
  xbox: { ok: false, value: null },
  boosteroid: { ok: false, value: null },
  psPlus: { ok: false, value: null },
};

for (const [key, loader] of [
  ["xbox", loadXboxCloudIds],
  ["boosteroid", loadBoosteroidSteamIds],
  ["psPlus", loadPlayStationPlusGames],
]) {
  try {
    feeds[key].value = await loader();
    feeds[key].ok = true;
    console.log(`${key}: loaded ${feeds[key].value.size ?? feeds[key].value.length} source records`);
  } catch (error) {
    console.warn(`Warning: ${key} feed failed; retaining its previous matches: ${error instanceof Error ? error.message : String(error)}`);
  }
}

let xboxDetails = new Map();
if (feeds.xbox.ok) {
  try {
    xboxDetails = await loadXboxProductDetails([...feeds.xbox.value]);
    console.log(`xbox: loaded ${xboxDetails.size} product detail records`);
  } catch (error) {
    console.warn(`Warning: Xbox product details unavailable; using the generic Xbox Cloud Gaming link: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const gamesOutput = {};
const counts = {
  "xbox-cloud": { matched: 0, "external-id": 0, "exact-title": 0 },
  boosteroid: { matched: 0, "external-id": 0, "exact-title": 0 },
  "ps-plus": { matched: 0, "external-id": 0, "exact-title": 0 },
};

function retainPrevious(gameId, serviceId, target) {
  const prior = previousGames[gameId]?.services?.find((item) => item.id === serviceId);
  if (prior) target.push(prior);
}

for (const game of games) {
  const services = [];
  const previousServices = previousGames[game.id]?.services ?? [];

  if (feeds.xbox.ok) {
    const id = [...xboxIds(game)].find((value) => feeds.xbox.value.has(value));
    if (id) {
      const detail = xboxDetails.get(id);
      const targetUrl = typeof detail?.url === "string" && detail.url.startsWith("https://") ? detail.url : xboxUrl;
      services.push(service(
        "xbox-cloud",
        "Xbox Cloud Gaming",
        "external-id",
        targetUrl,
        { tier: "Game Pass Ultimate", requiresOwnership: false, storeRequirement: "Game Pass Ultimate; ownership may apply to eligible stream-your-own-game titles" },
      ));
    }
  } else retainPrevious(game.id, "xbox-cloud", services);

  if (feeds.boosteroid.ok) {
    const id = [...steamIds(game)].find((value) => feeds.boosteroid.value.has(value));
    if (id) {
      services.push(service(
        "boosteroid",
        "Boosteroid",
        "external-id",
        boosteroidUrl,
        { tier: "Boosteroid subscription", requiresOwnership: true, storeRequirement: "Boosteroid subscription and ownership of the game on a supported store" },
      ));
    }
  } else retainPrevious(game.id, "boosteroid", services);

  if (feeds.psPlus.ok) {
    const ids = playStationIds(game);
    let matched = feeds.psPlus.value.find((candidate) => candidate.id && ids.has(candidate.id));
    let match = "external-id";
    if (!matched) {
      matched = matchCloudTitle({ title: game.title, releaseYear: game.releaseYear }, feeds.psPlus.value);
      match = "exact-title";
    }
    if (matched) {
      services.push(service(
        "ps-plus",
        "PlayStation Plus cloud streaming",
        match,
        psPlusUrl,
        { tier: "PlayStation Plus Premium", requiresOwnership: false, storeRequirement: "PlayStation Plus Premium subscription; availability varies by title and region" },
      ));
    }
  } else retainPrevious(game.id, "ps-plus", services);

  const unique = [...new Map(services.map((entry) => [entry.id, entry])).values()];
  if (unique.length > 0) {
    gamesOutput[game.id] = { services: unique };
    for (const entry of unique) {
      counts[entry.id].matched += 1;
      counts[entry.id][entry.match] += 1;
    }
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
  coverage: counts,
  gamesWithCloudStreaming: Object.keys(ordered).length,
  failedFeeds: Object.entries(feeds).filter(([, feed]) => !feed.ok).map(([name]) => name),
  bytes: fs.statSync(outputPath).size,
}, null, 2));

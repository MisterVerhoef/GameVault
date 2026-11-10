import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./load-ts-module.mjs";
import { createCircuit, createLimiter, isMiss } from "./stores/http.mjs";
import {
  lookupEpic,
  lookupGog,
  lookupMicrosoft,
  lookupNintendo,
  lookupPlayStationConcept,
  lookupPlayStationProduct,
  lookupSteam,
  searchEpic,
  searchGog,
  searchMicrosoft,
  searchNintendo,
  searchPlayStation,
  searchSteam,
} from "./stores/clients.mjs";

const {
  ageInDays,
  chooseCandidate,
  identitiesFromGame,
  isEpicPageSlug,
  matchesStoreIdOnly,
  mergeStoreOffers,
  preferIdentity,
  reconcileFills,
  steamAppIds,
  storePlatform,
} = loadTsModule("src/data/store-match.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = path.join(root, "public", "catalog", "games-index.json");
const offersPath = path.join(root, "public", "catalog", "store-offers.json");
const stores = ["xbox", "playstation", "nintendo", "steam", "epic", "gog"];
const platformFor = {
  xbox: "Xbox",
  playstation: "PS5",
  nintendo: "Switch",
  steam: "PC",
  epic: "PC",
  gog: "PC",
};
const onlyIds = new Set(
  (process.env.STORE_GAME_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
);
const maxSearches = Number.parseInt(process.env.STORE_MAX_SEARCHES ?? "800", 10);
const maxAge = Number.parseInt(process.env.STORE_PRICE_MAX_AGE_DAYS ?? "6", 10);
const intervalMs = Number.parseInt(process.env.STORE_REQUEST_INTERVAL_MS ?? "150", 10);
const steamIntervalMs = Number.parseInt(process.env.STORE_STEAM_INTERVAL_MS ?? "350", 10);
const refresh = process.env.STORE_REFRESH === "1";
const retryMisses = process.env.STORE_RETRY_MISSES === "1";
const today = new Date().toISOString().slice(0, 10);

function nonNegativeInteger(name, value) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
}

nonNegativeInteger("STORE_MAX_SEARCHES", maxSearches);
nonNegativeInteger("STORE_PRICE_MAX_AGE_DAYS", maxAge);
nonNegativeInteger("STORE_REQUEST_INTERVAL_MS", intervalMs);
nonNegativeInteger("STORE_STEAM_INTERVAL_MS", steamIntervalMs);

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const games = Array.isArray(catalogue.games) ? catalogue.games : [];
const previous = fs.existsSync(offersPath) ? JSON.parse(fs.readFileSync(offersPath, "utf8")) : { games: {} };
const previousGames = previous.games ?? {};
const limiters = Object.fromEntries(stores.map((store) => [
  store,
  createLimiter(store === "steam" ? steamIntervalMs : intervalMs),
]));
const circuits = {
  xbox: createCircuit("Microsoft Store"),
  playstation: createCircuit("PlayStation Store"),
  nintendo: createCircuit("Nintendo eShop"),
  steam: createCircuit("Steam"),
  epic: createCircuit("Epic Games Store"),
  gog: createCircuit("GOG"),
};
const attempts = new Map();
const freshMedia = new Map();

function rememberMedia(gameId, media) {
  if (!media) return;
  const list = freshMedia.get(gameId) ?? [];
  list.push(media);
  freshMedia.set(gameId, list);
}

function setAttempt(gameId, store, attempt) {
  const current = attempts.get(gameId) ?? {};
  current[store] = attempt;
  attempts.set(gameId, current);
}

function mediaFor(store, candidate, score) {
  if (!candidate) return undefined;
  return {
    store,
    score,
    description: candidate.description || undefined,
    cover: candidate.cover || undefined,
    screenshots: candidate.screenshots ?? [],
    trailer: candidate.trailer || undefined,
  };
}

function offerFor(store, candidate, match, score) {
  if (!candidate?.title || !candidate.url) return undefined;
  const priced = candidate.currency === "EUR";
  return {
    store,
    platform: storePlatform(store),
    productId: String(candidate.id),
    url: candidate.url,
    title: candidate.title,
    price: priced ? candidate.price : null,
    regularPrice: priced ? candidate.regularPrice : null,
    currency: "EUR",
    match,
    score,
    checkedAt: today,
  };
}

function included(game) {
  return onlyIds.size === 0 || onlyIds.has(String(game.id));
}

function stale(game, store) {
  if (!included(game)) return false;
  if (!game.platforms.includes(platformFor[store])) return false;
  const entry = previousGames[game.id];
  const offer = entry?.offers?.find((item) => item.store === store);
  const miss = entry?.misses?.[store];
  if (!refresh && miss && ageInDays(miss, today) <= maxAge) {
    const retryOlder = retryMisses && matchesStoreIdOnly(store) && miss < today;
    if (!retryOlder) return false;
  }
  if (!offer || refresh || ageInDays(offer.checkedAt, today) > maxAge) return true;
  const fills = entry?.fills;
  if (!game.cover?.url && !fills?.cover) return true;
  if (!game.description && !fills?.description) return true;
  if ((game.screenshots ?? []).length === 0 && !(fills?.screenshots?.length)) return true;
  return false;
}

function needsMedia(game) {
  return !game.cover?.url || !game.description || (game.screenshots ?? []).length === 0;
}

function playstationIdentity(id) {
  if (id.startsWith("concept:")) return { kind: "concept", id: id.slice("concept:".length) };
  if (id.startsWith("product:")) return { kind: "product", id: id.slice("product:".length) };
  if (/^\d+$/.test(id)) return { kind: "concept", id };
  return { kind: "product", id };
}

async function guard(store, fn) {
  if (circuits[store].open) {
    const error = new Error(circuits[store].reason || `${store} lookup paused`);
    error.status = 503;
    throw error;
  }
  try {
    const result = await fn();
    circuits[store].success();
    return result;
  } catch (error) {
    if (!isMiss(error)) {
      if (error.status === 429) limiters[store].slow();
      else circuits[store].fail(error);
    }
    throw error;
  }
}

function accept(game, store, candidate, match, score) {
  const titled = candidate?.title ? candidate : { ...candidate, title: game.title };
  const offer = offerFor(store, titled, match, score);
  if (!offer) {
    setAttempt(game.id, store, { status: "miss" });
    return;
  }
  setAttempt(game.id, store, { status: "matched", offer });
  rememberMedia(game.id, mediaFor(store, candidate, score));
}

async function lookupIdentity(game, store, identity) {
  try {
    if (store === "xbox") {
      const found = await guard(store, () => lookupMicrosoft([identity.id], limiters.xbox));
      const product = found.get(identity.id.toUpperCase());
      if (!product) setAttempt(game.id, store, { status: "miss" });
      else accept(game, store, product, "external-id", 1);
      return;
    }
    if (store === "playstation") {
      const parsed = playstationIdentity(identity.id);
      const product = parsed.kind === "concept"
        ? await guard(store, () => lookupPlayStationConcept(parsed.id, limiters.playstation, { media: needsMedia(game) }))
        : await guard(store, () => lookupPlayStationProduct(parsed.id, limiters.playstation));
      if (!product) setAttempt(game.id, store, { status: "miss" });
      else accept(game, store, product, "external-id", 1);
      return;
    }
    if (store === "steam") {
      const ids = [...new Set(
        identitiesFromGame(game)
          .filter((item) => item.store === "steam")
          .flatMap((item) => steamAppIds(item.id)),
      )];
      if (ids.length === 0) {
        setAttempt(game.id, store, { status: "miss" });
        return;
      }
      let fallback;
      for (const id of ids) {
        const product = await guard(store, () => lookupSteam(id, limiters.steam));
        if (!product?.title) continue;
        if (product.kind !== "other" || ids.length === 1) {
          accept(game, store, product, "external-id", 1);
          return;
        }
        fallback ??= product;
      }
      if (fallback) accept(game, store, fallback, "external-id", 1);
      else setAttempt(game.id, store, { status: "miss" });
      return;
    }
    if (store === "epic") {
      if (!isEpicPageSlug(identity.id)) {
        setAttempt(game.id, store, { status: "miss" });
        return;
      }
      const product = await guard(store, () => lookupEpic(identity.id, limiters.epic));
      if (!product?.title || product.kind === "other") setAttempt(game.id, store, { status: "miss" });
      else accept(game, store, product, "external-id", 1);
      return;
    }
    if (store === "gog") {
      const product = await guard(store, () => lookupGog(identity.id, limiters.gog));
      if (!product?.title) setAttempt(game.id, store, { status: "miss" });
      else accept(game, store, product, "external-id", 1);
      return;
    }
    const product = await guard(store, () => lookupNintendo(identity.id, limiters.nintendo));
    if (!product) setAttempt(game.id, store, { status: "miss" });
    else accept(game, store, product, "external-id", 1);
  } catch (error) {
    if (isMiss(error)) setAttempt(game.id, store, { status: "miss" });
    else setAttempt(game.id, store, { status: "failed" });
  }
}

async function searchIdentity(game, store) {
  const query = { title: game.title, year: game.releaseYear };
  try {
    if (store === "xbox") {
      const candidates = await guard(store, () => searchMicrosoft(game.title, limiters.xbox));
      const chosen = chooseCandidate(query, candidates);
      if (!chosen) {
        setAttempt(game.id, store, { status: "miss" });
        return;
      }
      const found = await guard(store, () => lookupMicrosoft([chosen.candidate.id], limiters.xbox));
      const product = found.get(chosen.candidate.id);
      if (!product) setAttempt(game.id, store, { status: "miss" });
      else accept(game, store, product, chosen.match, chosen.score);
      return;
    }
    if (store === "steam") {
      const candidates = await guard(store, () => searchSteam(game.title, limiters.steam));
      const chosen = chooseCandidate(query, candidates);
      if (!chosen) {
        setAttempt(game.id, store, { status: "miss" });
        return;
      }
      const product = await guard(store, () => lookupSteam(chosen.candidate.id, limiters.steam));
      const confirmed = product && product.kind !== "other" ? chooseCandidate(query, [product]) : undefined;
      if (!product || !confirmed) setAttempt(game.id, store, { status: "miss" });
      else accept(game, store, product, confirmed.match, confirmed.score);
      return;
    }
    const candidates = store === "playstation"
      ? await guard(store, () => searchPlayStation(game.title, limiters.playstation))
      : store === "epic"
        ? await guard(store, () => searchEpic(game.title, limiters.epic))
        : store === "gog"
          ? await guard(store, () => searchGog(game.title, limiters.gog))
          : await guard(store, () => searchNintendo(game.title, limiters.nintendo));
    const chosen = chooseCandidate(query, candidates);
    if (!chosen) setAttempt(game.id, store, { status: "miss" });
    else accept(game, store, chosen.candidate, chosen.match, chosen.score);
  } catch (error) {
    if (isMiss(error)) setAttempt(game.id, store, { status: "miss" });
    else setAttempt(game.id, store, { status: "failed" });
  }
}

async function mapPool(items, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, () => run()));
}

const idJobs = [];
for (const game of games) {
  const identities = identitiesFromGame(game);
  for (const store of stores) {
    if (!stale(game, store)) continue;
    const identity = preferIdentity(identities, store);
    if (identity) idJobs.push({ game, store, identity });
  }
}

const xboxJobs = idJobs.filter((job) => job.store === "xbox");
for (let offset = 0; offset < xboxJobs.length; offset += 20) {
  const chunk = xboxJobs.slice(offset, offset + 20);
  try {
    const found = await guard("xbox", () => lookupMicrosoft(chunk.map((job) => job.identity.id), limiters.xbox));
    for (const job of chunk) {
      const product = found.get(job.identity.id.toUpperCase());
      if (!product) setAttempt(job.game.id, "xbox", { status: "miss" });
      else accept(job.game, "xbox", product, "external-id", 1);
    }
  } catch (error) {
    const status = isMiss(error) ? "miss" : "failed";
    for (const job of chunk) setAttempt(job.game.id, "xbox", { status });
  }
  if ((offset + chunk.length) % 200 < 20) {
    console.log(`Microsoft id lookups ${Math.min(offset + chunk.length, xboxJobs.length)}/${xboxJobs.length}`);
  }
}

const otherIdJobs = idJobs.filter((job) => job.store !== "xbox");
const idOnlyJobs = otherIdJobs.filter((job) => matchesStoreIdOnly(job.store)).length;
console.log(`Id lookups ${otherIdJobs.length} (${idOnlyJobs} Steam, Epic, or GOG by store id).`);
let finished = 0;
await mapPool(otherIdJobs, async (job) => {
  await lookupIdentity(job.game, job.store, job.identity);
  finished += 1;
  if (finished % 100 === 0) {
    console.log(`Store id lookups ${finished}/${otherIdJobs.length}`);
    writeOffers();
  }
});

writeOffers();
console.log("Cached store records after id lookups.");

const searchJobs = [];
for (const game of games) {
  const identities = identitiesFromGame(game);
  for (const store of stores) {
    if (matchesStoreIdOnly(store)) continue;
    if (!stale(game, store) || preferIdentity(identities, store) || attempts.get(game.id)?.[store]) continue;
    searchJobs.push({ game, store });
  }
}
searchJobs.sort((left, right) => left.game.id.localeCompare(right.game.id) || left.store.localeCompare(right.store));
const selectedSearches = searchJobs.slice(0, maxSearches);
console.log(`Title searches ${selectedSearches.length} of ${searchJobs.length} unmatched games (cap ${maxSearches}).`);
let searched = 0;
await mapPool(selectedSearches, async (job) => {
  await searchIdentity(job.game, job.store);
  searched += 1;
  if (searched % 100 === 0) console.log(`Title searches finished ${searched}/${selectedSearches.length}`);
});

function writeOffers() {
  const outputGames = {};
  for (const game of games) {
  const prior = previousGames[game.id];
  if (!included(game)) {
    if (prior) outputGames[game.id] = prior;
    continue;
  }
  const gameAttempts = attempts.get(game.id) ?? {};
  const offers = mergeStoreOffers(prior?.offers, gameAttempts);
  const misses = { ...(prior?.misses ?? {}) };
  for (const store of stores) {
    const attempt = gameAttempts[store];
    if (attempt?.status === "miss") misses[store] = today;
    if (attempt?.status === "matched") delete misses[store];
  }
  const freshMisses = Object.fromEntries(
    Object.entries(misses).filter(([, date]) => ageInDays(date, today) <= maxAge),
  );
  const fills = reconcileFills(game, prior?.fills, freshMedia.get(game.id) ?? []);
  const entry = {};
  if (offers.length > 0) entry.offers = offers;
  if (Object.keys(fills).length > 0) entry.fills = fills;
  if (Object.keys(freshMisses).length > 0) entry.misses = freshMisses;
    if (Object.keys(entry).length > 0) outputGames[game.id] = entry;
  }
  const ordered = Object.fromEntries(Object.keys(outputGames).sort().map((id) => [id, outputGames[id]]));
  const document = {
    schemaVersion: 1,
    region: "NL",
    currency: "EUR",
    generatedAt: new Date().toISOString(),
    games: ordered,
  };
  const temporary = `${offersPath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(document)}\n`);
  fs.renameSync(temporary, offersPath);
  return ordered;
}

const ordered = writeOffers();

const summary = {};
for (const store of stores) {
  summary[store] = { eligible: 0, withId: 0, matched: 0, "external-id": 0, "exact-title": 0, edition: 0 };
}
for (const game of games) {
  const identities = identitiesFromGame(game);
  for (const store of stores) {
    if (!game.platforms.includes(platformFor[store])) continue;
    summary[store].eligible += 1;
    if (identities.some((identity) => identity.store === store)) summary[store].withId += 1;
    const offer = ordered[game.id]?.offers?.find((item) => item.store === store);
    if (!offer) continue;
    summary[store].matched += 1;
    summary[store][offer.match] += 1;
  }
}
for (const store of stores) {
  console.log(`Coverage ${store}: ${summary[store].matched} matched / ${summary[store].withId} with a store id`);
}
const bytes = fs.statSync(offersPath).size;
console.log(JSON.stringify({
  summary,
  bytes,
  searches: { ran: selectedSearches.length, waiting: searchJobs.length - selectedSearches.length },
  endpoints: Object.fromEntries(stores.map((store) => [store, circuits[store].open ? circuits[store].reason : "ok"])),
}, null, 2));

import { loadTsModule } from "../load-ts-module.mjs";

const { resolveIgdbPlatform } = loadTsModule("src/data/platforms.ts");
const { mapIgdbWebsites } = loadTsModule("src/data/websites.ts");

function imageUrl(image, size = "t_thumb") {
  const url = image?.url?.replace(/^\/\//, "https://");
  return url?.replace(/\/t_[^/]+\//, `/${size}/`);
}

function contentRefs(records = []) {
  return records
    .filter((record) => record?.id && record?.name)
    .map((record) => {
      const cover = imageUrl(record.cover, "t_cover_big");
      return {
        id: String(record.id),
        title: record.name,
        ...(cover ? { cover: { url: cover } } : {}),
      };
    });
}

const IGDB_STORE_SOURCES = {
  11: "xbox",
  31: "xbox",
  36: "playstation",
};

function storeIdsFromIgdb(externalGames = []) {
  const ids = [];
  const seen = new Set();
  for (const entry of externalGames) {
    const source = IGDB_STORE_SOURCES[entry?.external_game_source ?? entry?.category];
    const uid = typeof entry?.uid === "string" ? entry.uid.trim() : "";
    if (!source || !uid) continue;
    const key = `${source}:${uid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push({ store: source, id: uid });
  }
  return ids;
}

function companies(involvedCompanies = [], role) {
  const seen = new Set();
  const result = [];
  for (const entry of involvedCompanies) {
    if (!entry?.company?.id || !entry.company.name || entry[role] !== true) continue;
    const id = String(entry.company.id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ id, name: entry.company.name });
  }
  return result;
}

const BOARD_BY_CATEGORY = {
  1: "ESRB",
  2: "PEGI",
  3: "CERO",
  4: "USK",
  5: "GRAC",
  6: "ClassInd",
  7: "ACB",
};

const RATING_BY_ENUM = {
  1: "3",
  2: "7",
  3: "12",
  4: "16",
  5: "18",
  6: "RP",
  7: "EC",
  8: "E",
  9: "E10+",
  10: "T",
  11: "M",
  12: "AO",
  13: "A",
  14: "B",
  15: "C",
  16: "D",
  17: "Z",
  18: "0",
  19: "6",
  20: "12",
  21: "16",
  22: "18",
  23: "All",
  24: "12",
  25: "15",
  26: "18",
  27: "Testing",
  28: "L",
  29: "10",
  30: "12",
  31: "14",
  32: "16",
  33: "18",
  34: "G",
  35: "PG",
  36: "M",
  37: "MA 15+",
  38: "R 18+",
  39: "RC",
};

const RATING_WORDS = {
  three: "3",
  seven: "7",
  twelve: "12",
  sixteen: "16",
  eighteen: "18",
  e10: "E10+",
  ma15: "MA 15+",
  r18: "R 18+",
  all: "All",
  testing: "Testing",
};

const BOARD_ORDER = ["PEGI", "ESRB", "USK", "ACB", "CERO", "GRAC", "ClassInd"];

const REGION_BY_ID = {
  1: "europe",
  2: "north_america",
  3: "australia",
  4: "new_zealand",
  5: "japan",
  6: "china",
  7: "asia",
  8: "worldwide",
  9: "korea",
  10: "brazil",
};

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function positiveInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function namedList(records, limit) {
  const seen = new Set();
  const result = [];
  for (const record of records ?? []) {
    const name = typeof record === "string" ? record : record?.name;
    if (typeof name !== "string") continue;
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || trimmed.length > 40 || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

function boardName(entry) {
  const organization = entry?.organization?.name
    ?? (typeof entry?.organization === "string" ? entry.organization : "");
  if (organization) {
    const aliases = [
      [/pegi/i, "PEGI"],
      [/esrb|entertainment software/i, "ESRB"],
      [/\busk\b/i, "USK"],
      [/cero/i, "CERO"],
      [/acb|australian classification/i, "ACB"],
      [/grac/i, "GRAC"],
      [/class[\s_-]*ind/i, "ClassInd"],
    ];
    for (const [pattern, name] of aliases) {
      if (pattern.test(organization)) return name;
    }
    const trimmed = organization.trim();
    if (trimmed && trimmed.length <= 12) return trimmed;
  }
  return BOARD_BY_CATEGORY[entry?.category] ?? "";
}

function cleanRatingLabel(board, raw) {
  let label = String(raw).trim().replace(new RegExp(`^${board}\\s*[-:]?\\s*`, "i"), "").trim();
  const word = RATING_WORDS[label.toLowerCase()];
  if (word) label = word;
  if (label.toLowerCase() === "e10") label = "E10+";
  return label;
}

function ratingLabel(board, entry) {
  const categoryRating = entry?.rating_category?.rating;
  if (typeof categoryRating === "string" && categoryRating.trim()) {
    return cleanRatingLabel(board, categoryRating);
  }
  if (typeof entry?.rating === "number" && RATING_BY_ENUM[entry.rating]) {
    return RATING_BY_ENUM[entry.rating];
  }
  if (typeof entry?.rating === "string" && entry.rating.trim()) {
    return cleanRatingLabel(board, entry.rating);
  }
  return "";
}

function ageRatings(records = []) {
  const mapped = [];
  for (const entry of records) {
    const board = boardName(entry);
    const label = ratingLabel(board, entry);
    if (!board || !label) continue;
    mapped.push({ board, label });
  }
  mapped.sort((left, right) => {
    const rank = (board) => {
      const index = BOARD_ORDER.indexOf(board);
      return index === -1 ? BOARD_ORDER.length : index;
    };
    return rank(left.board) - rank(right.board) || left.label.localeCompare(right.label);
  });
  const seen = new Set();
  const result = [];
  for (const entry of mapped) {
    const key = entry.board.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= 8) break;
  }
  return result;
}

function summarizeMultiplayer(modes = []) {
  const summary = {};
  const flags = {
    campaigncoop: "campaignCoop",
    dropin: "dropIn",
    lancoop: "lanCoop",
    offlinecoop: "offlineCoop",
    onlinecoop: "onlineCoop",
    splitscreen: "splitscreen",
    splitscreenonline: "splitscreenOnline",
  };
  const maximums = {
    offlinecoopmax: "offlineCoopMax",
    offlinemax: "offlineMax",
    onlinecoopmax: "onlineCoopMax",
    onlinemax: "onlineMax",
  };
  for (const mode of modes) {
    for (const [from, to] of Object.entries(flags)) {
      if (mode?.[from] === true) summary[to] = true;
    }
    for (const [from, to] of Object.entries(maximums)) {
      const value = positiveInt(mode?.[from]);
      if (value && value > 1) summary[to] = Math.max(summary[to] ?? 0, value);
    }
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function regionName(entry) {
  const named = entry?.release_region?.region;
  if (typeof named === "string" && named.trim()) return named.trim().toLowerCase();
  if (typeof entry?.region === "number") return REGION_BY_ID[entry.region] ?? "";
  return "";
}

function regionRank(name) {
  if (name === "worldwide") return 0;
  if (name === "europe") return 1;
  if (name === "north_america") return 2;
  return 3;
}

function isoDay(unix) {
  if (typeof unix !== "number" || !Number.isFinite(unix)) return undefined;
  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function platformReleases(dates = []) {
  const best = new Map();
  for (const entry of dates) {
    const rawName = entry?.platform?.name;
    if (typeof rawName !== "string" || !rawName.trim()) continue;
    const platform = resolveIgdbPlatform(rawName).variant || rawName.trim();
    const date = isoDay(entry.date);
    const label = typeof entry.human === "string" ? entry.human.trim() : "";
    if (!date && !label) continue;
    const rank = regionRank(regionName(entry));
    const current = best.get(platform);
    const betterRank = !current || rank < current.rank;
    const sameRankEarlier = Boolean(current) && rank === current.rank && Boolean(date) && (!current.date || date < current.date);
    if (betterRank || sameRankEarlier) {
      best.set(platform, {
        platform,
        rank,
        ...(date ? { date } : {}),
        ...(!date && label ? { label } : {}),
      });
    }
  }
  return [...best.values()]
    .sort((left, right) => (left.date ?? "9999-99-99").localeCompare(right.date ?? "9999-99-99") || left.platform.localeCompare(right.platform))
    .slice(0, 12)
    .map(({ platform, date, label }) => ({
      platform,
      ...(date ? { date } : {}),
      ...(label ? { label } : {}),
    }));
}

function timeToBeat(record) {
  const row = record?.game_time_to_beat
    ?? (Array.isArray(record?.game_time_to_beats) ? record.game_time_to_beats[0] : undefined);
  if (!row || typeof row !== "object") return undefined;
  const hastily = positiveInt(row.hastily);
  const normally = positiveInt(row.normally);
  const completely = positiveInt(row.completely);
  const count = positiveInt(row.count);
  if (!hastily && !normally && !completely) return undefined;
  return {
    ...(hastily ? { hastily } : {}),
    ...(normally ? { normally } : {}),
    ...(completely ? { completely } : {}),
    ...(count ? { count } : {}),
  };
}

export function normalizeIgdbRecord(record) {
  const resolvedPlatforms = (record.platforms ?? [])
    .map((platform) => platform.name)
    .filter(Boolean)
    .map((name) => resolveIgdbPlatform(name));
  const unsupportedPlatforms = resolvedPlatforms
    .filter((entry) => entry.unmapped)
    .map((entry) => entry.name);
  const platforms = [...new Set(resolvedPlatforms.map((entry) => entry.family))];
  const platformVariants = [...new Set(resolvedPlatforms.map((entry) => entry.variant))];
  const year = record.first_release_date
    ? new Date(record.first_release_date * 1000).getUTCFullYear()
    : undefined;
  const externalIds = storeIdsFromIgdb(record.external_games);
  const aggregatedRating = finiteNumber(record.aggregated_rating);
  const aggregatedRatingCount = positiveInt(record.aggregated_rating_count);
  const ratings = ageRatings(record.age_ratings);
  const gameModes = namedList(record.game_modes, 8);
  const playerPerspectives = namedList(record.player_perspectives, 8);
  const keywords = namedList(record.keywords, 12);
  const multiplayer = summarizeMultiplayer(record.multiplayer_modes);
  const releases = platformReleases(record.release_dates);
  const playTime = timeToBeat(record);

  return {
    id: String(record.id ?? ""),
    title: record.name,
    slug: record.slug,
    summary: record.summary,
    description: record.storyline ?? record.summary,
    releaseYear: year,
    genres: (record.genres ?? []).map((genre) => genre.name).filter(Boolean),
    themes: (record.themes ?? []).map((theme) => theme.name).filter(Boolean),
    developers: companies(record.involved_companies, "developer"),
    publishers: companies(record.involved_companies, "publisher"),
    platforms,
    platformVariants,
    cover: imageUrl(record.cover, "t_cover_big"),
    background: imageUrl(record.artworks?.[0], "t_1080p"),
    screenshots: (record.screenshots ?? []).map((image) => ({
      url: imageUrl(image, "t_screenshot_huge"),
      width: image.width,
      height: image.height,
    })).filter((image) => image.url),
    videos: (record.videos ?? []).filter((video) => video.video_id).map((video) => ({
      id: String(video.id),
      name: video.name,
      url: `https://www.youtube.com/watch?v=${video.video_id}`,
    })),
    websites: mapIgdbWebsites(record.websites),
    dlc: contentRefs(record.dlcs),
    expansions: contentRefs(record.expansions),
    editions: contentRefs(record.editions),
    relatedGames: (record.remakes ?? []).map((game) => ({
      id: String(game.id),
      title: game.name,
      relation: "remake",
    })).concat((record.remasters ?? []).map((game) => ({
      id: String(game.id),
      title: game.name,
      relation: "sequel",
    }))),
    similarGames: contentRefs(record.similar_games),
    franchises: (record.franchises ?? []).map((franchise) => franchise.name).filter(Boolean),
    collections: (record.collections ?? []).map((collection) => collection.name).filter(Boolean),
    rating: record.rating,
    ratingCount: record.rating_count,
    sourceId: String(record.id ?? ""),
    ...(externalIds.length > 0 ? { externalIds } : {}),
    ...(aggregatedRating != null ? { aggregatedRating } : {}),
    ...(aggregatedRatingCount ? { aggregatedRatingCount } : {}),
    ...(ratings.length > 0 ? { ageRatings: ratings } : {}),
    ...(gameModes.length > 0 ? { gameModes } : {}),
    ...(playerPerspectives.length > 0 ? { playerPerspectives } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
    ...(multiplayer ? { multiplayer } : {}),
    ...(releases.length > 0 ? { releases } : {}),
    ...(playTime ? { timeToBeat: playTime } : {}),
    warnings: unsupportedPlatforms.map((platform) => `Unsupported IGDB platform omitted: ${platform}`),
  };
}

export function normalizeIgdbExport(input) {
  const records = Array.isArray(input) ? input : input?.games;
  if (!Array.isArray(records)) {
    throw new Error("IGDB input must be an array or an object containing a games array.");
  }
  return records
    .map(normalizeIgdbRecord)
    .filter((record) => record.platforms.length > 0);
}

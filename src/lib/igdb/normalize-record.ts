import {
  igdbPlatformLabel,
  platformVariantFromIgdb,
  resolveIgdbPlatform,
  type Platform,
} from "@/data/platforms";
import { mapIgdbWebsites } from "@/data/websites";
import { storeIdsFromIgdb } from "@/data/store-match";
function imageUrl(image: { url?: string } | undefined, size = "t_thumb"): string | undefined {
  const url = image?.url?.replace(/^\/\//, "https://");
  return url?.replace(/\/t_[^/]+\//, `/${size}/`);
}

function contentRefs(records: { id?: number; name?: string; cover?: { url?: string } }[] = []) {
  return records
    .filter((record) => record?.id && record?.name)
    .map((record) => {
      const cover = imageUrl(record.cover, "t_cover_big");
      return {
        id: String(record.id),
        title: record.name!,
        ...(cover ? { cover: { url: cover } } : {}),
      };
    });
}

function companyLogo(logo: unknown) {
  if (!logo || typeof logo !== "object") return undefined;
  const entry = logo as {
    image_id?: string;
    url?: string;
    width?: number;
    height?: number;
    alpha_channel?: boolean;
    animated?: boolean;
  };
  const imageId = typeof entry.image_id === "string" ? entry.image_id.trim() : "";
  const width = positiveInt(entry.width);
  const height = positiveInt(entry.height);
  let url: string | undefined;
  if (/^[A-Za-z0-9_-]{2,80}$/.test(imageId)) {
    const extension = entry.animated === true ? "gif" : entry.alpha_channel === true ? "png" : "jpg";
    url = `https://images.igdb.com/igdb/image/upload/t_logo_med/${imageId}.${extension}`;
  } else {
    url = imageUrl(entry, "t_logo_med");
  }
  if (!url || !url.startsWith("https://images.igdb.com/igdb/image/upload/")) return undefined;
  return {
    url,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

function companies(
  involvedCompanies: {
    developer?: boolean;
    publisher?: boolean;
    company?: { id?: number; name?: string; logo?: unknown };
  }[] = [],
  role: "developer" | "publisher",
) {
  const seen = new Set<string>();
  const result: { id: string; name: string; logo?: { url: string; width?: number; height?: number } }[] = [];
  for (const entry of involvedCompanies) {
    if (!entry?.company?.id || !entry.company.name || entry[role] !== true) continue;
    const id = String(entry.company.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const logo = companyLogo(entry.company.logo);
    result.push({ id, name: entry.company.name, ...(logo ? { logo } : {}) });
  }
  return result;
}

const BOARD_BY_CATEGORY: Record<number, string> = {
  1: "ESRB",
  2: "PEGI",
  3: "CERO",
  4: "USK",
  5: "GRAC",
  6: "ClassInd",
  7: "ACB",
};

const RATING_BY_ENUM: Record<number, string> = {
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

const RATING_WORDS: Record<string, string> = {
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

const REGION_BY_ID: Record<number, string> = {
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

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function positiveInt(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function namedList(records: unknown, limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const record of (records as { name?: string }[] | undefined) ?? []) {
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

function boardName(entry: {
  organization?: { name?: string } | string;
  category?: number;
}) {
  const organization =
    (typeof entry?.organization === "object" ? entry.organization?.name : undefined)
    ?? (typeof entry?.organization === "string" ? entry.organization : "");
  if (organization) {
    const aliases: [RegExp, string][] = [
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
  return BOARD_BY_CATEGORY[entry?.category ?? 0] ?? "";
}

function cleanRatingLabel(board: string, raw: string) {
  let label = String(raw).trim().replace(new RegExp(`^${board}\\s*[-:]?\\s*`, "i"), "").trim();
  const word = RATING_WORDS[label.toLowerCase()];
  if (word) label = word;
  if (label.toLowerCase() === "e10") label = "E10+";
  return label;
}

function ratingLabel(
  board: string,
  entry: { rating_category?: { rating?: string }; rating?: number | string },
) {
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

function ageRatings(records: unknown[] = []) {
  const mapped: { board: string; label: string }[] = [];
  for (const entry of records) {
    const row = entry as Parameters<typeof boardName>[0] & Parameters<typeof ratingLabel>[1];
    const board = boardName(row);
    const label = ratingLabel(board, row);
    if (!board || !label) continue;
    mapped.push({ board, label });
  }
  mapped.sort((left, right) => {
    const rank = (board: string) => {
      const index = BOARD_ORDER.indexOf(board);
      return index === -1 ? BOARD_ORDER.length : index;
    };
    return rank(left.board) - rank(right.board) || left.label.localeCompare(right.label);
  });
  const seen = new Set<string>();
  const result: { board: string; label: string }[] = [];
  for (const entry of mapped) {
    const key = entry.board.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= 8) break;
  }
  return result;
}

function summarizeMultiplayer(modes: Record<string, unknown>[] = []) {
  const summary: Record<string, boolean | number> = {};
  const flags: Record<string, string> = {
    campaigncoop: "campaignCoop",
    dropin: "dropIn",
    lancoop: "lanCoop",
    offlinecoop: "offlineCoop",
    onlinecoop: "onlineCoop",
    splitscreen: "splitscreen",
    splitscreenonline: "splitscreenOnline",
  };
  const maximums: Record<string, string> = {
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
      if (value && value > 1) summary[to] = Math.max((summary[to] as number | undefined) ?? 0, value);
    }
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function regionName(entry: {
  release_region?: { region?: string };
  region?: number;
}) {
  const named = entry?.release_region?.region;
  if (typeof named === "string" && named.trim()) return named.trim().toLowerCase();
  if (typeof entry?.region === "number") return REGION_BY_ID[entry.region] ?? "";
  return "";
}

function regionRank(name: string) {
  if (name === "worldwide") return 0;
  if (name === "europe") return 1;
  if (name === "north_america") return 2;
  return 3;
}

function isoDay(unix: unknown) {
  if (typeof unix !== "number" || !Number.isFinite(unix)) return undefined;
  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function platformReleases(
  dates: {
    date?: number;
    human?: string;
    platform?: { name?: string; id?: number };
    release_region?: { region?: string };
    region?: number;
  }[] = [],
) {
  const best = new Map<
    string,
    { platform: string; rank: number; date?: string; label?: string }
  >();
  for (const entry of dates) {
    const rawName = entry?.platform?.name;
    if (typeof rawName !== "string" || !rawName.trim()) continue;
    const platform = igdbPlatformLabel(rawName, entry?.platform?.id);
    const date = isoDay(entry.date);
    const label = typeof entry.human === "string" ? entry.human.trim() : "";
    if (!date && !label) continue;
    const rank = regionRank(regionName(entry));
    const current = best.get(platform);
    const betterRank = !current || rank < current.rank;
    const sameRankEarlier =
      current != null
      && rank === current.rank
      && Boolean(date)
      && (!current.date || (date !== undefined && date < current.date));
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
    .sort(
      (left, right) =>
        (left.date ?? "9999-99-99").localeCompare(right.date ?? "9999-99-99")
        || left.platform.localeCompare(right.platform),
    )
    .slice(0, 12)
    .map(({ platform, date, label }) => ({
      platform,
      ...(date ? { date } : {}),
      ...(label ? { label } : {}),
    }));
}

function timeToBeat(record: {
  game_time_to_beat?: Record<string, unknown>;
  game_time_to_beats?: Record<string, unknown>[];
}) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeIgdbRecord(record: any) {
  const resolvedPlatforms = (record.platforms ?? [])
    .filter((platform: { name?: string }) => typeof platform?.name === "string" && platform.name)
    .map((platform: { name: string; id?: number }) => {
      const label = platformVariantFromIgdb(platform.name, platform.id);
      return resolveIgdbPlatform(label);
    });
  const unsupportedPlatforms = resolvedPlatforms
    .filter((entry: { unmapped?: boolean }) => entry.unmapped)
    .map((entry: { name: string }) => entry.name);
  const platforms = [
    ...new Set(resolvedPlatforms.map((entry: { family: Platform }) => entry.family)),
  ] as Platform[];
  const platformVariants = [
    ...new Set(resolvedPlatforms.map((entry: { variant: string }) => entry.variant)),
  ] as string[];
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
  const portRefs = contentRefs(record.ports);

  return {
    id: String(record.id ?? ""),
    title: record.name,
    slug: record.slug,
    summary: record.summary,
    description: record.storyline ?? record.summary,
    releaseYear: year,
    genres: (record.genres ?? []).map((genre: { name?: string }) => genre.name).filter(Boolean),
    themes: (record.themes ?? []).map((theme: { name?: string }) => theme.name).filter(Boolean),
    developers: companies(record.involved_companies, "developer"),
    publishers: companies(record.involved_companies, "publisher"),
    platforms,
    platformVariants,
    cover: imageUrl(record.cover, "t_cover_big"),
    background: imageUrl(record.artworks?.[0], "t_1080p"),
    screenshots: (record.screenshots ?? [])
      .map((image: { url?: string; width?: number; height?: number }) => ({
        url: imageUrl(image, "t_screenshot_huge"),
        width: image.width,
        height: image.height,
      }))
      .filter((image: { url?: string }) => image.url),
    videos: (record.videos ?? [])
      .filter((video: { video_id?: string }) => video.video_id)
      .map((video: { id?: number; name?: string; video_id: string }) => ({
        id: String(video.id),
        name: video.name,
        url: `https://www.youtube.com/watch?v=${video.video_id}`,
      })),
    websites: mapIgdbWebsites(record.websites),
    dlc: contentRefs(record.dlcs),
    expansions: contentRefs(record.expansions),
    editions: contentRefs(record.editions),
    relatedGames: (record.remakes ?? [])
      .map((game: { id?: number; name?: string }) => ({
        id: String(game.id),
        title: game.name!,
        relation: "remake" as const,
      }))
      .concat(
        (record.remasters ?? []).map((game: { id?: number; name?: string }) => ({
          id: String(game.id),
          title: game.name!,
          relation: "remake" as const,
        })),
      ),
    ...(record.parent_game?.id ? { parentGameId: String(record.parent_game.id) } : {}),
    ...(record.version_parent?.id ? { versionParentId: String(record.version_parent.id) } : {}),
    ...(Array.isArray(record.ports) && record.ports.length > 0
      ? { portIds: record.ports.map((game: { id?: number }) => String(game.id)).filter(Boolean) }
      : {}),
    ...(portRefs.length > 0 ? { platformPorts: portRefs } : {}),
    similarGames: contentRefs(record.similar_games),
    franchises: (record.franchises ?? []).map((franchise: { name?: string }) => franchise.name).filter(Boolean),
    collections: (record.collections ?? []).map((collection: { name?: string }) => collection.name).filter(Boolean),
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
    warnings: unsupportedPlatforms.map(
      (platform: string) => `Unsupported IGDB platform omitted: ${platform}`,
    ),
  };
}

export function normalizeIgdbExport(input: unknown) {
  const records = Array.isArray(input) ? input : (input as { games?: unknown[] })?.games;
  if (!Array.isArray(records)) {
    throw new Error("IGDB input must be an array or an object containing a games array.");
  }
  return records
    .map(normalizeIgdbRecord)
    .filter((record) => record.platforms.length > 0);
}
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { fetchAllDealsGridPages, fetchDealsCategoryId } from "./playstation-deals-graphql";
import { buildPlayStationStoreIdGameIndex } from "./playstation-deals-match";
import { playStationDealsFromCategoryGrid } from "./playstation-deals-normalize";
import type { PlayStationDealsPayload } from "./playstation-deals-types";

const REVALIDATE_SECONDS = 10_800;
const CACHE_FILE = join(process.cwd(), ".cache/playstation-deals-nl.json");

interface DiskCacheEnvelope {
  lastUpdated: string;
  payload: PlayStationDealsPayload;
}

function readDiskCache(): DiskCacheEnvelope | null {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as DiskCacheEnvelope;
  } catch {
    return null;
  }
}

function writeDiskCache(payload: PlayStationDealsPayload) {
  try {
    mkdirSync(join(process.cwd(), ".cache"), { recursive: true });
    const envelope: DiskCacheEnvelope = {
      lastUpdated: payload.updatedAt,
      payload,
    };
    writeFileSync(CACHE_FILE, JSON.stringify(envelope), "utf8");
  } catch {
    // Best-effort persistence only.
  }
}

function unavailablePayload(message: string): PlayStationDealsPayload {
  return {
    source: "unavailable",
    status: "unavailable",
    updatedAt: new Date().toISOString(),
    deals: [],
    error: message,
  };
}

function cachedPayload(
  envelope: DiskCacheEnvelope,
  error: string,
): PlayStationDealsPayload {
  return {
    ...envelope.payload,
    source: "disk-cache",
    status: "cached",
    updatedAt: new Date().toISOString(),
    lastUpdated: envelope.lastUpdated,
    error,
  };
}

function readE2eFixture(): PlayStationDealsPayload | null {
  if (process.env.GAMEVAULT_E2E_PLAYSTATION_DEALS !== "1") return null;
  const path = join(process.cwd(), "test/fixtures/playstation-deals-e2e-smoke.json");
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PlayStationDealsPayload;
  } catch {
    return null;
  }
}

export async function fetchPlayStationDealsLive(): Promise<PlayStationDealsPayload> {
  const gameIdByStoreId = buildPlayStationStoreIdGameIndex();
  try {
    const categoryId = await fetchDealsCategoryId(REVALIDATE_SECONDS);
    const pages = await fetchAllDealsGridPages(categoryId, REVALIDATE_SECONDS);
    const deals = pages.flatMap((page) => playStationDealsFromCategoryGrid(page, gameIdByStoreId));
    const updatedAt = new Date().toISOString();
    const payload: PlayStationDealsPayload = {
      source: "playstation-category-grid",
      status: "live",
      updatedAt,
      lastUpdated: updatedAt,
      deals,
    };
    writeDiskCache(payload);
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "PlayStation Store deals could not be loaded";
    console.warn(`[playstation-deals] ${message}`);
    const envelope = readDiskCache();
    if (envelope?.payload.deals.length) {
      return cachedPayload(envelope, `Live PlayStation Store fetching failed; showing cached deals from ${envelope.lastUpdated}.`);
    }
    return unavailablePayload(
      envelope
        ? "PlayStation Store deals are temporarily unavailable and no cached deals were stored."
        : "PlayStation Store deals could not be loaded and no cached copy exists yet.",
    );
  }
}

export async function getPlayStationDeals(): Promise<PlayStationDealsPayload> {
  const fixture = readE2eFixture();
  if (fixture) return fixture;

  return unstable_cache(
    fetchPlayStationDealsLive,
    ["playstation-deals-nl-v1"],
    { revalidate: REVALIDATE_SECONDS },
  )();
}
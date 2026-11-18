import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { fetchAllDealsGridPages, fetchDealsCategoryId } from "./playstation-deals-graphql";
import { buildPlayStationStoreIdGameIndex } from "./playstation-deals-match";
import { playStationDealsFromCategoryGrid } from "./playstation-deals-normalize";
import type { PlayStationDealsPayload } from "./playstation-deals-types";

const REVALIDATE_SECONDS = 10_800;
const SNAPSHOT_FILE = join(process.cwd(), "public/catalog/playstation-deals-snapshot.json");

export interface PlayStationDealsSnapshotFile {
  schemaVersion: 1;
  region: "NL";
  generatedAt: string;
  deals: PlayStationDealsPayload["deals"];
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

function readE2eFixtureFile(variant: "smoke" | "unavailable"): PlayStationDealsPayload | null {
  const fileName = variant === "unavailable"
    ? "playstation-deals-e2e-unavailable.json"
    : "playstation-deals-e2e-smoke.json";
  const path = join(process.cwd(), "test/fixtures", fileName);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PlayStationDealsPayload;
  } catch {
    return null;
  }
}

function resolveE2eFixtureVariant(override: string | undefined): "smoke" | "unavailable" {
  return override === "unavailable" ? "unavailable" : "smoke";
}

export function readPlayStationDealsSnapshot(): PlayStationDealsSnapshotFile | null {
  try {
    const file = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as PlayStationDealsSnapshotFile;
    if (file.schemaVersion !== 1 || file.region !== "NL" || !Array.isArray(file.deals)) return null;
    return file;
  } catch {
    return null;
  }
}

/** Committed-catalogue fallback when live revalidation fails outside the data cache. */
export function playStationDealsFallbackFromError(error: unknown): PlayStationDealsPayload {
  const message = error instanceof Error ? error.message : "PlayStation Store deals could not be loaded";
  console.warn(`[playstation-deals] ${message}`);
  const snapshot = readPlayStationDealsSnapshot();
  if (snapshot && snapshot.deals.length > 0) {
    return {
      source: "catalog-snapshot",
      status: "cached",
      updatedAt: new Date().toISOString(),
      lastUpdated: snapshot.generatedAt,
      deals: snapshot.deals,
      error: `Live PlayStation Store fetching failed; showing committed snapshot from ${snapshot.generatedAt}.`,
    };
  }
  return unavailablePayload(
    "PlayStation Store deals could not be loaded and the committed snapshot is missing or empty.",
  );
}

/** Live fetch for `unstable_cache`; throws on failure so the data cache keeps the last good entry. */
export async function fetchPlayStationDealsLive(): Promise<PlayStationDealsPayload> {
  const gameIdByStoreId = buildPlayStationStoreIdGameIndex();
  const categoryId = await fetchDealsCategoryId(REVALIDATE_SECONDS);
  const pages = await fetchAllDealsGridPages(categoryId, REVALIDATE_SECONDS);
  const deals = pages.flatMap((page) => playStationDealsFromCategoryGrid(page, gameIdByStoreId));
  const updatedAt = new Date().toISOString();
  return {
    source: "playstation-category-grid",
    status: "live",
    updatedAt,
    lastUpdated: updatedAt,
    deals,
  };
}

export async function getPlayStationDeals(e2eFixtureOverride?: string): Promise<PlayStationDealsPayload> {
  if (process.env.GAMEVAULT_E2E_PLAYSTATION_DEALS === "1") {
    const fixture = readE2eFixtureFile(resolveE2eFixtureVariant(e2eFixtureOverride));
    if (fixture) return fixture;
  }

  try {
    return await unstable_cache(
      fetchPlayStationDealsLive,
      ["playstation-deals-nl-v1"],
      { revalidate: REVALIDATE_SECONDS },
    )();
  } catch (error) {
    return playStationDealsFallbackFromError(error);
  }
}
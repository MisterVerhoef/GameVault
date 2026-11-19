import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { fetchDisplayCatalogProducts } from "./xbox-deals-fetch";
import {
  normalizeXboxBigId,
  playAnywhereAvailabilityFromEntry,
  playAnywhereForGame,
  productSupportsXboxPlayAnywhere,
  xboxBigIdsFromGame,
  type PlayAnywhereIndex,
} from "./play-anywhere";
import type { CloudStreamingIndex } from "./cloud-streaming";
import {
  gameHasXboxSeries,
  xboxCloudGamingAvailability,
  type XboxFeatureAvailability,
  type XboxSeriesFeatureStatus,
} from "./xbox-series-features";

const REVALIDATE_SECONDS = 10_800;
const DISPLAY_TIMEOUT_MS = 15_000;

type E2eFixture = {
  products?: Record<string, boolean | null>;
};

let e2eFixture: E2eFixture | null | undefined;

function loadE2eFixture(): E2eFixture | null {
  if (e2eFixture !== undefined) return e2eFixture;
  if (process.env.GAMEVAULT_E2E_PLAY_ANYWHERE !== "1") {
    e2eFixture = null;
    return e2eFixture;
  }
  const path = process.env.GAMEVAULT_E2E_PLAY_ANYWHERE_FIXTURE
    ?? join(process.cwd(), "test/fixtures/play-anywhere-e2e.json");
  e2eFixture = JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8")) as E2eFixture;
  return e2eFixture;
}

function e2ePlayAnywhereForProduct(productId: string): boolean | null {
  const fixture = loadE2eFixture();
  if (!fixture?.products) return null;
  const normalized = normalizeXboxBigId(productId);
  if (!Object.prototype.hasOwnProperty.call(fixture.products, normalized)) return null;
  const value = fixture.products[normalized];
  if (value === null) return null;
  return Boolean(value);
}

async function fetchProductPlayAnywhere(productId: string): Promise<boolean | null> {
  const mocked = e2ePlayAnywhereForProduct(productId);
  if (mocked !== null) return mocked;

  const normalized = normalizeXboxBigId(productId);
  if (!normalized) return null;

  try {
    const products = await Promise.race([
      fetchDisplayCatalogProducts([normalized]),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("display catalog timeout")), DISPLAY_TIMEOUT_MS);
      }),
    ]);
    const product = products.get(normalized);
    if (!product) return null;
    return productSupportsXboxPlayAnywhere(product);
  } catch {
    return null;
  }
}

const cachedProductPlayAnywhere = unstable_cache(
  async (productId: string) => fetchProductPlayAnywhere(productId),
  ["play-anywhere-display-catalog-v1"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Live Microsoft Store XPA lookup when the offline play-anywhere catalogue has no entry. */
export async function resolvePlayAnywhereLive(
  game: {
    id: string;
    externalIds?: readonly { store: string; id: string }[];
    websites?: readonly { url: string }[];
  },
  playAnywhereIndex: PlayAnywhereIndex,
): Promise<XboxFeatureAvailability> {
  const offline = playAnywhereAvailabilityFromEntry(playAnywhereForGame(playAnywhereIndex, game.id));
  if (offline !== "unknown") return offline;

  const productIds = xboxBigIdsFromGame(game);
  if (productIds.length === 0) return "unknown";

  let sawProduct = false;
  for (const productId of productIds) {
    const supported = await cachedProductPlayAnywhere(productId);
    if (supported === null) continue;
    sawProduct = true;
    if (supported) return "supported";
  }
  return sawProduct ? "unsupported" : "unknown";
}

/** Game detail: offline catalogue first, then live Microsoft Store XPA for unresolved titles. */
export async function xboxSeriesFeatureStatusForGamePage(
  game: {
    id: string;
    platformVariants?: readonly string[];
    externalIds?: readonly { store: string; id: string }[];
    websites?: readonly { url: string }[];
  },
  playAnywhereIndex: PlayAnywhereIndex,
  cloudIndex: CloudStreamingIndex,
): Promise<XboxSeriesFeatureStatus | null> {
  if (!gameHasXboxSeries(game.platformVariants)) return null;
  const playAnywhere = await resolvePlayAnywhereLive(game, playAnywhereIndex);
  return {
    playAnywhere,
    cloudGaming: xboxCloudGamingAvailability(cloudIndex, game.id, game),
  };
}
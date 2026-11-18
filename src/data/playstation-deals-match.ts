import { readFileSync } from "node:fs";
import { gamesIndexAbsolutePath } from "./games-index-path";
import { parsePlayStationConceptId } from "./cloud-streaming";
import type { StoreIdentity } from "./store-match";

let cachedIndex: Map<string, string> | null = null;

function addIdentity(
  map: Map<string, string>,
  gameId: string,
  identity: StoreIdentity | undefined,
) {
  if (!identity || identity.store !== "playstation") return;
  if (identity.id.startsWith("concept:")) {
    map.set(identity.id.slice("concept:".length), gameId);
    return;
  }
  if (identity.id.startsWith("product:")) {
    map.set(identity.id.slice("product:".length), gameId);
    return;
  }
  if (/^\d+$/.test(identity.id)) {
    map.set(identity.id, gameId);
  }
}

function productIdFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "store.playstation.com") return undefined;
    return parsed.pathname.match(/\/product\/([^/?#]+)/)?.[1];
  } catch {
    return undefined;
  }
}

/** Map PlayStation concept and product ids to catalogue game ids (exact ids only). */
export function buildPlayStationStoreIdGameIndex(): ReadonlyMap<string, string> {
  if (cachedIndex) return cachedIndex;
  const path = gamesIndexAbsolutePath();
  const map = new Map<string, string>();
  try {
    const file = JSON.parse(readFileSync(path, "utf8")) as {
      games?: {
        id?: string;
        externalIds?: { store?: string; id?: string }[];
        websites?: { url?: string }[];
      }[];
    };
    for (const game of file.games ?? []) {
      const gameId = typeof game.id === "string" ? game.id : "";
      if (!gameId) continue;
      for (const entry of game.externalIds ?? []) {
        if (entry?.store === "playstation" && typeof entry.id === "string") {
          addIdentity(map, gameId, { store: "playstation", id: entry.id });
        }
      }
      for (const site of game.websites ?? []) {
        const concept = parsePlayStationConceptId(site?.url ?? "");
        if (concept) addIdentity(map, gameId, { store: "playstation", id: `concept:${concept}` });
        const product = productIdFromUrl(site?.url);
        if (product) addIdentity(map, gameId, { store: "playstation", id: `product:${product}` });
      }
    }
  } catch {
    // Unreadable catalogue yields no matches.
  }
  cachedIndex = map;
  return map;
}
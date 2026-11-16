import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isXboxBigId, parseStoreUrl, type StoreIdentity } from "./store-match";

let cachedIndex: Map<string, string> | null = null;

function addIdentity(
  map: Map<string, string>,
  gameId: string,
  identity: StoreIdentity | undefined,
) {
  if (!identity || identity.store !== "xbox" || !isXboxBigId(identity.id)) return;
  const bigId = identity.id.toUpperCase();
  if (!map.has(bigId)) map.set(bigId, gameId);
}

/** Map Xbox Store bigIds to catalogue game ids from the committed games index. */
export function buildXboxBigIdGameIndex(): ReadonlyMap<string, string> {
  if (cachedIndex) return cachedIndex;
  const path = join(process.cwd(), "public/catalog/games-index.json");
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
        if (entry?.store === "xbox" && typeof entry.id === "string") {
          addIdentity(map, gameId, { store: "xbox", id: entry.id });
        }
      }
      for (const site of game.websites ?? []) {
        addIdentity(map, gameId, parseStoreUrl(site?.url ?? ""));
      }
    }
  } catch {
    // An unreadable catalogue yields no matches; store links still work.
  }
  cachedIndex = map;
  return map;
}
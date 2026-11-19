/** Normalize JSON default imports across bundlers and Node test loaders. */
export function catalogueJsonModule(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "schemaVersion" in raw) {
    return raw;
  }
  if (raw && typeof raw === "object" && "default" in raw) {
    const nested = catalogueJsonModule((raw as { default: unknown }).default);
    if (nested && typeof nested === "object" && !Array.isArray(nested) && "schemaVersion" in nested) {
      return nested;
    }
  }
  return raw;
}

import type { StoreId } from "./games";
import { xboxIdentitiesOrdered } from "./store-match";

/** Offline catalogue: Xbox Play Anywhere flags matched by Microsoft Store product id. */

export interface PlayAnywhereGameEntry {
  playAnywhere: boolean;
  xboxProductId: string;
  match: "external-id";
  checkedAt: string;
}

export interface PlayAnywhereCatalogue {
  schemaVersion: number;
  region: string;
  generatedAt: string;
  games: Record<string, PlayAnywhereGameEntry>;
}

export type PlayAnywhereIndex = ReadonlyMap<string, PlayAnywhereGameEntry>;

const XPA_ATTRIBUTE = "XPA";

export function normalizeXboxBigId(value: string): string {
  return value.trim().toUpperCase();
}

/** True when Microsoft Display Catalog reports the XPA capability on a product. */
export function productSupportsXboxPlayAnywhere(product: Record<string, unknown> | null | undefined): boolean {
  if (!product) return false;
  const properties = product.Properties as { Attributes?: { Name?: string }[]; XboxXPA?: unknown } | undefined;
  const attributes = properties?.Attributes;
  if (Array.isArray(attributes) && attributes.some((entry) => entry?.Name === XPA_ATTRIBUTE)) {
    return true;
  }
  const xboxXpa = properties?.XboxXPA;
  return xboxXpa === true || xboxXpa === 1;
}

function parseEntry(value: unknown): PlayAnywhereGameEntry | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entry = value as PlayAnywhereGameEntry;
  if (typeof entry.xboxProductId !== "string" || entry.match !== "external-id") return undefined;
  if (typeof entry.checkedAt !== "string") return undefined;
  if (entry.playAnywhere !== true && entry.playAnywhere !== false) return undefined;
  return entry;
}

export function indexPlayAnywhere(raw: unknown): PlayAnywhereIndex {
  const empty = new Map<string, PlayAnywhereGameEntry>();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const file = raw as PlayAnywhereCatalogue;
  if (file.schemaVersion !== 1 || file.region !== "NL" || !file.games || typeof file.games !== "object" || Array.isArray(file.games)) {
    return empty;
  }
  for (const [gameId, value] of Object.entries(file.games)) {
    const entry = parseEntry(value);
    if (entry) empty.set(gameId, entry);
  }
  return empty;
}

export function playAnywhereForGame(index: PlayAnywhereIndex, gameId: string): PlayAnywhereGameEntry | undefined {
  return index.get(gameId);
}

export function xboxExternalIds(game: { externalIds?: readonly { store: string; id: string }[] }): string[] {
  return (game.externalIds ?? [])
    .filter((entry) => entry.store === "xbox")
    .map((entry) => normalizeXboxBigId(entry.id))
    .filter(Boolean);
}

/** Microsoft Store bigIds from IGDB external ids and official store URLs, in priority order. */
export function xboxBigIdsFromGame(game: {
  externalIds?: readonly { store: string; id: string }[];
  websites?: readonly { url: string }[];
}): string[] {
  return xboxIdentitiesOrdered({
    externalIds: game.externalIds
      ? game.externalIds.map((entry) => ({ store: entry.store as StoreId, id: entry.id }))
      : undefined,
    websites: game.websites ? game.websites.map((entry) => ({ url: entry.url })) : undefined,
  }).map((identity) => normalizeXboxBigId(identity.id));
}

export function playAnywhereAvailabilityFromEntry(
  entry: PlayAnywhereGameEntry | undefined,
): "supported" | "unsupported" | "unknown" {
  if (!entry) return "unknown";
  return entry.playAnywhere ? "supported" : "unsupported";
}

export function resolvePlayAnywhereForGame(
  game: {
    externalIds?: readonly { store: string; id: string }[];
    websites?: readonly { url: string }[];
  },
  products: Map<string, boolean>,
): Omit<PlayAnywhereGameEntry, "checkedAt"> | undefined {
  const ids = xboxBigIdsFromGame(game);
  let matchedId: string | undefined;
  let supported = false;
  for (const id of ids) {
    if (!products.has(id)) continue;
    matchedId ??= id;
    if (products.get(id)) supported = true;
  }
  if (!matchedId) return undefined;
  return {
    playAnywhere: supported,
    xboxProductId: matchedId,
    match: "external-id",
  };
}
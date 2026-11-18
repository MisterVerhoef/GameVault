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

export function resolvePlayAnywhereForGame(
  game: { externalIds?: readonly { store: string; id: string }[] },
  products: Map<string, boolean>,
): Omit<PlayAnywhereGameEntry, "checkedAt"> | undefined {
  const ids = xboxExternalIds(game);
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
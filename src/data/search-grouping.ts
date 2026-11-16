import { igdbPlatformLabel } from "./platforms";
import { normalizeTitle } from "./store-match";

/**
 * Search grouping (gv-search-02)
 *
 * 1. IGDB lineage — `parentGameId`, `versionParentId`, or membership in another game's
 *    `portIds` groups under that parent when present on catalogue records (after sync).
 * 2. Exact duplicate titles — multiple IGDB rows with the same title merge to one canonical entry.
 * 3. Conservative edition suffixes — trailing ` HD`, ` DX`, ` 3D`, or ` - … Edition` is stripped
 *    only when the stripped string equals another catalogue title (normalized). Example:
 *    Breath of the Wild + Switch 2 Edition merge; Link's Awakening + DX can merge when both exist.
 * 4. Remake links — a `relatedGames` remake/remaster pointer to another entry with the same
 *    normalized title joins that group (e.g. duplicate Ocarina of Time SKUs).
 *
 * Separate identities never merge: different subtitles (A Link Between Worlds), distinct games
 * (Majora's Mask vs Ocarina), or edition text that does not resolve to an existing base title.
 *
 * Canonical pick — prefer no edition suffix, then earlier release year, then higher rating,
 * then lowest numeric id.
 */

export interface GroupableGame {
  id: string;
  title: string;
  releaseYear?: number;
  rating?: number;
  platforms?: string[];
  platformVariants?: string[];
  parentGameId?: string;
  versionParentId?: string;
  portIds?: string[];
  relatedGames?: { id: string; title: string; relation: string }[];
}

export interface GroupedVariant {
  id: string;
  title: string;
  releaseYear?: number;
  platformLabel: string;
}

const EDITION_SUFFIX = /\s+-\s+.+$/i;
const TRAILING_MARKERS = /\s+(HD|DX|3D)$/i;

function numericId(id: string): number {
  const value = Number.parseInt(id, 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function hasEditionSuffix(title: string): boolean {
  return EDITION_SUFFIX.test(title) || TRAILING_MARKERS.test(title);
}

/** Strip edition/port suffixes when another game justifies the base name. */
export function stripConservativeEditionSuffix(
  title: string,
  knownTitles: ReadonlySet<string>,
): string {
  const current = title.trim();
  if (EDITION_SUFFIX.test(current)) {
    const base = current.replace(EDITION_SUFFIX, "").trim();
    if (knownTitles.has(normalizeTitle(base))) return base;
  }
  const marker = current.match(TRAILING_MARKERS);
  if (marker) {
    const base = current.replace(TRAILING_MARKERS, "").trim();
    if (knownTitles.has(normalizeTitle(base))) return base;
  }
  return current;
}

function platformSummary(game: GroupableGame): string {
  const variants = game.platformVariants?.filter(Boolean) ?? [];
  if (variants.length > 0) {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const name of variants) {
      const label = igdbPlatformLabel(name);
      const key = label.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      labels.push(label);
    }
    if (labels.length > 0) return labels.slice(0, 3).join(", ");
  }
  if (game.platforms?.length) return game.platforms.join(", ");
  return "—";
}

function canonicalScore(game: GroupableGame): [number, number, number, number] {
  return [
    hasEditionSuffix(game.title) ? 1 : 0,
    game.releaseYear ?? 9999,
    -(game.rating ?? 0),
    numericId(game.id),
  ];
}

export function pickCanonicalMember<T extends GroupableGame>(members: readonly T[]): T {
  return [...members].sort((left, right) => {
    const leftScore = canonicalScore(left);
    const rightScore = canonicalScore(right);
    for (let index = 0; index < leftScore.length; index += 1) {
      if (leftScore[index] !== rightScore[index]) return leftScore[index] - rightScore[index];
    }
    return left.id.localeCompare(right.id);
  })[0];
}

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    this.parent.set(id, id);
    return id;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

export interface SearchGroupingIndex {
  canonicalIdByGameId: Map<string, string>;
  membersByCanonicalId: Map<string, GroupableGame[]>;
}

export function buildSearchGroupingIndex(games: readonly GroupableGame[]): SearchGroupingIndex {
  const byId = new Map(games.map((game) => [game.id, game]));
  const knownTitles = new Set(games.map((game) => normalizeTitle(game.title)));
  const union = new UnionFind();
  for (const game of games) union.add(game.id);

  for (const game of games) {
    const parentId = game.versionParentId ?? game.parentGameId;
    if (parentId && byId.has(parentId)) {
      union.union(game.id, parentId);
    }
  }

  for (const game of games) {
    for (const portId of game.portIds ?? []) {
      if (byId.has(portId)) union.union(game.id, portId);
    }
  }

  for (const game of games) {
    for (const related of game.relatedGames ?? []) {
      if (!byId.has(related.id)) continue;
      if (related.relation !== "remake" && related.relation !== "remaster" && related.relation !== "sequel") {
        continue;
      }
      const peer = byId.get(related.id);
      if (!peer) continue;
      if (normalizeTitle(peer.title) === normalizeTitle(game.title)) {
        union.union(game.id, related.id);
      }
    }
  }

  const byNormalizedTitle = new Map<string, string[]>();
  for (const game of games) {
    const key = normalizeTitle(game.title);
    const bucket = byNormalizedTitle.get(key) ?? [];
    bucket.push(game.id);
    byNormalizedTitle.set(key, bucket);
  }
  for (const ids of byNormalizedTitle.values()) {
    if (ids.length < 2) continue;
    for (let index = 1; index < ids.length; index += 1) {
      union.union(ids[0], ids[index]);
    }
  }

  const byStrippedTitle = new Map<string, string[]>();
  for (const game of games) {
    const stripped = stripConservativeEditionSuffix(game.title, knownTitles);
    const key = normalizeTitle(stripped);
    const bucket = byStrippedTitle.get(key) ?? [];
    bucket.push(game.id);
    byStrippedTitle.set(key, bucket);
  }
  for (const ids of byStrippedTitle.values()) {
    if (ids.length < 2) continue;
    for (let index = 1; index < ids.length; index += 1) {
      union.union(ids[0], ids[index]);
    }
  }

  const components = new Map<string, GroupableGame[]>();
  for (const game of games) {
    const root = union.find(game.id);
    const bucket = components.get(root) ?? [];
    bucket.push(game);
    components.set(root, bucket);
  }

  const canonicalIdByGameId = new Map<string, string>();
  const membersByCanonicalId = new Map<string, GroupableGame[]>();
  for (const members of components.values()) {
    const canonical = pickCanonicalMember(members);
    for (const member of members) canonicalIdByGameId.set(member.id, canonical.id);
    membersByCanonicalId.set(canonical.id, [...members].sort((left, right) => numericId(left.id) - numericId(right.id)));
  }

  return { canonicalIdByGameId, membersByCanonicalId };
}

export function canonicalSearchId(index: SearchGroupingIndex, id: string): string {
  return index.canonicalIdByGameId.get(id) ?? id;
}

export function groupSearchMatches<T extends GroupableGame>(
  matches: readonly T[],
  catalogue: readonly GroupableGame[],
): T[] {
  if (matches.length === 0) return [];
  const index = buildSearchGroupingIndex(catalogue);
  const byId = new Map(catalogue.map((game) => [game.id, game]));
  const seen = new Set<string>();
  const result: T[] = [];
  for (const match of matches) {
    const canonicalId = canonicalSearchId(index, match.id);
    if (seen.has(canonicalId)) continue;
    seen.add(canonicalId);
    const canonical = (byId.get(canonicalId) ?? match) as T;
    result.push(canonical);
  }
  return result;
}

export function listGroupedVariants(
  gameId: string,
  catalogue: readonly GroupableGame[],
): GroupedVariant[] {
  const index = buildSearchGroupingIndex(catalogue);
  const canonicalId = canonicalSearchId(index, gameId);
  const members = index.membersByCanonicalId.get(canonicalId) ?? [];
  return members
    .filter((member) => member.id !== canonicalId)
    .map((member) => ({
      id: member.id,
      title: member.title,
      releaseYear: member.releaseYear,
      platformLabel: platformSummary(member),
    }));
}

export interface IgdbGroupableHit {
  id: string;
  title: string;
  releaseYear?: number;
  rating?: number;
  parentGameId?: string;
  versionParentId?: string;
}

/** Group live IGDB rows without full catalogue context (name + parent fields only). */
export function groupIgdbSearchHits<T extends IgdbGroupableHit>(hits: readonly T[]): T[] {
  if (hits.length === 0) return [];
  const knownTitles = new Set(hits.map((hit) => normalizeTitle(hit.title)));
  const byId = new Map(hits.map((hit) => [hit.id, hit]));
  const union = new UnionFind();
  for (const hit of hits) union.add(hit.id);

  for (const hit of hits) {
    const parentId = hit.versionParentId ?? hit.parentGameId;
    if (parentId && byId.has(parentId)) union.union(hit.id, parentId);
  }

  const byTitle = new Map<string, T[]>();
  for (const hit of hits) {
    const bucket = byTitle.get(normalizeTitle(hit.title)) ?? [];
    bucket.push(hit);
    byTitle.set(normalizeTitle(hit.title), bucket);
  }
  for (const bucket of byTitle.values()) {
    if (bucket.length < 2) continue;
    const byYear = new Map<number | "unknown", T[]>();
    for (const hit of bucket) {
      const yearKey = hit.releaseYear ?? "unknown";
      const yearBucket = byYear.get(yearKey) ?? [];
      yearBucket.push(hit);
      byYear.set(yearKey, yearBucket);
    }
    for (const yearBucket of byYear.values()) {
      if (yearBucket.length < 2) continue;
      for (let index = 1; index < yearBucket.length; index += 1) {
        union.union(yearBucket[0].id, yearBucket[index].id);
      }
    }
  }

  const byStripped = new Map<string, T[]>();
  for (const hit of hits) {
    const stripped = stripConservativeEditionSuffix(hit.title, knownTitles);
    const bucket = byStripped.get(normalizeTitle(stripped)) ?? [];
    bucket.push(hit);
    byStripped.set(normalizeTitle(stripped), bucket);
  }
  for (const bucket of byStripped.values()) {
    if (bucket.length < 2) continue;
    const byYear = new Map<number | "unknown", T[]>();
    for (const hit of bucket) {
      const yearKey = hit.releaseYear ?? "unknown";
      const yearBucket = byYear.get(yearKey) ?? [];
      yearBucket.push(hit);
      byYear.set(yearKey, yearBucket);
    }
    for (const yearBucket of byYear.values()) {
      if (yearBucket.length < 2) continue;
      for (let index = 1; index < yearBucket.length; index += 1) {
        union.union(yearBucket[0].id, yearBucket[index].id);
      }
    }
  }

  const components = new Map<string, T[]>();
  for (const hit of hits) {
    const root = union.find(hit.id);
    const bucket = components.get(root) ?? [];
    bucket.push(hit);
    components.set(root, bucket);
  }

  return [...components.values()].map((members) => pickCanonicalMember(members));
}
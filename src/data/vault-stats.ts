import {
  LIBRARY_STATUSES,
  type LibraryState,
  type LibraryStatus,
} from "../context/library-entry";
import { PLATFORM_FAMILIES, type Platform } from "./platforms";

/** Owned games are everything except the wishlist. Completion is completed / owned. */
export const OWNED_STATUSES: readonly LibraryStatus[] = ["playing", "backlog", "completed", "paused"];

export const RECENT_VAULT_LIMIT = 8;

const PLATFORM_LABELS = new Map<Platform, string>(
  PLATFORM_FAMILIES.flatMap((family) => (family.platform ? [[family.platform, family.label] as const] : [])),
);

export interface VaultCatalogueFacts {
  id: string;
  title: string;
  genres: readonly string[];
  platforms: readonly string[];
}

export interface MixSlice {
  key: string;
  label: string;
  count: number;
  /** Share of matched games that include this label, from 0 to 1. */
  share: number;
}

export interface RecentVaultUpdate {
  gameId: string;
  title: string;
  href: string | null;
  status: LibraryStatus;
  updatedAt: string;
  inCatalogue: boolean;
}

export interface VaultStats {
  total: number;
  owned: number;
  completed: number;
  wishlist: number;
  /** Null when the vault has no owned games. */
  completionRate: number | null;
  statusCounts: Record<LibraryStatus, number>;
  genres: MixSlice[];
  platforms: MixSlice[];
  genreMatched: number;
  platformMatched: number;
  missingFromCatalogue: number;
  recent: RecentVaultUpdate[];
  recentTotal: number;
}

export interface CatalogueLookupGame {
  id: string;
  title: string;
  genres?: readonly string[] | null;
  platforms?: readonly string[] | null;
}

/** Family label used in the rest of the app (PS5 → PlayStation, Switch → Nintendo). */
export function vaultPlatformLabel(platform: string): string {
  return PLATFORM_LABELS.get(platform as Platform) ?? platform;
}

export function vaultCatalogueFacts(game: CatalogueLookupGame | null | undefined): VaultCatalogueFacts | null {
  const title = game?.title?.trim();
  if (!game?.id || !title) return null;
  return {
    id: game.id,
    title,
    genres: game.genres ?? [],
    platforms: (game.platforms ?? []).map(vaultPlatformLabel),
  };
}

export function formatCompletion(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "–";
  return `${Math.round(rate * 100)}%`;
}

export type CompletionPie =
  | { kind: "empty" }
  | { kind: "full" }
  | { kind: "slice"; d: string };

/**
 * Pie geometry for the completion mark. 0% is an empty disc and 100% is a
 * filled disc. A stroked ring stays hollow at 100%, so the full value is not an arc.
 */
export function completionPie(percent: number): CompletionPie {
  if (!Number.isFinite(percent) || percent <= 0) return { kind: "empty" };
  if (percent >= 100) return { kind: "full" };
  const radius = 16;
  const cx = 18;
  const cy = 18;
  const start = -Math.PI / 2;
  const end = start + (percent / 100) * Math.PI * 2;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const large = percent > 50 ? 1 : 0;
  const point = (value: number) => value.toFixed(3);
  return {
    kind: "slice",
    d: `M ${cx} ${cy} L ${point(x1)} ${point(y1)} A ${radius} ${radius} 0 ${large} 1 ${point(x2)} ${point(y2)} Z`,
  };
}

export function formatShare(share: number, count: number): string {
  if (count <= 0 || !Number.isFinite(share)) return "0%";
  const percent = Math.round(share * 100);
  if (percent <= 0) return "<1%";
  if (percent >= 100) return "100%";
  return `${percent}%`;
}

function roundAwayFromZero(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Relative time in the viewer’s locale. Pass `locales` in tests. */
export function formatVaultUpdated(iso: string, now = Date.now(), locales?: Intl.LocalesArgument): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "Unknown date";
  const deltaSeconds = (time - now) / 1000;
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(locales, { numeric: "auto" });
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(roundAwayFromZero(deltaSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(roundAwayFromZero(deltaSeconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(roundAwayFromZero(deltaSeconds / 86400), "day");
  return new Intl.DateTimeFormat(locales, { dateStyle: "medium" }).format(new Date(time));
}

function emptyStatusCounts(): Record<LibraryStatus, number> {
  return {
    playing: 0,
    backlog: 0,
    completed: 0,
    paused: 0,
    wishlist: 0,
  };
}

function tally(values: readonly string[], counts: Map<string, { label: string; count: number }>) {
  const seen = new Set<string>();
  let matched = false;
  for (const raw of values) {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    matched = true;
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { label, count: 1 });
  }
  return matched;
}

function toMix(
  counts: Map<string, { label: string; count: number }>,
  matched: number,
  pinLast?: string,
): MixSlice[] {
  const slices: MixSlice[] = [];
  for (const [key, slice] of counts) {
    slices.push({
      key,
      label: slice.label,
      count: slice.count,
      share: matched === 0 ? 0 : slice.count / matched,
    });
  }
  slices.sort((left, right) => {
    if (pinLast) {
      const pinned = Number(left.key === pinLast) - Number(right.key === pinLast);
      if (pinned !== 0) return pinned;
    }
    return right.count - left.count || left.label.localeCompare(right.label) || left.key.localeCompare(right.key);
  });
  return slices;
}

function updatedTime(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function buildVaultStats(
  entries: LibraryState,
  lookup: (gameId: string) => VaultCatalogueFacts | null,
  recentLimit = RECENT_VAULT_LIMIT,
): VaultStats {
  const statusCounts = emptyStatusCounts();
  const genreCounts = new Map<string, { label: string; count: number }>();
  const platformCounts = new Map<string, { label: string; count: number }>();
  let genreMatched = 0;
  let platformMatched = 0;
  let missingFromCatalogue = 0;
  const recent: RecentVaultUpdate[] = [];

  for (const [gameId, entry] of Object.entries(entries)) {
    if (!gameId || !entry || !LIBRARY_STATUSES.includes(entry.status)) continue;
    statusCounts[entry.status] += 1;
    const facts = lookup(gameId);
    if (!facts) missingFromCatalogue += 1;
    else {
      if (tally(facts.genres, genreCounts)) genreMatched += 1;
      if (tally(facts.platforms, platformCounts)) platformMatched += 1;
    }
    recent.push({
      gameId,
      title: facts?.title || gameId,
      href: facts ? `/game/${facts.id}` : null,
      status: entry.status,
      updatedAt: entry.updatedAt,
      inCatalogue: facts != null,
    });
  }

  recent.sort((left, right) => {
    const byDate = updatedTime(right.updatedAt) - updatedTime(left.updatedAt);
    if (byDate !== 0) return byDate;
    return left.title.localeCompare(right.title) || left.gameId.localeCompare(right.gameId);
  });

  const limit = Number.isFinite(recentLimit) ? Math.max(0, Math.floor(recentLimit)) : RECENT_VAULT_LIMIT;
  const completed = statusCounts.completed;
  const owned = OWNED_STATUSES.reduce((sum, status) => sum + statusCounts[status], 0);

  return {
    total: owned + statusCounts.wishlist,
    owned,
    completed,
    wishlist: statusCounts.wishlist,
    completionRate: owned === 0 ? null : completed / owned,
    statusCounts,
    genres: toMix(genreCounts, genreMatched),
    platforms: toMix(platformCounts, platformMatched, "other"),
    genreMatched,
    platformMatched,
    missingFromCatalogue,
    recent: recent.slice(0, limit),
    recentTotal: recent.length,
  };
}

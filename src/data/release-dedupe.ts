import { igdbPlatformLabel, normalizePlatformLabel } from "./platforms";

export interface DedupeableRelease {
  platform: string;
  date?: string;
  label?: string;
  platformId?: number;
}

function releaseSortKey(release: DedupeableRelease): string {
  return release.date?.trim() ?? release.label?.trim() ?? "9999-99-99";
}

/** One row per specific platform, earliest dated release when IGDB lists several regions. */
export function dedupeReleaseRows<T extends DedupeableRelease>(releases: readonly T[]): T[] {
  const best = new Map<string, T>();
  for (const release of releases) {
    const platform = igdbPlatformLabel(release.platform, release.platformId);
    if (!platform) continue;
    const dateKey = release.date?.trim() ?? "";
    const labelKey = release.label?.trim() ?? "";
    if (!dateKey && !labelKey) continue;
    const key = normalizePlatformLabel(platform);
    if (!key) continue;
    const normalized: T = {
      ...release,
      platform,
    };
    const existing = best.get(key);
    if (!existing) {
      best.set(key, normalized);
      continue;
    }
    if (releaseSortKey(normalized) < releaseSortKey(existing)) {
      best.set(key, normalized);
    }
  }
  return [...best.values()].sort(
    (left, right) =>
      releaseSortKey(left).localeCompare(releaseSortKey(right)) ||
      left.platform.localeCompare(right.platform),
  );
}
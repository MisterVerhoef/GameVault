import { canonicalPlatformVariant, normalizePlatformLabel } from "./platforms";

export interface DedupeableRelease {
  platform: string;
  date?: string;
  label?: string;
}

/** One row per canonical platform name and release day or label. */
export function dedupeReleaseRows<T extends DedupeableRelease>(releases: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const release of releases) {
    const platform = canonicalPlatformVariant(release.platform.trim());
    if (!platform) continue;
    const dateKey = release.date?.trim() ?? "";
    const labelKey = release.label?.trim() ?? "";
    const key = `${normalizePlatformLabel(platform)}|${dateKey || labelKey}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...release,
      platform: release.platform.trim() === platform ? release.platform : platform,
    });
  }
  return result;
}
import { resolveIgdbPlatform, type Platform } from "@/data/platforms";
import type { IgdbLiveGame } from "./types";

function imageUrl(image: { url?: string } | undefined, size = "t_cover_big"): string | undefined {
  const raw = image?.url?.replace(/^\/\//, "https://");
  if (!raw) return undefined;
  return raw.replace(/\/t_[^/]+\//, `/${size}/`);
}

function companies(
  involvedCompanies: { developer?: boolean; publisher?: boolean; company?: { id?: number; name?: string } }[] | undefined,
  role: "developer" | "publisher",
) {
  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];
  for (const entry of involvedCompanies ?? []) {
    if (!entry?.company?.id || !entry.company.name || entry[role] !== true) continue;
    const id = String(entry.company.id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ id, name: entry.company.name });
  }
  return result;
}

function platformReleases(
  dates: { date?: number; human?: string; platform?: { name?: string } }[] | undefined,
) {
  const rows: { platform: string; date?: string; label?: string }[] = [];
  for (const entry of dates ?? []) {
    const rawName = entry?.platform?.name;
    if (typeof rawName !== "string" || !rawName.trim()) continue;
    const platform = resolveIgdbPlatform(rawName).variant || rawName.trim();
    const date = typeof entry.date === "number" && Number.isFinite(entry.date)
      ? new Date(entry.date * 1000).toISOString().slice(0, 10)
      : undefined;
    const label = typeof entry.human === "string" ? entry.human.trim() : "";
    if (!date && !label) continue;
    rows.push({
      platform,
      ...(date ? { date } : {}),
      ...(!date && label ? { label } : {}),
    });
    if (rows.length >= 12) break;
  }
  return rows;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIgdbApiRecord(record: any): IgdbLiveGame | null {
  if (!record?.id || !record?.name) return null;
  const resolvedPlatforms = (record.platforms ?? [])
    .map((platform: { name?: string }) => platform?.name)
    .filter((name: string | undefined): name is string => typeof name === "string" && name.length > 0)
    .map((name: string) => resolveIgdbPlatform(name));
  const platforms = [...new Set(resolvedPlatforms.map((entry: ReturnType<typeof resolveIgdbPlatform>) => entry.family))] as Platform[];
  const platformVariants = [...new Set(resolvedPlatforms.map((entry: ReturnType<typeof resolveIgdbPlatform>) => entry.variant))] as string[];
  if (platforms.length === 0) return null;
  const year = record.first_release_date
    ? new Date(record.first_release_date * 1000).getUTCFullYear()
    : undefined;
  const cover = imageUrl(record.cover);
  return {
    id: String(record.id),
    slug: typeof record.slug === "string" ? record.slug : String(record.id),
    title: record.name,
    summary: typeof record.summary === "string" ? record.summary : undefined,
    description: typeof record.storyline === "string" ? record.storyline : typeof record.summary === "string" ? record.summary : undefined,
    releaseYear: year,
    genres: (record.genres ?? [])
      .map((g: { name?: string }) => g?.name)
      .filter((name: string | undefined): name is string => Boolean(name)),
    themes: (record.themes ?? [])
      .map((t: { name?: string }) => t?.name)
      .filter((name: string | undefined): name is string => Boolean(name)),
    platforms,
    platformVariants,
    developers: companies(record.involved_companies, "developer"),
    publishers: companies(record.involved_companies, "publisher"),
    cover: cover ? { url: cover } : undefined,
    rating: typeof record.rating === "number" ? record.rating : undefined,
    ratingCount: typeof record.rating_count === "number" ? record.rating_count : undefined,
    aggregatedRating: typeof record.aggregated_rating === "number" ? record.aggregated_rating : undefined,
    aggregatedRatingCount: typeof record.aggregated_rating_count === "number" ? record.aggregated_rating_count : undefined,
    releases: platformReleases(record.release_dates),
  };
}

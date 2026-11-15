import { resolveIgdbPlatform } from "@/data/platforms";
import type { IgdbBasicGame } from "./types";

function coverUrl(image: { url?: string } | undefined): { url: string } | undefined {
  const raw = image?.url?.replace(/^\/\//, "https://");
  if (!raw) return undefined;
  const url = raw.replace(/\/t_[^/]+\//, "/t_cover_big/");
  return { url };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIgdbBasicRecord(record: any): IgdbBasicGame | null {
  if (!record?.id || !record?.name) return null;
  const platforms = (record.platforms ?? [])
    .map((platform: { name?: string }) => platform?.name)
    .filter((name: string | undefined): name is string => typeof name === "string" && name.length > 0)
    .map((name: string) => resolveIgdbPlatform(name).variant || name.trim());
  const releaseYear = typeof record.first_release_date === "number" && Number.isFinite(record.first_release_date)
    ? new Date(record.first_release_date * 1000).getUTCFullYear()
    : undefined;
  return {
    id: String(record.id),
    title: record.name,
    ...(coverUrl(record.cover) ? { cover: coverUrl(record.cover) } : {}),
    ...(releaseYear != null ? { releaseYear } : {}),
    ...(platforms.length > 0 ? { platforms } : {}),
  };
}
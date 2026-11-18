import { parsePublisherQueryParam, serializePublisherQueryParam } from "./xbox-deals-normalize";

export interface DealPublisherOption {
  slug: string;
  name: string;
  count: number;
}

function splitPublisherQueryTokens(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function publisherTokensFromQueryParam(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  if (Array.isArray(raw)) return raw.flatMap((item) => splitPublisherQueryTokens(item));
  return splitPublisherQueryTokens(raw);
}

export function parsePublisherStashParam(raw: string | string[] | undefined): string[] {
  return publisherTokensFromQueryParam(raw);
}

export function mergePublisherSlugs(
  ...groups: readonly (readonly string[])[]
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    for (const slug of group) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      merged.push(slug);
    }
  }
  return merged;
}

export function reconcilePublisherQuery(
  raw: string | string[] | undefined,
  options: readonly DealPublisherOption[],
): { slugs: string[]; droppedCount: number } {
  const valid = new Set(options.map((option) => option.slug));
  const tokens = publisherTokensFromQueryParam(raw);
  const slugs = parsePublisherQueryParam(raw, options);
  const droppedCount = tokens.filter((token) => !valid.has(token)).length;
  return { slugs, droppedCount };
}

export function publisherQueryNeedsCleanup(
  raw: string | string[] | undefined,
  options: readonly DealPublisherOption[],
): boolean {
  const tokens = publisherTokensFromQueryParam(raw);
  if (tokens.length === 0) return false;
  const valid = new Set(options.map((option) => option.slug));
  return tokens.some((token) => !valid.has(token));
}

export function dropPublisherSlugsForOptions(
  slugs: readonly string[],
  options: readonly DealPublisherOption[],
): { slugs: string[]; droppedCount: number } {
  const valid = new Set(options.map((option) => option.slug));
  const next = slugs.filter((slug) => valid.has(slug));
  return { slugs: next, droppedCount: slugs.length - next.length };
}

export function formatDroppedFiltersNote(droppedCount: number, platformLabel: string): string {
  if (droppedCount <= 0) return "";
  const noun = droppedCount === 1 ? "filter didn't apply" : "filters didn't apply";
  return `${droppedCount} ${noun} to ${platformLabel}`;
}

export { serializePublisherQueryParam };
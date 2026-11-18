import { parsePublisherQueryParam } from "./xbox-deals-normalize";

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
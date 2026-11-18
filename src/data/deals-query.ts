import type { DealsPlatform } from "./deals-platform";
import {
  type DealPublisherOption,
  mergePublisherSlugs,
  parsePublisherStashParam,
  publisherTokensFromQueryParam,
  reconcilePublisherQuery,
  serializePublisherQueryParam,
} from "./deals-publishers";

export const XBOX_PUBLISHER_STASH_PARAM = "xbox_publisher";
export const PS_PUBLISHER_STASH_PARAM = "ps_publisher";

export interface DealsUrlPublishers {
  publisherSlugs: string[];
  xboxPublisherStash: string[];
  psPublisherStash: string[];
}

export function serializeDealsSearchParams(
  platform: DealsPlatform,
  publishers: DealsUrlPublishers,
  preserve: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preserve)) {
    if (value) params.set(key, value);
  }
  if (platform === "ps") params.set("platform", "ps");
  const publisher = serializePublisherQueryParam(publishers.publisherSlugs);
  if (publisher) params.set("publisher", publisher);
  const xboxStash = serializePublisherQueryParam(publishers.xboxPublisherStash);
  if (xboxStash) params.set(XBOX_PUBLISHER_STASH_PARAM, xboxStash);
  const psStash = serializePublisherQueryParam(publishers.psPublisherStash);
  if (psStash) params.set(PS_PUBLISHER_STASH_PARAM, psStash);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function optionSlugs(options: readonly DealPublisherOption[]): Set<string> {
  return new Set(options.map((option) => option.slug));
}

export function buildPlatformSwitchHref(
  fromPlatform: DealsPlatform,
  toPlatform: DealsPlatform,
  state: DealsUrlPublishers,
  xboxOptions: readonly DealPublisherOption[],
  psOptions: readonly DealPublisherOption[],
  preserve: Record<string, string> = {},
): string {
  if (fromPlatform === toPlatform) {
    return `/deals${serializeDealsSearchParams(toPlatform, state, preserve)}`;
  }
  const xboxValid = optionSlugs(xboxOptions);
  const psValid = optionSlugs(psOptions);

  if (fromPlatform === "xbox" && toPlatform === "ps") {
    const psActive = state.publisherSlugs.filter((slug) => psValid.has(slug));
    const xboxOnly = state.publisherSlugs.filter((slug) => !psValid.has(slug));
    return `/deals${serializeDealsSearchParams("ps", {
      publisherSlugs: psActive,
      xboxPublisherStash: mergePublisherSlugs(state.xboxPublisherStash, xboxOnly),
      psPublisherStash: state.psPublisherStash,
    }, preserve)}`;
  }

  const xboxActive = mergePublisherSlugs(
    state.xboxPublisherStash,
    state.publisherSlugs.filter((slug) => xboxValid.has(slug)),
  );
  const psOnly = state.publisherSlugs.filter((slug) => !xboxValid.has(slug));
  return `/deals${serializeDealsSearchParams("xbox", {
    publisherSlugs: xboxActive,
    xboxPublisherStash: [],
    psPublisherStash: mergePublisherSlugs(state.psPublisherStash, psOnly),
  }, preserve)}`;
}

export function buildCleanPublisherRedirect(
  platform: DealsPlatform,
  params: Record<string, string | string[] | undefined>,
  xboxOptions: readonly DealPublisherOption[],
  psOptions: readonly DealPublisherOption[],
): string | null {
  const activeOptions = platform === "ps" ? psOptions : xboxOptions;
  const valid = optionSlugs(activeOptions);
  const tokens = publisherTokensFromQueryParam(params.publisher);
  const dropped = tokens.filter((token) => !valid.has(token));
  if (dropped.length === 0) return null;

  const active = tokens.filter((token) => valid.has(token));
  const xboxStash = parsePublisherStashParam(params[XBOX_PUBLISHER_STASH_PARAM]);
  const psStash = parsePublisherStashParam(params[PS_PUBLISHER_STASH_PARAM]);
  const preserve: Record<string, string> = {};
  if (platform === "ps" && typeof params.e2e_ps_fixture === "string") {
    preserve.e2e_ps_fixture = params.e2e_ps_fixture;
  }

  const publishers: DealsUrlPublishers = platform === "ps"
    ? {
        publisherSlugs: active,
        xboxPublisherStash: mergePublisherSlugs(xboxStash, dropped),
        psPublisherStash: psStash,
      }
    : {
        publisherSlugs: active,
        xboxPublisherStash: xboxStash,
        psPublisherStash: mergePublisherSlugs(psStash, dropped),
      };

  return `/deals${serializeDealsSearchParams(platform, publishers, preserve)}`;
}

export function readDealsUrlPublishers(
  params: Record<string, string | string[] | undefined>,
  _platform: DealsPlatform,
  activeOptions: readonly DealPublisherOption[],
): DealsUrlPublishers & { droppedCount: number } {
  const { slugs, droppedCount } = reconcilePublisherQuery(params.publisher, activeOptions);
  return {
    publisherSlugs: slugs,
    xboxPublisherStash: parsePublisherStashParam(params[XBOX_PUBLISHER_STASH_PARAM]),
    psPublisherStash: parsePublisherStashParam(params[PS_PUBLISHER_STASH_PARAM]),
    droppedCount,
  };
}
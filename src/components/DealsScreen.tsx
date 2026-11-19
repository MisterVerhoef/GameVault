"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import XboxDealCard from "@/components/XboxDealCard";
import PlayStationDealCard from "@/components/PlayStationDealCard";
import DealsDroppedFiltersNotice from "@/components/DealsDroppedFiltersNotice";
import DealsPlatformTabs from "@/components/DealsPlatformTabs";
import XboxDealsPublisherFilter, { XboxDealsPublisherChips } from "@/components/XboxDealsPublisherFilter";
import { dealsPlatformLabel, type DealsPlatform } from "@/data/deals-platform";
import { serializeDealsSearchParams, type DealsUrlPublishers } from "@/data/deals-query";
import {
  formatDroppedFiltersNote,
  type DealPublisherOption,
} from "@/data/deals-publishers";
import type { PlayStationDeal, PlayStationDealsPayload } from "@/data/playstation-deals-types";
import {
  filterPlayStationDeals,
  filterPlayStationDealsByPublisher,
  hasMultiplePlayStationDealKinds,
  sortPlayStationDeals,
} from "@/data/playstation-deals-normalize";
import type { XboxDeal, XboxDealKindFilter, XboxDealSort, XboxDealsPayload } from "@/data/xbox-deals-types";
import {
  filterXboxDeals,
  filterXboxDealsByPublisher,
  hasMultipleDealKinds,
  readPublisherSlugsFromSearchParams,
  serializePublisherQueryParam,
  sortXboxDeals,
} from "@/data/xbox-deals-normalize";
import { formatAllShown, formatShowingOf } from "@/data/pluralize";

interface DealsScreenProps {
  platform: DealsPlatform;
  xbox: XboxDealsPayload;
  playstation: PlayStationDealsPayload;
  xboxPublisherOptions: DealPublisherOption[];
  psPublisherOptions: DealPublisherOption[];
  urlPublishers: DealsUrlPublishers & { droppedCount: number };
  preserveQuery?: Record<string, string>;
}

const DEALS_PAGE_SIZE = 48;
const NEW_BATCH_EAGER_COVERS = 6;

function formatUpdatedNl(iso: string | undefined | null): string | null {
  if (iso == null) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

const XBOX_SOURCE_LABEL: Record<XboxDealsPayload["source"], string> = {
  "microsoft-reco": "Microsoft Recommendations API",
  "microsoft-apps-store": "Microsoft Store deals collection",
  "microsoft-xbox-deals-js": "Xbox.com deals list",
  "catalogue-cache": "GameVault catalogue cache",
  empty: "Unavailable",
};

function publishersEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function DealsQuerySync({
  publisherOptions,
  onPublisherChange,
}: {
  publisherOptions: readonly DealPublisherOption[];
  onPublisherChange: (slugs: string[]) => void;
}) {
  const params = useSearchParams();
  useEffect(() => {
    onPublisherChange(readPublisherSlugsFromSearchParams(params, publisherOptions));
  }, [params, publisherOptions, onPublisherChange]);
  return null;
}

export default function DealsScreen({
  platform,
  xbox,
  playstation,
  xboxPublisherOptions,
  psPublisherOptions,
  urlPublishers,
  preserveQuery = {},
}: DealsScreenProps) {
  const router = useRouter();
  const payload = platform === "ps" ? playstation : xbox;
  const platformLabel = dealsPlatformLabel(platform);
  const deals = payload.deals;

  const publisherOptions = platform === "ps" ? psPublisherOptions : xboxPublisherOptions;
  const { xboxPublisherStash, psPublisherStash } = urlPublishers;

  const [sort, setSort] = useState<XboxDealSort>("discount-desc");
  const [kind, setKind] = useState<XboxDealKindFilter>("all");
  const [publisherSlugs, setPublisherSlugs] = useState<string[]>(urlPublishers.publisherSlugs);
  const [visibleCount, setVisibleCount] = useState(DEALS_PAGE_SIZE);
  const [loadMoreCount, setLoadMoreCount] = useState(0);
  const [eagerFromIndex, setEagerFromIndex] = useState<number | null>(null);
  const showKindFilters = platform === "ps"
    ? hasMultiplePlayStationDealKinds(playstation.deals)
    : hasMultipleDealKinds(xbox.deals);
  const showPublisherFilter = publisherOptions.length > 1;
  const pendingPublisherQuery = useRef<string | null>(null);

  const syncPublisherFromUrl = useCallback((slugs: string[]) => {
    const pending = pendingPublisherQuery.current;
    if (pending !== null) {
      const fromUrl = serializePublisherQueryParam(slugs) ?? "";
      if (fromUrl !== pending) return;
      pendingPublisherQuery.current = null;
    }
    setPublisherSlugs((current) => (publishersEqual(current, slugs) ? current : slugs));
  }, []);

  const replacePublisherQuery = useCallback((slugs: string[]) => {
    const nextPath = `/deals${serializeDealsSearchParams(platform, {
      publisherSlugs: slugs,
      xboxPublisherStash,
      psPublisherStash,
    }, preserveQuery)}`;
    router.replace(nextPath, { scroll: false });
  }, [platform, preserveQuery, psPublisherStash, router, xboxPublisherStash]);

  const applyPublisherSelection = useCallback((slugs: string[]) => {
    pendingPublisherQuery.current = serializePublisherQueryParam(slugs) ?? "";
    setPublisherSlugs(slugs);
    replacePublisherQuery(slugs);
    setVisibleCount(DEALS_PAGE_SIZE);
    setLoadMoreCount(0);
    setEagerFromIndex(null);
  }, [replacePublisherQuery]);

  const visiblePs = useMemo(
    () => sortPlayStationDeals(
      filterPlayStationDealsByPublisher(filterPlayStationDeals(playstation.deals, kind), publisherSlugs),
      sort,
    ),
    [playstation.deals, kind, publisherSlugs, sort],
  );

  const visibleXbox = useMemo(
    () => sortXboxDeals(
      filterXboxDealsByPublisher(filterXboxDeals(xbox.deals, kind), publisherSlugs),
      sort,
    ),
    [xbox.deals, kind, publisherSlugs, sort],
  );

  const visible = platform === "ps" ? visiblePs : visibleXbox;

  const displayed = visible.slice(0, visibleCount);
  const canLoadMore = visibleCount < visible.length;
  const showAllShownNote =
    !canLoadMore
    && visible.length > 0
    && (loadMoreCount > 0 || visible.length > DEALS_PAGE_SIZE);

  const psUnavailable = platform === "ps" && playstation.status === "unavailable";
  const stashedOtherPlatformCount = platform === "ps"
    ? xboxPublisherStash.length
    : psPublisherStash.length;
  const droppedNote = formatDroppedFiltersNote(
    Math.max(urlPublishers.droppedCount, stashedOtherPlatformCount),
    platformLabel,
  );

  const title = platform === "ps" ? "PlayStation deals" : "Xbox deals";
  const subtitle = platform === "ps"
    ? "Live PlayStation Store NL deals"
    : "Live Microsoft Store NL deals (EUR).";

  const updatedLabel = formatUpdatedNl(
    platform === "ps" && playstation.status === "cached" && playstation.lastUpdated
      ? playstation.lastUpdated
      : payload.updatedAt,
  );

  const emptyMessage = (() => {
    if (psUnavailable) return null;
    if (deals.length === 0) {
      return platform === "ps"
        ? "No PlayStation deals are available right now. Try again later or switch to Xbox."
        : "No Xbox deals are available right now. Try again later.";
    }
    if (visible.length === 0) {
      return "No deals match the current filters. Try clearing the publisher or type filter.";
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <DealsQuerySync publisherOptions={publisherOptions} onPublisherChange={syncPublisherFromUrl} />
      </Suspense>
      <Navbar dealsStorePlatform={platform} />
      <main id="main" className="gv-layout-container py-6 lg:py-10">
        <DealsPlatformTabs
          platform={platform}
          publishers={{
            publisherSlugs,
            xboxPublisherStash,
            psPublisherStash,
          }}
          xboxPublisherOptions={xboxPublisherOptions}
          psPublisherOptions={psPublisherOptions}
          preserveQuery={preserveQuery}
        />

        <header className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {psUnavailable ? (
            <p className="max-w-3xl text-sm text-muted">
              Deals temporarily unavailable
              {updatedLabel || playstation.lastUpdated ? (
                <>
                  , last updated{" "}
                  <time dateTime={playstation.lastUpdated ?? playstation.updatedAt}>
                    {formatUpdatedNl(playstation.lastUpdated ?? playstation.updatedAt) ?? "unknown"}
                  </time>
                </>
              ) : null}
              .
            </p>
          ) : (
            <p className="max-w-3xl text-sm leading-5 text-muted sm:min-h-10">
              {subtitle}
              {updatedLabel ? (
                <>
                  {" · "}
                  Last updated{" "}
                  <time dateTime={payload.updatedAt}>{updatedLabel}</time>
                </>
              ) : null}
              {platform === "xbox" ? (
                <>
                  {" · "}
                  Source: {XBOX_SOURCE_LABEL[xbox.source]}
                  {xbox.error ? ` · ${xbox.error}` : ""}
                </>
              ) : playstation.status === "cached" ? (
                <>
                  {" · "}
                  Cached snapshot
                  {playstation.error ? ` · ${playstation.error}` : ""}
                </>
              ) : null}
            </p>
          )}
        </header>

        {!psUnavailable ? (
          <section aria-label="Deal controls" className="mb-5 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="deals-sort" className="text-xs font-medium uppercase tracking-wide text-muted">
                  Sort
                </label>
                <select
                  id="deals-sort"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as XboxDealSort);
                    setVisibleCount(DEALS_PAGE_SIZE);
                    setLoadMoreCount(0);
                    setEagerFromIndex(null);
                  }}
                  className="min-h-11 rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="discount-desc">Discount (high to low)</option>
                  <option value="price-asc">Price (low to high)</option>
                  <option value="price-desc">Price (high to low)</option>
                  <option value="title-asc">Title (A–Z)</option>
                </select>
              </div>
              {showPublisherFilter ? (
                <XboxDealsPublisherFilter
                  options={publisherOptions}
                  selectedSlugs={publisherSlugs}
                  onChange={applyPublisherSelection}
                />
              ) : null}
              {showKindFilters ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">Type</span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by product type">
                    {([
                      ["all", "All"],
                      ["game", "Games"],
                      ["dlc", "DLC"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        data-deal-kind={value}
                        aria-pressed={kind === value}
                        onClick={() => {
                          setKind(value);
                          setVisibleCount(DEALS_PAGE_SIZE);
                          setLoadMoreCount(0);
                          setEagerFromIndex(null);
                        }}
                        className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          kind === value ? "bg-accent text-white" : "bg-card text-muted hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {visible.length > 0 ? (
                <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
                  {formatShowingOf(displayed.length, visible.length, "deals")}
                </p>
              ) : null}
            </div>
            {showPublisherFilter && publisherSlugs.length > 0 ? (
              <XboxDealsPublisherChips
                options={publisherOptions}
                selectedSlugs={publisherSlugs}
                onChange={applyPublisherSelection}
              />
            ) : null}
          </section>
        ) : null}

        {droppedNote ? <DealsDroppedFiltersNotice message={droppedNote} /> : null}

        {emptyMessage ? (
          <div className="rounded-xl border border-white/10 bg-card p-8 text-center text-sm text-muted">
            {emptyMessage}
          </div>
        ) : psUnavailable ? null : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {platform === "ps"
                ? (displayed as PlayStationDeal[]).map((deal, index) => (
                    <PlayStationDealCard
                      key={deal.productId}
                      deal={deal}
                      coverPriority={
                        eagerFromIndex != null
                        && index >= eagerFromIndex
                        && index < eagerFromIndex + NEW_BATCH_EAGER_COVERS
                          ? "high"
                          : "default"
                      }
                    />
                  ))
                : (displayed as XboxDeal[]).map((deal, index) => (
                    <XboxDealCard
                      key={deal.bigId}
                      deal={deal}
                      coverPriority={
                        eagerFromIndex != null
                        && index >= eagerFromIndex
                        && index < eagerFromIndex + NEW_BATCH_EAGER_COVERS
                          ? "high"
                          : "default"
                      }
                    />
                  ))}
            </div>
            {canLoadMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setEagerFromIndex(visibleCount);
                    setLoadMoreCount((count) => count + 1);
                    setVisibleCount((count) => count + DEALS_PAGE_SIZE);
                  }}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-card px-6 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-card/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Load more
                </button>
              </div>
            ) : showAllShownNote ? (
              <p className="mt-8 text-center text-sm text-muted" aria-live="polite">
                {formatAllShown(visible.length, "deals")}
              </p>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export function XboxDealsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="gv-layout-container py-6 lg:py-10">
        <div className="mb-4 h-11 w-56 animate-pulse rounded-full bg-card" />
        <div className="mb-6 h-10 w-48 animate-pulse rounded-lg bg-card" />
        <div className="mb-5 h-11 w-full max-w-xl animate-pulse rounded-lg bg-card" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      </main>
    </div>
  );
}
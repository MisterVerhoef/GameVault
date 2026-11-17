"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import XboxDealCard from "@/components/XboxDealCard";
import type { XboxDealKindFilter, XboxDealSort, XboxDealsPayload } from "@/data/xbox-deals-types";
import {
  filterXboxDeals,
  filterXboxDealsByPublisher,
  hasMultipleDealKinds,
  listXboxDealPublishers,
  sortXboxDeals,
} from "@/data/xbox-deals-normalize";

interface XboxDealsScreenProps {
  initial: XboxDealsPayload;
}

const DEALS_PAGE_SIZE = 48;

function formatUpdatedNl(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "Unknown";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

const SOURCE_LABEL: Record<XboxDealsPayload["source"], string> = {
  "microsoft-reco": "Microsoft Recommendations API",
  "microsoft-apps-store": "Microsoft Store deals collection",
  "microsoft-xbox-deals-js": "Xbox.com deals list",
  "catalogue-cache": "GameVault catalogue cache",
  empty: "Unavailable",
};

function readPublisherSlug(params: { get(name: string): string | null }, options: ReturnType<typeof listXboxDealPublishers>) {
  const slug = params.get("publisher");
  if (!slug) return null;
  return options.some((option) => option.slug === slug) ? slug : null;
}

export default function XboxDealsScreen({ initial }: XboxDealsScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const publisherOptions = useMemo(() => listXboxDealPublishers(initial.deals), [initial.deals]);
  const [sort, setSort] = useState<XboxDealSort>("discount-desc");
  const [kind, setKind] = useState<XboxDealKindFilter>("all");
  const [publisher, setPublisher] = useState<string | null>(() => readPublisherSlug(params, publisherOptions));
  const [visibleCount, setVisibleCount] = useState(DEALS_PAGE_SIZE);
  const showKindFilters = hasMultipleDealKinds(initial.deals);
  const showPublisherFilter = publisherOptions.length > 1;

  useEffect(() => {
    setPublisher(readPublisherSlug(params, publisherOptions));
  }, [params, publisherOptions]);

  const replaceQuery = useCallback((nextPublisher: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (nextPublisher) next.set("publisher", nextPublisher);
    else next.delete("publisher");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const visible = useMemo(
    () => sortXboxDeals(
      filterXboxDealsByPublisher(filterXboxDeals(initial.deals, kind), publisher),
      sort,
    ),
    [initial.deals, kind, publisher, sort],
  );

  const displayed = visible.slice(0, visibleCount);
  const canLoadMore = visibleCount < visible.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main" className="gv-layout-container py-6 lg:py-10">
        <header className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Xbox deals</h1>
          <p className="max-w-3xl text-sm text-muted">
            Live sale prices from the Microsoft Store (Netherlands, EUR). Last updated{" "}
            <time dateTime={initial.updatedAt}>{formatUpdatedNl(initial.updatedAt)}</time>
            {" · "}
            Source: {SOURCE_LABEL[initial.source]}
            {initial.error ? ` · ${initial.error}` : ""}
          </p>
        </header>

        <section aria-label="Deal controls" className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="xbox-deals-sort" className="text-xs font-medium uppercase tracking-wide text-muted">
              Sort
            </label>
            <select
              id="xbox-deals-sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as XboxDealSort);
                setVisibleCount(DEALS_PAGE_SIZE);
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
            <div className="flex flex-col gap-1">
              <label htmlFor="xbox-deals-publisher" className="text-xs font-medium uppercase tracking-wide text-muted">
                Publisher
              </label>
              <select
                id="xbox-deals-publisher"
                value={publisher ?? ""}
                onChange={(event) => {
                  const next = event.target.value || null;
                  setPublisher(next);
                  replaceQuery(next);
                  setVisibleCount(DEALS_PAGE_SIZE);
                }}
                className="min-h-11 max-w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:max-w-xs"
              >
                <option value="">All publishers</option>
                {publisherOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name} ({option.count})
                  </option>
                ))}
              </select>
            </div>
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
                    data-xbox-deal-kind={value}
                    aria-pressed={kind === value}
                    onClick={() => {
                      setKind(value);
                      setVisibleCount(DEALS_PAGE_SIZE);
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
              Showing {displayed.length} of {visible.length} deals
            </p>
          ) : null}
        </section>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card p-8 text-center text-sm text-muted">
            {initial.deals.length === 0
              ? "No Xbox deals are available right now. Try again later."
              : "No deals match this filter."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {displayed.map((deal) => (
                <XboxDealCard key={deal.bigId} deal={deal} />
              ))}
            </div>
            {canLoadMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + DEALS_PAGE_SIZE)}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-card px-6 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-card/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Load more
                </button>
              </div>
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
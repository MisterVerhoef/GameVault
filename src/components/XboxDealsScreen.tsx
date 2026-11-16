"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import XboxDealCard from "@/components/XboxDealCard";
import type { XboxDealKindFilter, XboxDealSort, XboxDealsPayload } from "@/data/xbox-deals-types";
import { filterXboxDeals, hasMultipleDealKinds, sortXboxDeals } from "@/data/xbox-deals-normalize";

interface XboxDealsScreenProps {
  initial: XboxDealsPayload;
}

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

export default function XboxDealsScreen({ initial }: XboxDealsScreenProps) {
  const [sort, setSort] = useState<XboxDealSort>("discount-desc");
  const [kind, setKind] = useState<XboxDealKindFilter>("all");
  const showKindFilters = hasMultipleDealKinds(initial.deals);

  const visible = useMemo(
    () => sortXboxDeals(filterXboxDeals(initial.deals, kind), sort),
    [initial.deals, kind, sort],
  );

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
              onChange={(event) => setSort(event.target.value as XboxDealSort)}
              className="min-h-11 rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="discount-desc">Discount (high to low)</option>
              <option value="price-asc">Price (low to high)</option>
              <option value="price-desc">Price (high to low)</option>
              <option value="title-asc">Title (A–Z)</option>
            </select>
          </div>
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
                    onClick={() => setKind(value)}
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
          <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
            Showing {visible.length} of {initial.deals.length} deals
          </p>
        </section>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card p-8 text-center text-sm text-muted">
            {initial.deals.length === 0
              ? "No Xbox deals are available right now. Try again later."
              : "No deals match this filter."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visible.map((deal) => (
              <XboxDealCard key={deal.bigId} deal={deal} />
            ))}
          </div>
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
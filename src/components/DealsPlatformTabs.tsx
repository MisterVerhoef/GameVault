import Link from "next/link";
import type { DealsPlatform } from "@/data/deals-platform";

interface DealsPlatformTabsProps {
  platform: DealsPlatform;
  publisherQuery?: string | null;
}

function buildDealsHref(platform: DealsPlatform, publisherQuery?: string | null): string {
  const params = new URLSearchParams();
  if (platform === "ps") params.set("platform", "ps");
  if (publisherQuery) params.set("publisher", publisherQuery);
  const query = params.toString();
  return query ? `/deals?${query}` : "/deals";
}

export default function DealsPlatformTabs({ platform, publisherQuery }: DealsPlatformTabsProps) {
  const tabs: { id: DealsPlatform; label: string }[] = [
    { id: "xbox", label: "Xbox" },
    { id: "ps", label: "PlayStation" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Store platform"
      className="mb-4 inline-flex rounded-full border border-white/10 bg-card p-1"
    >
      {tabs.map((tab) => {
        const selected = platform === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildDealsHref(tab.id, publisherQuery)}
            prefetch={false}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              selected ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
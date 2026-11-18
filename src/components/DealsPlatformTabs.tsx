import Link from "next/link";
import type { DealsPlatform } from "@/data/deals-platform";
import {
  buildPlatformSwitchHref,
  type DealsUrlPublishers,
} from "@/data/deals-query";
import type { DealPublisherOption } from "@/data/deals-publishers";

interface DealsPlatformTabsProps {
  platform: DealsPlatform;
  publishers: DealsUrlPublishers;
  xboxPublisherOptions: readonly DealPublisherOption[];
  psPublisherOptions: readonly DealPublisherOption[];
  preserveQuery?: Record<string, string>;
}

export default function DealsPlatformTabs({
  platform,
  publishers,
  xboxPublisherOptions,
  psPublisherOptions,
  preserveQuery = {},
}: DealsPlatformTabsProps) {
  const platforms: { id: DealsPlatform; label: string }[] = [
    { id: "xbox", label: "Xbox" },
    { id: "ps", label: "PlayStation" },
  ];

  return (
    <div
      data-testid="deals-store-platform"
      className="mb-4 inline-flex rounded-full border border-white/10 bg-card p-1"
      aria-label="Store platform"
    >
      {platforms.map((item) => {
        const selected = platform === item.id;
        const href = buildPlatformSwitchHref(
          platform,
          item.id,
          publishers,
          xboxPublisherOptions,
          psPublisherOptions,
          preserveQuery,
        );
        return (
          <Link
            key={item.id}
            href={href}
            prefetch={false}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              selected ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
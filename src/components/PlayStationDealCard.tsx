import Image from "next/image";
import Link from "next/link";
import { formatEuro } from "@/data/store-offer-index";
import type { PlayStationDeal } from "@/data/playstation-deals-types";
import { ExternalLinkBadge } from "./ExternalLinkBadge";
import { GameCoverPlaceholder } from "./cover-placeholder";

interface PlayStationDealCardProps {
  deal: PlayStationDeal;
  coverPriority?: "default" | "high";
}

export default function PlayStationDealCard({ deal, coverPriority = "default" }: PlayStationDealCardProps) {
  const loadEager = coverPriority === "high";
  const href = deal.gameId ? `/game/${deal.gameId}` : deal.storeUrl;
  const external = !deal.gameId;
  const label = `${deal.title}, ${deal.discountPercent}% off, now ${formatEuro(deal.price)}`;
  const storeLinkLabel = `${deal.title} on PlayStation Store (opens in new tab)`;

  return (
    <article className="flex h-full flex-col rounded-lg bg-card shadow-lg ring-1 ring-black/10 dark:ring-white/10">
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="group relative block aspect-[3/4] overflow-hidden rounded-t-lg bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={external ? storeLinkLabel : `${label}. Open in GameVault`}
      >
        {deal.coverUrl ? (
          <Image
            src={deal.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            unoptimized
            loading={loadEager ? "eager" : "lazy"}
            fetchPriority={loadEager ? "high" : undefined}
            style={loadEager ? { opacity: 0 } : undefined}
            onLoad={
              loadEager
                ? (event) => {
                    event.currentTarget.style.opacity = "1";
                  }
                : undefined
            }
          />
        ) : (
          <GameCoverPlaceholder title={deal.title} className="absolute inset-0" />
        )}
        <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white shadow">
          -{deal.discountPercent}%
        </span>
        {external ? (
          <span className="pointer-events-none absolute bottom-2 left-2">
            <ExternalLinkBadge label="PlayStation Store" />
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{deal.title}</h3>
        <p className="text-sm leading-snug">
          <span className="text-muted-strong line-through decoration-foreground/35">{formatEuro(deal.regularPrice)}</span>{" "}
          <span className="text-base font-semibold text-foreground">{formatEuro(deal.price)}</span>
        </p>
        {deal.psPlusPrice != null ? (
          <p className="text-xs text-muted">
            PS Plus{" "}
            <span className="font-medium text-foreground">{formatEuro(deal.psPlusPrice)}</span>
          </p>
        ) : null}
        {deal.platformTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {deal.platformTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {deal.productKind === "dlc" ? (
          <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted">DLC / add-on</p>
        ) : null}
      </div>
    </article>
  );
}
import Image from "next/image";
import Link from "next/link";
import { formatEuro } from "@/data/store-offer-index";
import { formatSaleEndNl } from "@/data/xbox-deals-normalize";
import type { XboxDeal as XboxDealRow } from "@/data/xbox-deals-types";
import { GameCoverPlaceholder } from "./cover-placeholder";

interface XboxDealCardProps {
  deal: XboxDealRow;
}

export default function XboxDealCard({ deal }: XboxDealCardProps) {
  const href = deal.gameId ? `/game/${deal.gameId}` : deal.storeUrl;
  const external = !deal.gameId;
  const saleEnds = formatSaleEndNl(deal.saleEndsAt);
  const label = `${deal.title}, ${deal.discountPercent}% off, now ${formatEuro(deal.price)}`;

  return (
    <article className="flex h-full flex-col rounded-lg bg-card shadow-lg ring-1 ring-black/10 dark:ring-white/10">
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="group relative block aspect-[3/4] overflow-hidden rounded-t-lg bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={external ? `${label}. Opens Microsoft Store in a new tab` : `${label}. Open in GameVault`}
      >
        {deal.coverUrl ? (
          <Image
            src={deal.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <GameCoverPlaceholder title={deal.title} className="absolute inset-0" />
        )}
        <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white shadow">
          -{deal.discountPercent}%
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{deal.title}</h3>
        <p className="text-sm leading-snug">
          <span className="text-muted-strong line-through decoration-foreground/35">{formatEuro(deal.regularPrice)}</span>{" "}
          <span className="text-base font-semibold text-foreground">{formatEuro(deal.price)}</span>
        </p>
        {saleEnds ? (
          <p className="text-xs text-muted">
            Sale ends <time dateTime={deal.saleEndsAt ?? undefined}>{saleEnds}</time>
          </p>
        ) : null}
        {deal.productKind === "dlc" ? (
          <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted">DLC / add-on</p>
        ) : null}
      </div>
    </article>
  );
}
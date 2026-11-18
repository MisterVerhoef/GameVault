import type { CatalogueCard } from "@/data/catalogue-card";

const LABELS: Record<NonNullable<CatalogueCard["xboxSeriesFeatures"]>[number], string> = {
  "play-anywhere": "Xbox Play Anywhere",
  "cloud-gaming": "Xbox Cloud Gaming",
};

const SHORT: Record<NonNullable<CatalogueCard["xboxSeriesFeatures"]>[number], string> = {
  "play-anywhere": "Play Anywhere",
  "cloud-gaming": "Cloud",
};

export default function XboxSeriesFeatureBadges({
  features,
  className = "left-1.5 top-1.5",
}: {
  features: readonly NonNullable<CatalogueCard["xboxSeriesFeatures"]>[number][];
  className?: string;
}) {
  if (!features?.length) return null;
  return (
    <span className={`absolute z-20 flex max-w-[calc(100%-3rem)] flex-col gap-0.5 ${className}`}>
      {features.map((feature) => (
        <span
          key={feature}
          className="inline-flex items-center gap-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white shadow-sm"
          title={LABELS[feature]}
        >
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#107C10] text-[9px]"
            aria-hidden="true"
          >
            ✓
          </span>
          <span className="truncate" aria-hidden="true">
            {SHORT[feature]}
          </span>
          <span className="sr-only">{LABELS[feature]} supported</span>
        </span>
      ))}
    </span>
  );
}
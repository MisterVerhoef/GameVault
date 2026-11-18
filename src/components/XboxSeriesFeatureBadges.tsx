import type { CatalogueCard } from "@/data/catalogue-card";

type Feature = NonNullable<CatalogueCard["xboxSeriesFeatures"]>[number];

const A11Y_LABELS: Record<Feature, string> = {
  "play-anywhere": "Xbox Play Anywhere, supported",
  "cloud-gaming": "Xbox Cloud Gaming, supported",
};

const TITLE_LABELS: Record<Feature, string> = {
  "play-anywhere": "Xbox Play Anywhere",
  "cloud-gaming": "Xbox Cloud Gaming",
};

function visibleText(feature: Feature, compact: boolean): string | null {
  if (feature === "cloud-gaming") return "Xbox Cloud";
  if (compact) return null;
  return "Anywhere";
}

function FeaturePill({
  feature,
  compact,
}: {
  feature: Feature;
  compact: boolean;
}) {
  const visible = visibleText(feature, compact);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full bg-black/85 text-white shadow-sm ring-1 ring-[#107C10]/50 ${
        visible ? "gap-1 px-1 py-0.5" : "p-0.5"
      }`}
      title={TITLE_LABELS[feature]}
      aria-label={A11Y_LABELS[feature]}
      data-testid={feature === "cloud-gaming" ? "xbox-cloud-pill" : "xbox-play-anywhere-pill"}
    >
      <span
        className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-[#107C10] text-[9px] font-bold leading-none"
        aria-hidden="true"
      >
        ✓
      </span>
      {visible ? (
        <span className="whitespace-nowrap text-[9px] font-semibold leading-none sm:text-[10px]" aria-hidden="true">
          {visible}
        </span>
      ) : null}
    </span>
  );
}

export default function XboxSeriesFeatureBadges({
  features,
  className = "left-1.5 top-1.5",
  compact = true,
}: {
  features: readonly Feature[];
  className?: string;
  /** Narrow rail / row cards: tick-only Play Anywhere, short Xbox Cloud label. */
  compact?: boolean;
}) {
  if (!features?.length) return null;
  return (
    <span className={`pointer-events-none absolute z-20 flex max-w-[58%] flex-col items-start gap-0.5 ${className}`}>
      {features.map((feature) => (
        <FeaturePill key={feature} feature={feature} compact={compact} />
      ))}
    </span>
  );
}
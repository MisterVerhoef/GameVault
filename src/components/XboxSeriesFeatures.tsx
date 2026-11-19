import type { XboxFeatureAvailability, XboxSeriesFeatureStatus } from "@/data/xbox-series-features";

function FeatureRow({
  label,
  availability,
}: {
  label: string;
  availability: XboxFeatureAvailability;
}) {
  if (availability === "unknown") return null;
  const supported = availability === "supported";
  return (
    <li className="flex min-h-11 items-center gap-2 rounded-lg border border-foreground/10 bg-card px-3 py-2 dark:border-transparent dark:bg-white/5">
      <span
        className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          supported
            ? "bg-[#107C10] text-white"
            : "bg-foreground/10 text-muted dark:bg-white/10"
        }`}
        aria-hidden="true"
      >
        {supported ? "✓" : "—"}
      </span>
      <span className={`text-sm font-medium ${supported ? "text-foreground" : "text-muted"}`}>
        {label}
        {!supported ? (
          <span className="sr-only">, not available</span>
        ) : (
          <span className="sr-only">, supported</span>
        )}
      </span>
      {!supported ? (
        <span className="ml-auto text-xs text-muted" aria-hidden="true">
          Not available
        </span>
      ) : null}
    </li>
  );
}

export default function XboxSeriesFeatures({ status }: { status: XboxSeriesFeatureStatus }) {
  const rows = (
    <>
      <FeatureRow label="Xbox Play Anywhere" availability={status.playAnywhere} />
      <FeatureRow label="Xbox Cloud Gaming" availability={status.cloudGaming} />
    </>
  );
  const hasVisible =
    status.playAnywhere !== "unknown" || status.cloudGaming !== "unknown";
  if (!hasVisible) return null;

  return (
    <section
      role="region"
      className="mt-4 rounded-xl bg-card/80 p-4 ring-1 ring-white/10"
      aria-labelledby="xbox-series-features-heading"
    >
      <h3 id="xbox-series-features-heading" className="text-sm font-semibold text-foreground">
        Xbox Series X|S features
      </h3>
      <ul className="mt-3 flex flex-col gap-2 sm:max-w-md">{rows}</ul>
    </section>
  );
}

/** Small visible hint that a control opens an external site in a new tab (icon is decorative). */
export function ExternalLinkBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      data-testid="external-link-indicator"
      className={`inline-flex max-w-full items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-foreground shadow-sm ring-1 ring-black/10 dark:bg-background/80 dark:ring-white/15 ${className}`.trim()}
    >
      <svg
        viewBox="0 0 24 24"
        width={12}
        height={12}
        className="shrink-0 text-muted-strong"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      <span className="truncate">{label}</span>
    </span>
  );
}
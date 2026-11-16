/** Short initials for compact card covers. */
export function coverCardInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const word = words[0];
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word.toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function GameCoverPlaceholder({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-card px-2 text-center text-muted ring-1 ring-black/10 dark:ring-white/10 ${className}`}
      aria-hidden="true"
    >
      <span className="line-clamp-3 text-[10px] font-semibold leading-tight sm:text-xs">
        {coverCardInitials(title)}
      </span>
    </div>
  );
}
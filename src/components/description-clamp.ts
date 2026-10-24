/**
 * Collapsed height is about 25% smaller on desktop and about 50% smaller on mobile,
 * measured in lines of the description as it currently wraps.
 */
export function collapsedLineCount(totalLines: number, desktop: boolean) {
  const ratio = desktop ? 0.75 : 0.5;
  const lines = Math.max(1, totalLines);
  return Math.min(lines, Math.max(1, Math.round(lines * ratio)));
}

/** Studio bios stay full on desktop and collapse to about half on a phone. */
export function visibleLineCount(totalLines: number, desktop: boolean, collapseDesktop = true) {
  const lines = Math.max(1, totalLines);
  if (desktop && !collapseDesktop) return lines;
  return collapsedLineCount(lines, desktop);
}

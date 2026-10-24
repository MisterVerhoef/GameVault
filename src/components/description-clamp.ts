/**
 * Collapsed height is about 25% smaller on desktop and about 50% smaller on mobile,
 * measured in lines of the description as it currently wraps.
 */
export function collapsedLineCount(totalLines: number, desktop: boolean) {
  const ratio = desktop ? 0.75 : 0.5;
  const lines = Math.max(1, totalLines);
  return Math.min(lines, Math.max(1, Math.round(lines * ratio)));
}

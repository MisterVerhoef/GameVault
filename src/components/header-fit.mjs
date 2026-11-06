/** Labeled desktop search (`w-44`) minus the icon button (`w-9`). */
export const DESKTOP_SEARCH_GROWTH = 140;

const SLACK = 8;

/**
 * Collapse the labeled search when the header is short on space. Once
 * collapsed, restore the field only when the row has spare room for it, so
 * the two widths do not flicker.
 *
 * `free` is unused space inside the header row (justify-between surplus).
 * `clusterOverflow` is how far the platform scroller's content sticks out.
 *
 * @param {boolean} compact
 * @param {{ free: number, rowOverflow: number, clusterOverflow: number }} room
 */
export function shouldCompactDesktopSearch(compact, room) {
  const overflowing = room.rowOverflow > SLACK || room.clusterOverflow > SLACK || room.free < -SLACK;
  if (!compact) return overflowing;
  if (overflowing) return true;
  return room.free < DESKTOP_SEARCH_GROWTH + SLACK;
}

/**
 * Hide platform names when the chip row is already overflowing. Restore them
 * only when the header has room for the wider labels, so the chips do not
 * flicker between words and icons.
 *
 * @param {boolean} hidden
 * @param {{ clusterOverflow: number, free: number, labeledWidth: number, iconWidth: number }} room
 */
export function shouldHidePlatformLabels(hidden, room) {
  if (!hidden) return room.clusterOverflow > SLACK;
  const extra = room.labeledWidth - room.iconWidth;
  if (!(extra > 0)) return room.clusterOverflow > SLACK;
  return room.free < extra + SLACK * 2;
}

/**
 * Search field and platform names share one spare-pixel budget. Restoring
 * both in the same pass can overflow a row that had room for only one of them.
 *
 * @param {boolean} compact
 * @param {boolean} labelsHidden
 * @param {{ free: number, rowOverflow: number, clusterOverflow: number, labeledWidth: number, iconWidth: number }} room
 * @returns {{ compact: boolean, hideLabels: boolean }}
 */
export function nextHeaderFit(compact, labelsHidden, room) {
  const overflowing = room.rowOverflow > SLACK || room.clusterOverflow > SLACK || room.free < -SLACK;
  // Collapse the search field before dropping platform names.
  if (overflowing && !compact && !labelsHidden) {
    return { compact: true, hideLabels: false };
  }
  let nextCompact = shouldCompactDesktopSearch(compact, room);
  let hideLabels = shouldHidePlatformLabels(labelsHidden, room);
  const expandingSearch = compact && !nextCompact;
  const showingLabels = labelsHidden && !hideLabels;
  if (expandingSearch && showingLabels) {
    const labelCost = room.labeledWidth - room.iconWidth;
    const canBoth = room.free >= DESKTOP_SEARCH_GROWTH + labelCost + SLACK;
    if (!canBoth) {
      if (labelCost > 0 && room.free >= labelCost + SLACK * 2) nextCompact = true;
      else hideLabels = true;
    }
  }
  return { compact: nextCompact, hideLabels };
}

/**
 * @param {HTMLElement} row
 * @param {HTMLElement | null} cluster
 */
export function measureHeaderFit(row, cluster) {
  const styles = getComputedStyle(row);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
  const pad = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
  let used = 0;
  let visible = 0;
  for (const child of row.children) {
    if (!(child instanceof HTMLElement) || child.getClientRects().length === 0) continue;
    used += child.getBoundingClientRect().width;
    visible += 1;
  }
  const gaps = gap * Math.max(0, visible - 1);
  const clusterVisible = cluster !== null && cluster.getClientRects().length > 0;
  return {
    rowOverflow: row.scrollWidth - row.clientWidth,
    free: row.clientWidth - pad - gaps - used,
    clusterOverflow: clusterVisible ? cluster.scrollWidth - cluster.clientWidth : 0,
  };
}

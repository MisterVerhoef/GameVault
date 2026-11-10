/** One observed Netherlands price: ISO day, then integer euro cents. */
export type PriceHistoryPoint = [string, number];

/** Daily points kept as-is before older days collapse to a month. */
export const PRICE_HISTORY_RECENT_DAYS = 14;

/**
 * Upper bound for one game on one store.
 * The first day, the lowest price, and the latest day are never dropped to meet it.
 */
export const PRICE_HISTORY_MAX_POINTS = 18;

export const LOWEST_RECORDED_NOTE =
  "Lowest recorded is the lowest price GameVault has stored for that store, not an all-time low. It only goes back as far as this catalogue's price history.";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface PricedOfferSnapshot {
  store: string;
  productId: string;
  price: number | null;
  checkedAt: string;
  history?: PriceHistoryPoint[];
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  return new Date(parsed).toISOString().slice(0, 10) === value;
}

export function eurosToCents(amount: number): number | undefined {
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) return undefined;
  return cents;
}

export function formatHistoryDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function shiftIsoDate(isoDate: string, days: number): string {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}

function copyPoint(point: PriceHistoryPoint): PriceHistoryPoint {
  return [point[0], point[1]];
}

/** Drops malformed points. A repeated day keeps the later entry. */
export function normalizePriceHistory(history: unknown): PriceHistoryPoint[] {
  if (!Array.isArray(history)) return [];
  const byDate = new Map<string, number>();
  for (const point of history) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const [date, cents] = point;
    if (typeof date !== "string" || !isIsoDate(date)) continue;
    if (typeof cents !== "number" || !Number.isInteger(cents) || cents < 0) continue;
    byDate.set(date, cents);
  }
  return [...byDate.entries()]
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
    .map((entry) => [entry[0], entry[1]]);
}

function lowestPoint(points: readonly PriceHistoryPoint[]): PriceHistoryPoint | undefined {
  let best: PriceHistoryPoint | undefined;
  for (const point of points) {
    if (!best || point[1] < best[1] || (point[1] === best[1] && point[0] < best[0])) best = point;
  }
  return best;
}

/**
 * Records `priceEuros` on `date`. The same day replaces its previous cents.
 * A missing or negative price leaves the history unchanged.
 */
export function appendDailyPrice(
  history: readonly PriceHistoryPoint[] | undefined,
  date: string,
  priceEuros: number | null,
): PriceHistoryPoint[] {
  const current = normalizePriceHistory(history);
  if (priceEuros == null || !isIsoDate(date)) return current;
  const cents = eurosToCents(priceEuros);
  if (cents === undefined) return current;
  const next = current.filter((point) => point[0] !== date);
  next.push([date, cents]);
  next.sort((left, right) => (left[0] < right[0] ? -1 : 1));
  return next;
}

/**
 * Keeps every day in the recent window, then one point per older month:
 * the lowest price that month, on the earliest day when several days tie.
 * Always keeps the earliest point, the lowest point, and the latest point,
 * then drops the oldest remaining monthly points, then the oldest recent
 * points, until the list is within the cap.
 */
export function prunePriceHistory(
  history: readonly PriceHistoryPoint[] | undefined,
  today: string,
): PriceHistoryPoint[] {
  const points = normalizePriceHistory(history);
  if (points.length === 0 || !isIsoDate(today)) return points.map(copyPoint);

  const earliest = points[0];
  const latest = points[points.length - 1];
  const lowest = lowestPoint(points) ?? latest;
  const recentFrom = shiftIsoDate(today, -(PRICE_HISTORY_RECENT_DAYS - 1));
  const recent: PriceHistoryPoint[] = [];
  const older: PriceHistoryPoint[] = [];
  for (const point of points) {
    if (point[0] < recentFrom) older.push(point);
    else recent.push(point);
  }

  const months = new Map<string, PriceHistoryPoint>();
  for (const point of older) {
    const month = point[0].slice(0, 7);
    const current = months.get(month);
    if (!current || point[1] < current[1] || (point[1] === current[1] && point[0] < current[0])) {
      months.set(month, point);
    }
  }

  const combined = [...months.values(), ...recent]
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0));
  const seen = new Set(combined.map((point) => point[0]));
  for (const anchor of [earliest, lowest, latest]) {
    if (seen.has(anchor[0])) continue;
    combined.push(anchor);
    seen.add(anchor[0]);
  }
  combined.sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0));

  if (combined.length <= PRICE_HISTORY_MAX_POINTS) return combined.map(copyPoint);

  const anchorDates = new Set([earliest[0], lowest[0], latest[0]]);
  const recentDates = new Set(recent.map((point) => point[0]));
  const drop = new Set<string>();
  let overflow = combined.length - PRICE_HISTORY_MAX_POINTS;
  const droppableMonthly = combined.filter((point) => !anchorDates.has(point[0]) && !recentDates.has(point[0]));
  for (const point of droppableMonthly) {
    if (overflow <= 0) break;
    drop.add(point[0]);
    overflow -= 1;
  }
  if (overflow > 0) {
    const droppableRecent = combined.filter((point) => !anchorDates.has(point[0]) && recentDates.has(point[0]));
    for (const point of droppableRecent) {
      if (overflow <= 0) break;
      drop.add(point[0]);
      overflow -= 1;
    }
  }
  return combined.filter((point) => !drop.has(point[0])).map(copyPoint);
}

export function lowestRecorded(
  history: readonly PriceHistoryPoint[] | undefined,
): { cents: number; date: string } | null {
  const best = lowestPoint(normalizePriceHistory(history));
  return best ? { cents: best[1], date: best[0] } : null;
}

/** Percent off the regular price. Any real discount is at least 1%. */
export function discountBadge(price: number | null, regularPrice: number | null): string | null {
  if (typeof price !== "number" || typeof regularPrice !== "number") return null;
  if (!Number.isFinite(price) || !Number.isFinite(regularPrice)) return null;
  if (!(regularPrice > price) || regularPrice <= 0 || price < 0) return null;
  const percent = Math.round(((regularPrice - price) / regularPrice) * 100);
  return `-${percent < 1 ? 1 : percent}%`;
}

/**
 * Carries history for the same product, then records today's observed price.
 * A null price keeps the old points. A new product id starts again.
 * Passing the same snapshot twice does not add a day that was not observed.
 */
export function recordOfferPrices<T extends PricedOfferSnapshot>(
  offers: readonly T[],
  previous: readonly T[] | undefined,
  today: string,
): T[] {
  return offers.map((offer) => {
    const prior = previous?.find((item) => item.store === offer.store);
    const sameProduct = prior != null && prior.productId === offer.productId;
    let history = normalizePriceHistory(sameProduct ? prior?.history : undefined);
    if (typeof offer.price === "number" && isIsoDate(offer.checkedAt)) {
      history = appendDailyPrice(history, offer.checkedAt, offer.price);
    }
    history = prunePriceHistory(history, today);
    if (history.length === 0) {
      if (offer.history === undefined) return offer;
      const rest = { ...offer };
      delete rest.history;
      return rest;
    }
    return { ...offer, history };
  });
}

/**
 * Records a price only for a matched attempt. A failed or missed attempt is
 * returned unchanged, so a feed failure cannot replace the stored history.
 */
export function recordAttemptPrices<T extends PricedOfferSnapshot, A extends { status: string; offer?: T }>(
  previous: readonly T[] | undefined,
  attempts: Partial<Record<string, A>>,
  today: string,
): Partial<Record<string, A>> {
  const next: Partial<Record<string, A>> = {};
  for (const [store, attempt] of Object.entries(attempts)) {
    if (!attempt) continue;
    if (attempt.status === "matched" && attempt.offer) {
      const [offer] = recordOfferPrices([attempt.offer], previous, today);
      next[store] = { ...attempt, offer };
    } else {
      next[store] = attempt;
    }
  }
  return next;
}

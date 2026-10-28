import { formatReleaseDay } from "./game-facts";

/** Monday-first labels. The rest of the interface is English. */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type CalendarView = "month" | "week";
export type CalendarScope = "all" | "wishlist";

export interface DatedRelease {
  platform: string;
  date: string;
}

/** Slim row stored in `public/catalog/release-dates.json`. */
export interface ReleaseDateRecord {
  id: string;
  /** Earliest platform day, YYYY-MM-DD. Omitted when IGDB only has a label. */
  date?: string;
  /** Quarter, year, or TBD label when no platform has a real day. */
  label?: string;
  releases?: DatedRelease[];
}

export interface CalendarSourceGame {
  id: string;
  title: string;
  cover?: string;
  releaseYear?: number;
  platforms?: readonly string[];
}

export interface CalendarEntry {
  id: string;
  title: string;
  /** Missing when the wishlist id is not in the catalogue. */
  href?: string;
  cover?: string;
  date?: string;
  label?: string;
  year?: number;
  wishlist: boolean;
  /** Platforms that release on `date`, or the catalogue platforms when there is no day. */
  platforms: string[];
  /** Later platform days. The calendar plots the earliest day only. */
  later: DatedRelease[];
  missing: boolean;
}

export interface CalendarDayModel {
  date: string;
  /** False for the leading and trailing days that complete a month grid. */
  inMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
}

export interface UndatedGroup {
  /** Catalogue release year. Zero means a label with no year. */
  year: number;
  entries: CalendarEntry[];
}

export interface ReleaseCalendarModel {
  view: CalendarView;
  scope: CalendarScope;
  cursor: string;
  periodLabel: string;
  days: CalendarDayModel[];
  wishlistOutside: CalendarEntry[];
  undatedGroups: UndatedGroup[];
  datedGameCount: number;
  yearOnlyCount: number;
  missingDateCount: number;
  catalogueCount: number;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatIsoDay(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDay(value: string): { year: number; month: number; day: number } | null {
  const match = ISO_DAY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && parseIsoDay(value) !== null;
}

/** Local calendar day. Used for "today" in the browser, not for catalogue timestamps. */
export function localIsoDay(now = new Date()) {
  return formatIsoDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(iso: string, delta: number): string | null {
  const parsed = parseIsoDay(iso);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + delta));
  return formatIsoDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Moves by calendar months and lands on the first of the target month. */
export function addMonths(iso: string, delta: number): string | null {
  const parsed = parseIsoDay(iso);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1));
  return formatIsoDay(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

/** Monday of the week that contains `iso`. */
export function startOfWeek(iso: string): string | null {
  const parsed = parseIsoDay(iso);
  if (!parsed) return null;
  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(iso, delta);
}

export function formatMonthLabel(iso: string) {
  const parsed = parseIsoDay(iso);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)));
}

export function monthGrid(cursor: string): { date: string; inMonth: boolean }[] | null {
  const parsed = parseIsoDay(cursor);
  if (!parsed) return null;
  const first = formatIsoDay(parsed.year, parsed.month, 1);
  const start = startOfWeek(first);
  if (!start) return null;
  const lastDay = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate();
  const last = formatIsoDay(parsed.year, parsed.month, lastDay);
  const days: { date: string; inMonth: boolean }[] = [];
  let current = start;
  while (days.length < 42) {
    const day = parseIsoDay(current);
    if (!day) return null;
    days.push({
      date: current,
      inMonth: day.year === parsed.year && day.month === parsed.month,
    });
    if (days.length % 7 === 0 && current >= last) break;
    const next = addDays(current, 1);
    if (!next) return null;
    current = next;
  }
  return days;
}

export function weekGrid(cursor: string): { date: string; inMonth: boolean }[] | null {
  const start = startOfWeek(cursor);
  if (!start) return null;
  const days: { date: string; inMonth: boolean }[] = [];
  let current = start;
  for (let index = 0; index < 7; index += 1) {
    days.push({ date: current, inMonth: true });
    if (index === 6) break;
    const next = addDays(current, 1);
    if (!next) return null;
    current = next;
  }
  return days;
}

export function shiftCursor(cursor: string, view: CalendarView, delta: number): string | null {
  if (view === "week") {
    const start = startOfWeek(cursor);
    if (!start) return null;
    return addDays(start, delta * 7);
  }
  return addMonths(cursor, delta);
}

export function calendarHref(input: {
  view?: CalendarView;
  date?: string | null;
  scope?: CalendarScope;
}) {
  const params = new URLSearchParams();
  if (input.view === "week") params.set("view", "week");
  if (input.date) params.set("date", input.date);
  if (input.scope === "wishlist") params.set("scope", "wishlist");
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

export function parseCalendarQuery(params: {
  view?: string | null;
  date?: string | null;
  scope?: string | null;
}) {
  return {
    view: params.view === "week" ? "week" as const : "month" as const,
    scope: params.scope === "wishlist" ? "wishlist" as const : "all" as const,
    date: params.date && isIsoDay(params.date) ? params.date : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Earliest real day across platforms. A label is kept only when no platform
 * has a YYYY-MM-DD date. Invalid days are ignored.
 */
export function toReleaseDateRecord(game: {
  id?: string;
  releases?: { platform?: string; date?: string; label?: string }[];
}): ReleaseDateRecord | null {
  if (!game.id) return null;
  const best = new Map<string, DatedRelease>();
  let label = "";
  for (const release of game.releases ?? []) {
    if (!label && typeof release.label === "string" && release.label.trim()) {
      label = release.label.trim().slice(0, 40);
    }
    const platform = typeof release.platform === "string" ? release.platform.trim() : "";
    if (!platform || !isIsoDay(release.date)) continue;
    const key = platform.toLowerCase();
    const current = best.get(key);
    if (!current || release.date < current.date) best.set(key, { platform, date: release.date });
  }
  if (best.size === 0) return label ? { id: game.id, label } : null;
  const releases = [...best.values()].sort(
    (left, right) => left.date.localeCompare(right.date) || left.platform.localeCompare(right.platform),
  );
  return { id: game.id, date: releases[0].date, releases };
}

export function readReleaseDateIndex(value: unknown): ReleaseDateRecord[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.games)) return [];
  const records: ReleaseDateRecord[] = [];
  for (const entry of value.games) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id) continue;
    const releases = Array.isArray(entry.releases)
      ? entry.releases.flatMap((release) => {
        if (!isRecord(release) || typeof release.platform !== "string" || typeof release.date !== "string") return [];
        return [{ platform: release.platform, date: release.date }];
      })
      : [];
    const record = toReleaseDateRecord({
      id: entry.id,
      releases: releases.length > 0
        ? releases
        : isIsoDay(entry.date)
          ? [{ platform: "Release", date: entry.date }]
          : [],
    });
    if (record) {
      records.push(record);
      continue;
    }
    if (typeof entry.label === "string" && entry.label.trim()) {
      records.push({ id: entry.id, label: entry.label.trim().slice(0, 40) });
    }
  }
  return records;
}

export function entryDateLabel(entry: { date?: string; label?: string; year?: number }) {
  if (entry.date) return formatReleaseDay(entry.date);
  if (entry.label) return entry.label;
  if (entry.year != null) return String(entry.year);
  return "No date in the catalogue";
}

export function laterReleaseLabel(later: readonly DatedRelease[]) {
  if (later.length === 0) return "";
  const parts = later.map((item) => `${item.platform} ${formatReleaseDay(item.date)}`);
  return `Also ${parts.join(", ")}`;
}

function compareEntries(left: CalendarEntry, right: CalendarEntry) {
  if (left.wishlist !== right.wishlist) return left.wishlist ? -1 : 1;
  return left.title.localeCompare(right.title);
}

function compareWishlistOutside(left: CalendarEntry, right: CalendarEntry) {
  if (left.date && right.date && left.date !== right.date) return left.date.localeCompare(right.date);
  if (left.date && !right.date) return -1;
  if (!left.date && right.date) return 1;
  return left.title.localeCompare(right.title);
}

function toEntry(game: CalendarSourceGame, record: ReleaseDateRecord | undefined, wishlist: boolean): CalendarEntry {
  const onDay = (record?.releases ?? []).filter((release) => release.date === record?.date);
  const later = (record?.releases ?? []).filter((release) => record?.date && release.date !== record.date);
  return {
    id: game.id,
    title: game.title,
    href: `/game/${game.id}`,
    cover: game.cover,
    date: record?.date,
    label: record?.label,
    year: game.releaseYear,
    wishlist,
    platforms: onDay.length > 0 ? onDay.map((release) => release.platform) : [...(game.platforms ?? [])],
    later,
    missing: false,
  };
}

export function buildReleaseCalendar(input: {
  games: readonly CalendarSourceGame[];
  dates: readonly ReleaseDateRecord[];
  wishlistIds: ReadonlySet<string>;
  cursor: string;
  view: CalendarView;
  scope: CalendarScope;
  /** Empty until the browser clock is known. Year-only groups wait for it. */
  today: string;
}): ReleaseCalendarModel | null {
  const grid = input.view === "week" ? weekGrid(input.cursor) : monthGrid(input.cursor);
  if (!grid) return null;

  const datesById = new Map<string, ReleaseDateRecord>();
  for (const record of input.dates) {
    if (!datesById.has(record.id)) datesById.set(record.id, record);
  }

  let datedGameCount = 0;
  let yearOnlyCount = 0;
  let missingDateCount = 0;
  const entryById = new Map<string, CalendarEntry>();

  for (const game of input.games) {
    const record = datesById.get(game.id);
    if (record?.date) datedGameCount += 1;
    else if (game.releaseYear != null) yearOnlyCount += 1;
    else missingDateCount += 1;
    entryById.set(game.id, toEntry(game, record, input.wishlistIds.has(game.id)));
  }

  for (const id of input.wishlistIds) {
    if (entryById.has(id)) continue;
    entryById.set(id, {
      id,
      title: id,
      wishlist: true,
      platforms: [],
      later: [],
      missing: true,
    });
  }

  const visibleDates = new Set(
    grid.filter((day) => input.view === "week" || day.inMonth).map((day) => day.date),
  );
  const byDate = new Map<string, CalendarEntry[]>();
  for (const entry of entryById.values()) {
    if (!entry.date || !visibleDates.has(entry.date)) continue;
    if (input.scope === "wishlist" && !entry.wishlist) continue;
    const list = byDate.get(entry.date);
    if (list) list.push(entry);
    else byDate.set(entry.date, [entry]);
  }
  for (const list of byDate.values()) list.sort(compareEntries);

  const days: CalendarDayModel[] = grid.map((day) => ({
    date: day.date,
    inMonth: day.inMonth,
    isToday: input.today !== "" && day.date === input.today,
    entries: input.view === "month" && !day.inMonth ? [] : byDate.get(day.date) ?? [],
  }));

  const shown = new Set(days.flatMap((day) => day.entries.map((entry) => entry.id)));
  const wishlistOutside = [...entryById.values()]
    .filter((entry) => entry.wishlist && !shown.has(entry.id))
    .sort(compareWishlistOutside);

  const todayYear = input.today ? parseIsoDay(input.today)?.year : undefined;
  const undatedByYear = new Map<number, CalendarEntry[]>();
  if (input.scope === "all" && todayYear != null) {
    for (const entry of entryById.values()) {
      if (entry.date || entry.missing || entry.wishlist) continue;
      if (entry.year == null) {
        if (!entry.label) continue;
      } else if (entry.year < todayYear) {
        continue;
      }
      const year = entry.year ?? 0;
      const list = undatedByYear.get(year);
      if (list) list.push(entry);
      else undatedByYear.set(year, [entry]);
    }
  }
  const undatedGroups = [...undatedByYear.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, entries]) => ({
      year,
      entries: entries.sort((left, right) => left.title.localeCompare(right.title)),
    }));

  const anchor = days.find((day) => day.inMonth) ?? days[0];
  const periodLabel = input.view === "month"
    ? formatMonthLabel(anchor.date)
    : `${formatReleaseDay(days[0].date)} – ${formatReleaseDay(days[days.length - 1].date)}`;

  return {
    view: input.view,
    scope: input.scope,
    cursor: input.cursor,
    periodLabel,
    days,
    wishlistOutside,
    undatedGroups,
    datedGameCount,
    yearOnlyCount,
    missingDateCount,
    catalogueCount: input.games.length,
  };
}

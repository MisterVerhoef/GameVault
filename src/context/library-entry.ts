export type LibraryStatus = "backlog" | "playing" | "completed" | "paused" | "wishlist";

/** Same order as the library menu counts. */
export const LIBRARY_STATUSES: readonly LibraryStatus[] = [
  "playing",
  "backlog",
  "completed",
  "paused",
  "wishlist",
];

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  playing: "Playing",
  backlog: "Backlog",
  completed: "Completed",
  paused: "Paused",
  wishlist: "Wishlist",
};

export const LIBRARY_NOTE_LIMIT = 500;
export const PERSONAL_RATING_MAX = 5;

export interface LibraryEntry {
  status: LibraryStatus;
  progress: number;
  /** Personal score from 1 to 5. Omitted when the game is unrated. */
  rating?: number;
  /** Short free-text note. Omitted when blank. */
  notes?: string;
  updatedAt: string;
}

export type LibraryState = Record<string, LibraryEntry>;

export function isLibraryStatus(value: unknown): value is LibraryStatus {
  return typeof value === "string" && (LIBRARY_STATUSES as readonly string[]).includes(value);
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function clampProgress(value: unknown): number {
  const progress = finiteNumber(value);
  if (progress == null) return 0;
  return Math.max(0, Math.min(100, progress));
}

/** Personal stars are 1–5. Anything else is treated as unrated. */
export function clampPersonalRating(value: unknown): number | undefined {
  const rating = finiteNumber(value);
  if (rating == null) return undefined;
  const rounded = Math.round(rating);
  if (rounded < 1 || rounded > PERSONAL_RATING_MAX) return undefined;
  return rounded;
}

export function normalizeLibraryEntry(raw: unknown): LibraryEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (!isLibraryStatus(value.status)) return null;

  const entry: LibraryEntry = {
    status: value.status,
    progress: clampProgress(value.progress),
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString(),
  };

  const rating = clampPersonalRating(value.rating);
  if (rating) entry.rating = rating;

  if (typeof value.notes === "string") {
    const notes = value.notes.slice(0, LIBRARY_NOTE_LIMIT);
    if (notes.trim()) entry.notes = notes;
  }

  return entry;
}

export function normalizeLibraryState(raw: unknown): LibraryState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next: LibraryState = {};
  for (const [gameId, entry] of Object.entries(raw)) {
    if (!gameId) continue;
    const normalized = normalizeLibraryEntry(entry);
    if (normalized) next[gameId] = normalized;
  }
  return next;
}

/** Apply one library edit without dropping rating, notes, or progress. */
export function updateLibraryEntry(
  previous: LibraryEntry | undefined,
  patch: {
    status?: LibraryStatus;
    progress?: number;
    rating?: number | null;
    notes?: string;
  },
  updatedAt = new Date().toISOString(),
): LibraryEntry | null {
  const hasEdit = patch.status != null || patch.progress != null || patch.rating != null || (patch.notes != null && patch.notes.trim() !== "");
  if (!previous && !hasEdit) return null;

  const base: LibraryEntry = previous ?? { status: "backlog", progress: 0, updatedAt };
  const rating = patch.rating === undefined
    ? base.rating
    : patch.rating === null
      ? undefined
      : clampPersonalRating(patch.rating) ?? base.rating;

  return normalizeLibraryEntry({
    status: patch.status ?? base.status,
    progress: patch.progress ?? base.progress,
    rating,
    notes: patch.notes === undefined ? base.notes : patch.notes,
    updatedAt,
  });
}

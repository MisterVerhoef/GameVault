"use client";

import StarRating from "@/components/StarRating";
import {
  LIBRARY_NOTE_LIMIT,
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  useLibrary,
  type LibraryStatus,
} from "@/context/LibraryContext";

export default function LibraryControls({ gameId }: { gameId: string }) {
  const { entries, setStatus, setProgress, setRating, setNotes } = useLibrary();
  const entry = entries[gameId];
  const notes = entry?.notes ?? "";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`library-status-${gameId}`} className="sr-only">Library status</label>
        <select
          id={`library-status-${gameId}`}
          value={entry?.status ?? ""}
          onChange={(event) => {
            const value = event.target.value as LibraryStatus | "";
            if (value) setStatus(gameId, value);
            else setStatus(gameId, null);
          }}
          className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-foreground"
        >
          <option value="">Not in library</option>
          {LIBRARY_STATUSES.map((status) => (
            <option key={status} value={status}>{LIBRARY_STATUS_LABELS[status]}</option>
          ))}
        </select>
        {entry && (
          <label className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs text-muted">
            Progress
            <input
              type="range"
              min="0"
              max="100"
              value={entry.progress}
              onChange={(event) => setProgress(gameId, Number(event.target.value))}
              aria-label={`Progress for ${gameId}`}
            />
            <span>{entry.progress}%</span>
          </label>
        )}
      </div>
      {entry && (
        <div className="w-full max-w-xl basis-full rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">In your vault</p>
          <StarRating value={entry.rating} onChange={(rating) => setRating(gameId, rating)} />
          <label htmlFor={`library-notes-${gameId}`} className="mt-3 block text-xs font-medium text-muted">
            Notes
          </label>
          <textarea
            id={`library-notes-${gameId}`}
            value={notes}
            maxLength={LIBRARY_NOTE_LIMIT}
            rows={3}
            placeholder="A short note about this game"
            aria-describedby={`library-notes-count-${gameId}`}
            onChange={(event) => setNotes(gameId, event.target.value)}
            className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p id={`library-notes-count-${gameId}`} className="mt-1 text-right text-[11px] text-muted">
            {notes.length}/{LIBRARY_NOTE_LIMIT}
          </p>
        </div>
      )}
    </>
  );
}

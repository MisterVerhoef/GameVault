"use client";

import { useLibrary, type LibraryStatus } from "@/context/LibraryContext";

export default function LibraryControls({ gameId }: { gameId: string }) {
  const { entries, setStatus, setProgress } = useLibrary();
  const entry = entries[gameId];

  return (
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
        <option value="playing">Playing</option>
        <option value="backlog">Backlog</option>
        <option value="completed">Completed</option>
        <option value="paused">Paused</option>
        <option value="wishlist">Wishlist</option>
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
  );
}

"use client";

import { useRef, useState } from "react";
import { useLibrary, type LibraryStatus } from "@/context/LibraryContext";

const statuses: LibraryStatus[] = ["playing", "backlog", "completed", "paused", "wishlist"];

export default function LibraryToolbar() {
  const { entries, setStatus, exportLibrary, importLibrary } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const counts = statuses.map((status) => [status, Object.values(entries).filter((entry) => entry.status === status).length] as const);
  const saved = Object.entries(entries);

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-foreground">My library</h2>
      <p className="mt-1 text-xs text-muted">Stored locally in this browser. Export to move it between devices.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {counts.map(([status, count]) => (
          <span key={status} className="rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize text-muted">
            {status}: {count}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportLibrary}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted hover:text-foreground"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted hover:text-foreground"
        >
          Import
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await importLibrary(file);
              setMessage("Library imported.");
            } catch {
              setMessage("Import failed: unsupported file.");
            }
            event.target.value = "";
          }}
        />
      </div>
      {message && (
        <p className="mt-2 text-xs text-muted" role="status">
          {message}
        </p>
      )}
      {saved.length > 0 && (
        <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {saved.map(([gameId, entry]) => (
            <button
              key={gameId}
              type="button"
              onClick={() => setStatus(gameId, null)}
              className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent hover:bg-accent/25"
            >
              Remove {gameId} ({entry.status})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

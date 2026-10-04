"use client";

import { useRef, useState } from "react";
import { useLibrary, type LibraryStatus } from "@/context/LibraryContext";

const statuses: LibraryStatus[] = ["playing", "backlog", "completed", "paused", "wishlist"];

export default function LibraryToolbar() {
  const { entries, setStatus, exportLibrary, importLibrary } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const counts = statuses.map((status) => [status, Object.values(entries).filter((entry) => entry.status === status).length] as const);

  return (
    <section className="mx-auto mb-8 max-w-[1920px] px-4 sm:px-6 lg:px-8" aria-label="Personal library">
      <div className="rounded-xl border border-white/10 bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">My library</h2>
            <p className="mt-1 text-xs text-muted">Stored locally in this browser. Export to move it between devices.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {counts.map(([status, count]) => (
              <span key={status} className="rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize text-muted">{status}: {count}</span>
            ))}
            <button onClick={exportLibrary} className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted hover:text-foreground">Export</button>
            <button onClick={() => inputRef.current?.click()} className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted hover:text-foreground">Import</button>
            <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try { await importLibrary(file); setMessage("Library imported."); } catch { setMessage("Import failed: unsupported file."); }
              event.target.value = "";
            }} />
          </div>
        </div>
        {message && <p className="mt-2 text-xs text-muted" role="status">{message}</p>}
      </div>
      {Object.keys(entries).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(entries).map(([gameId, entry]) => (
            <button key={gameId} onClick={() => setStatus(gameId, null)} className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent hover:bg-accent/25">
              Remove {gameId} ({entry.status})
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

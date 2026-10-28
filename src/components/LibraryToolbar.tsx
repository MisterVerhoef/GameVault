"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LIBRARY_STATUSES, LIBRARY_STATUS_LABELS, useLibrary } from "@/context/LibraryContext";

export default function LibraryToolbar({ onNavigate }: { onNavigate?: () => void }) {
  const { entries, setStatus, exportLibrary, importLibrary } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const counts = LIBRARY_STATUSES.map((status) => [status, Object.values(entries).filter((entry) => entry.status === status).length] as const);
  const saved = Object.entries(entries);

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-foreground">My library</h2>
      <p className="mt-1 text-xs text-muted">Stored locally in this browser. Export to move it between devices.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/vault"
          onClick={onNavigate}
          className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-white transition hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Open my vault
        </Link>
        <Link
          href="/calendar"
          onClick={onNavigate}
          className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Release calendar
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {counts.map(([status, count]) => (
          <Link
            key={status}
            href={`/vault?status=${status}`}
            onClick={onNavigate}
            className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {LIBRARY_STATUS_LABELS[status]}: {count}
          </Link>
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

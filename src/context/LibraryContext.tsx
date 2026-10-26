"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  normalizeLibraryState,
  updateLibraryEntry,
  type LibraryState,
  type LibraryStatus,
} from "./library-entry";

export type { LibraryEntry, LibraryState, LibraryStatus } from "./library-entry";
export {
  isLibraryStatus,
  LIBRARY_NOTE_LIMIT,
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  PERSONAL_RATING_MAX,
} from "./library-entry";

interface LibraryContextValue {
  entries: LibraryState;
  /** False until the browser library has been read. */
  ready: boolean;
  setStatus: (gameId: string, status: LibraryStatus | null) => void;
  setProgress: (gameId: string, progress: number) => void;
  setRating: (gameId: string, rating: number | null) => void;
  setNotes: (gameId: string, notes: string) => void;
  exportLibrary: () => void;
  importLibrary: (file: File) => Promise<void>;
}

const STORAGE_KEY = "gamevault.library.v1";
const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LibraryState>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        // Library state is browser-owned and must load after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEntries(normalizeLibraryState(JSON.parse(saved)));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, ready]);

  const value = useMemo<LibraryContextValue>(() => ({
    entries,
    ready,
    setStatus: (gameId, status) => setEntries((current) => {
      const next = { ...current };
      if (status) {
        const entry = updateLibraryEntry(next[gameId], { status });
        if (entry) next[gameId] = entry;
      } else {
        delete next[gameId];
      }
      return next;
    }),
    setProgress: (gameId, progress) => setEntries((current) => {
      const entry = updateLibraryEntry(current[gameId], { progress });
      if (!entry) return current;
      return { ...current, [gameId]: entry };
    }),
    setRating: (gameId, rating) => setEntries((current) => {
      const entry = updateLibraryEntry(current[gameId], { rating });
      if (!entry) return current;
      return { ...current, [gameId]: entry };
    }),
    setNotes: (gameId, notes) => setEntries((current) => {
      const entry = updateLibraryEntry(current[gameId], { notes });
      if (!entry) return current;
      return { ...current, [gameId]: entry };
    }),
    exportLibrary: () => {
      const blob = new Blob([JSON.stringify({ schemaVersion: 1, entries }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gamevault-library.json";
      link.click();
      URL.revokeObjectURL(url);
    },
    importLibrary: async (file) => {
      const imported = JSON.parse(await file.text()) as { schemaVersion?: number; entries?: unknown };
      if (imported.schemaVersion !== 1 || !imported.entries || typeof imported.entries !== "object" || Array.isArray(imported.entries)) {
        throw new Error("Unsupported library export.");
      }
      setEntries(normalizeLibraryState(imported.entries));
    },
  }), [entries, ready]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used within LibraryProvider");
  return context;
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LibraryStatus = "backlog" | "playing" | "completed" | "paused" | "wishlist";

export interface LibraryEntry {
  status: LibraryStatus;
  progress: number;
  updatedAt: string;
}

type LibraryState = Record<string, LibraryEntry>;
interface LibraryContextValue {
  entries: LibraryState;
  setStatus: (gameId: string, status: LibraryStatus | null) => void;
  setProgress: (gameId: string, progress: number) => void;
  exportLibrary: () => void;
  importLibrary: (file: File) => Promise<void>;
}

const STORAGE_KEY = "gamevault.library.v1";
const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LibraryState>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      // Library state is browser-owned and must load after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries(JSON.parse(saved) as LibraryState);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const value = useMemo<LibraryContextValue>(() => ({
    entries,
    setStatus: (gameId, status) => setEntries((current) => {
      const next = { ...current };
      if (status) next[gameId] = { ...(next[gameId] ?? { progress: 0 }), status, updatedAt: new Date().toISOString() };
      else delete next[gameId];
      return next;
    }),
    setProgress: (gameId, progress) => setEntries((current) => ({
      ...current,
      [gameId]: { ...(current[gameId] ?? { status: "backlog" }), progress: Math.max(0, Math.min(100, progress)), updatedAt: new Date().toISOString() },
    })),
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
      const imported = JSON.parse(await file.text()) as { schemaVersion?: number; entries?: LibraryState };
      if (imported.schemaVersion !== 1 || !imported.entries || typeof imported.entries !== "object") {
        throw new Error("Unsupported library export.");
      }
      setEntries(imported.entries);
    },
  }), [entries]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used within LibraryProvider");
  return context;
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addGameToList,
  createList,
  deleteList,
  normalizeListsState,
  removeGameFromList,
  renameList,
  toggleGameInList,
  type ListsState,
  type ListResult,
} from "./game-lists";

interface ListsContextValue {
  state: ListsState;
  ready: boolean;
  create: (name: string) => ListResult;
  rename: (listId: string, name: string) => ListResult;
  remove: (listId: string) => void;
  addGame: (listId: string, gameId: string) => void;
  removeGame: (listId: string, gameId: string) => void;
  toggleGame: (listId: string, gameId: string) => void;
}

const STORAGE_KEY = "gamevault.lists.v1";
const ListsContext = createContext<ListsContextValue | null>(null);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ListsState>({ schemaVersion: 1, lists: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Lists are browser-owned and load after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(normalizeListsState(JSON.parse(saved)));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ schemaVersion: 1, lists: [] });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const value = useMemo<ListsContextValue>(() => ({
    state,
    ready,
    create: (name) => {
      const result = createList(state, name, {
        id: crypto.randomUUID(),
        now: new Date().toISOString(),
      });
      if ("list" in result) setState(result.state);
      return result;
    },
    rename: (listId, name) => {
      const result = renameList(state, listId, name, new Date().toISOString());
      if ("list" in result && result.state !== state) setState(result.state);
      return result;
    },
    remove: (listId) => setState((current) => deleteList(current, listId)),
    addGame: (listId, gameId) => setState((current) => addGameToList(current, listId, gameId, new Date().toISOString())),
    removeGame: (listId, gameId) => setState((current) => removeGameFromList(current, listId, gameId, new Date().toISOString())),
    toggleGame: (listId, gameId) => setState((current) => toggleGameInList(current, listId, gameId, new Date().toISOString())),
  }), [ready, state]);

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

export function useLists() {
  const context = useContext(ListsContext);
  if (!context) throw new Error("useLists must be used within ListsProvider");
  return context;
}

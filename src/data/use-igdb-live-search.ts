"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogueCard } from "./catalogue-card";

const DEBOUNCE_MS = 350;
const MIN_QUERY = 3;
const MAX_CATALOGUE_HITS = 3;

export interface IgdbLiveSearchState {
  loading: boolean;
  games: CatalogueCard[];
  visible: boolean;
}

export function useIgdbLiveSearch(
  query: string,
  catalogueHitCount: number,
  enabled: boolean,
): IgdbLiveSearchState {
  const trimmed = query.trim();
  const shouldSearch = enabled
    && trimmed.length >= MIN_QUERY
    && catalogueHitCount < MAX_CATALOGUE_HITS;

  const [fetchKey, setFetchKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<CatalogueCard[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shouldSearch) {
      abortRef.current?.abort();
      abortRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    const nextKey = trimmed;
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setFetchKey(nextKey);
      setLoading(true);
      const params = new URLSearchParams({ q: trimmed });
      fetch(`/api/igdb/search?${params}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { games: [] }))
        .then((body: { games?: { id: string; title: string; cover?: { url: string } }[] }) => {
          if (controller.signal.aborted) return;
          const rows = Array.isArray(body.games) ? body.games : [];
          setGames(rows.map((row) => ({
            id: row.id,
            title: row.title,
            platforms: ["Other"],
            ...(row.cover ? { cover: row.cover } : {}),
          })));
          setLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setGames([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [shouldSearch, trimmed]);

  if (!shouldSearch) {
    return { loading: false, games: [], visible: false };
  }

  const stale = fetchKey !== trimmed;
  const visible = loading || stale || games.length > 0;
  return {
    loading: loading || stale,
    games: fetchKey === trimmed ? games : [],
    visible,
  };
}

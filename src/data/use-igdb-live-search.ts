"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogueCard } from "./catalogue-card";

const DEBOUNCE_MS = 350;
const SKELETON_DELAY_MS = 300;
const MIN_QUERY = 3;
const MAX_CATALOGUE_HITS = 3;

export interface IgdbLiveSearchState {
  loading: boolean;
  games: CatalogueCard[];
  visible: boolean;
  showSkeletons: boolean;
}

export function useIgdbLiveSearch(
  query: string,
  catalogueHitCount: number,
  enabled: boolean,
): IgdbLiveSearchState {
  const trimmed = query.trim();
  const shouldSearch =
    enabled && trimmed.length >= MIN_QUERY && catalogueHitCount < MAX_CATALOGUE_HITS;

  const [fetchKey, setFetchKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [skeletonDelayed, setSkeletonDelayed] = useState(false);
  const [games, setGames] = useState<CatalogueCard[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSkeletonTimer = () => {
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = null;
  };

  const stopLoading = useCallback(() => {
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = null;
    setSkeletonDelayed(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!shouldSearch) {
      abortRef.current?.abort();
      abortRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      clearSkeletonTimer();
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
      setSkeletonDelayed(false);
      clearSkeletonTimer();
      skeletonTimerRef.current = setTimeout(() => setSkeletonDelayed(true), SKELETON_DELAY_MS);
      const params = new URLSearchParams({ q: trimmed });
      fetch(`/api/igdb/search?${params}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { games: [] }))
        .then((body: { games?: { id: string; title: string; cover?: { url: string } }[] }) => {
          if (controller.signal.aborted) return;
          const rows = Array.isArray(body.games) ? body.games : [];
          setGames(
            rows.map((row) => ({
              id: row.id,
              title: row.title,
              platforms: ["Other"],
              ...(row.cover ? { cover: row.cover } : {}),
            })),
          );
          stopLoading();
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setGames([]);
          stopLoading();
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      clearSkeletonTimer();
    };
  }, [shouldSearch, stopLoading, trimmed]);

  if (!shouldSearch) {
    return { loading: false, games: [], visible: false, showSkeletons: false };
  }

  const stale = fetchKey !== trimmed;
  const stillLoading = loading || stale;
  const visible = stillLoading || games.length > 0;
  return {
    loading: stillLoading,
    games: fetchKey === trimmed ? games : [],
    visible,
    showSkeletons: stillLoading && skeletonDelayed,
  };
}

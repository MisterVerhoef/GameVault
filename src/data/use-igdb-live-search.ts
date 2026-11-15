"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogueCard } from "./catalogue-card";
import {
  mergeCatalogueAndIgdbSearch,
  mergeSearchWallSections,
  shouldQueryIgdbLiveSearch,
} from "./hybrid-search";
import type { IgdbSearchHit } from "@/lib/igdb/types";

export interface HybridSearchWallSection {
  id: string;
  title: string;
  kind: "games" | "dlc";
  games: CatalogueCard[];
}

const DEBOUNCE_MS = 350;
const SKELETON_DELAY_MS = 300;
const MIN_QUERY = 3;

export interface IgdbLiveSearchState {
  loading: boolean;
  games: CatalogueCard[];
  sections?: HybridSearchWallSection[];
  showSkeletons: boolean;
}

export function useIgdbLiveSearch(
  query: string,
  catalogueGames: readonly CatalogueCard[],
  catalogueSections: readonly HybridSearchWallSection[] | undefined,
  enabled: boolean,
): IgdbLiveSearchState {
  const trimmed = query.trim();
  const shouldSearch =
    enabled &&
    trimmed.length >= MIN_QUERY &&
    shouldQueryIgdbLiveSearch(trimmed, catalogueGames);

  const [fetchKey, setFetchKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [skeletonDelayed, setSkeletonDelayed] = useState(false);
  const [igdbHits, setIgdbHits] = useState<IgdbSearchHit[]>([]);
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
        .then((body: { games?: IgdbSearchHit[] }) => {
          if (controller.signal.aborted) return;
          const rows = Array.isArray(body.games) ? body.games : [];
          setIgdbHits(rows);
          stopLoading();
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setIgdbHits([]);
          stopLoading();
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      clearSkeletonTimer();
    };
  }, [shouldSearch, stopLoading, trimmed]);

  const stale = fetchKey !== trimmed;
  const stillLoading = shouldSearch && (loading || stale);
  const activeHits = useMemo(
    () => (fetchKey === trimmed ? igdbHits : []),
    [fetchKey, trimmed, igdbHits],
  );

  const games = useMemo(() => {
    if (!shouldSearch || activeHits.length === 0) {
      return [...catalogueGames];
    }
    return mergeCatalogueAndIgdbSearch(trimmed, catalogueGames, activeHits);
  }, [trimmed, catalogueGames, activeHits, shouldSearch]);

  const sections = useMemo(() => {
    if (!catalogueSections || catalogueSections.length === 0) return undefined;
    if (!shouldSearch || activeHits.length === 0) {
      return catalogueSections.map((section) => ({
        ...section,
        games: [...section.games],
      }));
    }
    return mergeSearchWallSections(trimmed, catalogueSections, activeHits);
  }, [trimmed, catalogueSections, activeHits, shouldSearch]);

  return {
    loading: stillLoading,
    games,
    sections,
    showSkeletons: stillLoading && skeletonDelayed,
  };
}
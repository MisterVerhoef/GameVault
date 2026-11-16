"use client";

import { useEffect, useState } from "react";
import type { CachedStoreOffer } from "./store-offer-index";

interface OverlayState {
  key: string;
  overlays: ReadonlyMap<string, readonly CachedStoreOffer[]> | null;
  failed: boolean;
}

const EMPTY: OverlayState = { key: "", overlays: null, failed: false };

export function useLiveStoreOfferOverlays(gameIds: readonly string[], enabled: boolean) {
  const idKey = [...new Set(gameIds)].sort().join(",");
  const shouldFetch = enabled && idKey.length > 0;
  const [state, setState] = useState<OverlayState>(EMPTY);

  useEffect(() => {
    if (!shouldFetch) return;
    let active = true;
    const ids = idKey.split(",").filter(Boolean);
    fetch("/api/store-prices/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameIds: ids }),
    }).then(
      async (response) => {
        if (!active) return;
        if (!response.ok) {
          setState({ key: idKey, overlays: null, failed: true });
          return;
        }
        const body = await response.json() as { offers?: Record<string, CachedStoreOffer[]> };
        const map = new Map<string, readonly CachedStoreOffer[]>();
        for (const [id, offers] of Object.entries(body.offers ?? {})) map.set(id, offers);
        setState({ key: idKey, overlays: map, failed: false });
      },
      () => {
        if (active) setState({ key: idKey, overlays: null, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [shouldFetch, idKey]);

  const current = state.key === idKey ? state : EMPTY;
  return {
    overlays: shouldFetch ? current.overlays : null,
    failed: shouldFetch && current.failed,
    loading: shouldFetch && state.key !== idKey && !current.failed,
  };
}
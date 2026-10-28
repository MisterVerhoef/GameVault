"use client";

import { useEffect, useState } from "react";
import { indexStoreOffers, type StoreOfferIndex } from "./store-offer-index";

let request: Promise<StoreOfferIndex> | null = null;

/** Read the checked-in store catalogue. Never calls a live store. */
export function loadStoreOfferIndex(): Promise<StoreOfferIndex> {
  if (!request) {
    request = fetch("/catalog/store-offers.json")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Store offer request failed (${response.status}).`);
        return indexStoreOffers(await response.json());
      })
      .catch((error: unknown) => {
        request = null;
        throw error;
      });
  }
  return request;
}

/**
 * Load cached store offers only while `enabled` is true, so the home
 * catalogue and non-wishlist vault views do not download the file.
 */
export function useStoreOfferIndex(enabled: boolean) {
  const [index, setIndex] = useState<StoreOfferIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadStoreOfferIndex().then(
      (value) => {
        if (!active) return;
        setIndex(value);
        setFailed(false);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    index,
    failed: enabled && failed && !index,
    loading: enabled && !index && !failed,
  };
}

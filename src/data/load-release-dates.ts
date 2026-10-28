"use client";

import { useEffect, useState } from "react";
import { readReleaseDateIndex, type ReleaseDateRecord } from "./release-calendar";

let request: Promise<ReleaseDateRecord[]> | null = null;

function loadReleaseDates() {
  if (!request) {
    request = fetch("/catalog/release-dates.json").then(async (response) => {
      if (!response.ok) throw new Error(`Release date request failed (${response.status}).`);
      const payload: unknown = await response.json();
      if (
        !payload
        || typeof payload !== "object"
        || (payload as { schemaVersion?: unknown }).schemaVersion !== 1
        || !Array.isArray((payload as { games?: unknown }).games)
      ) {
        throw new Error("Unsupported release date index.");
      }
      return readReleaseDateIndex(payload);
    });
    request.catch(() => {
      request = null;
    });
  }
  return request;
}

export function useReleaseDates() {
  const [records, setRecords] = useState<ReleaseDateRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadReleaseDates().then(
      (value) => {
        if (active) setRecords(value);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return { records, failed };
}

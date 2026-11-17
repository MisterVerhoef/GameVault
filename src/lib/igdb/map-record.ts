import { normalizeExternalGame } from "@/data/catalogue";
import type { Game } from "@/data/games";
import { normalizeIgdbRecord } from "./normalize-record";

/** Map a raw IGDB games API record into the canonical {@link Game} shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIgdbApiRecord(record: any): Game | null {
  if (!record?.id || !record?.name) return null;
  const normalized = normalizeIgdbRecord(record);
  if (normalized.platforms.length === 0) return null;
  try {
    return normalizeExternalGame(
      normalized,
      "igdb",
      new Date().toISOString().slice(0, 10),
    );
  } catch {
    return null;
  }
}
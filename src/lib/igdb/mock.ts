import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IgdbLiveGame, IgdbSearchHit } from "./types";
import { normalizeIgdbQuery } from "./normalize-query";

export function igdbMockEnabled(): boolean {
  return process.env.IGDB_MOCK === "1" || process.env.IGDB_MOCK === "true";
}

interface MockFile {
  search: IgdbSearchHit[];
  games: Record<string, IgdbLiveGame>;
}

let mockFile: MockFile | null = null;

function loadMockFile(): MockFile {
  if (mockFile) return mockFile;
  const path = process.env.IGDB_MOCK_FIXTURE
    ?? join(process.cwd(), "test/fixtures/igdb-live-mock.json");
  mockFile = JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8")) as MockFile;
  return mockFile;
}

export function mockIgdbSearch(query: string): IgdbSearchHit[] {
  const normalized = normalizeIgdbQuery(query);
  const needle = normalized.replace(/\s+/g, "");
  if (needle.length < 3) return [];
  const fixture = loadMockFile();
  return fixture.search.filter((hit) => {
    const haystack = `${hit.id} ${hit.title}`.toLowerCase().replace(/\s+/g, "");
    return haystack.includes(needle);
  });
}

export function mockIgdbGame(id: string): IgdbLiveGame | null {
  const fixture = loadMockFile();
  return fixture.games[id] ?? null;
}

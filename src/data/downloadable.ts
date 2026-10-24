/**
 * IGDB does not store a category on catalogue games. Add-on releases are
 * recorded as ids on a parent game: `dlc` for IGDB dlcs, `expansions` for
 * larger add-ons such as Phantom Liberty or Blood and Wine.
 */
export interface DownloadableListing {
  id: string;
  dlc?: { id: string }[];
  expansions?: { id: string }[];
}

export function collectDownloadableIds(catalogue: readonly DownloadableListing[]): Set<string> {
  const ids = new Set<string>();
  for (const game of catalogue) {
    for (const item of game.dlc ?? []) {
      if (item.id) ids.add(item.id);
    }
    for (const item of game.expansions ?? []) {
      if (item.id) ids.add(item.id);
    }
  }
  return ids;
}

export function partitionDownloadableContent<T extends { id: string }>(
  results: readonly T[],
  downloadableIds: ReadonlySet<string>,
): { games: T[]; dlc: T[] } {
  const games: T[] = [];
  const dlc: T[] = [];
  for (const result of results) {
    if (downloadableIds.has(result.id)) dlc.push(result);
    else games.push(result);
  }
  return { games, dlc };
}

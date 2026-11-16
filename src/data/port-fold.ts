import { normalizeTitle } from "./store-match";

/** Max years between a base game and an unlinked same-title port. */
export const IGDB_UNLINKED_PORT_YEAR_GAP = 4;

export interface PortFoldRow {
  id: string;
  title: string;
  releaseYear?: number;
  ratingCount?: number;
  parentGameId?: string;
  versionParentId?: string;
}

function isUnlinkedPortAgainstPeer(
  row: PortFoldRow,
  peer: PortFoldRow,
  catalogueIds: ReadonlySet<string>,
): boolean {
  if (catalogueIds.has(row.id)) return false;
  if (peer.releaseYear == null || row.releaseYear == null) return false;
  if (peer.releaseYear >= row.releaseYear) return false;
  if (row.releaseYear - peer.releaseYear > IGDB_UNLINKED_PORT_YEAR_GAP) return false;
  const rowCount = row.ratingCount;
  const peerCount = peer.ratingCount;
  if (catalogueIds.has(peer.id)) {
    if (rowCount == null) return true;
    if (peerCount == null) return true;
    return rowCount < peerCount;
  }
  if (rowCount == null) return true;
  if (peerCount == null) return false;
  return rowCount < peerCount;
}

/** Drop unlinked same-title ports near an earlier catalogue or IGDB base row. */
export function foldUnlinkedIgdbPorts<T extends PortFoldRow>(
  hits: readonly T[],
  cataloguePeers: readonly PortFoldRow[] = [],
): T[] {
  if (hits.length === 0) return [];
  const catalogueIds = new Set(cataloguePeers.map((peer) => peer.id));
  const peersByTitle = new Map<string, PortFoldRow[]>();
  const remember = (row: PortFoldRow) => {
    const bucket = peersByTitle.get(normalizeTitle(row.title)) ?? [];
    bucket.push(row);
    peersByTitle.set(normalizeTitle(row.title), bucket);
  };
  for (const peer of cataloguePeers) remember(peer);
  for (const hit of hits) remember(hit);

  return hits.filter((hit) => {
    if (catalogueIds.has(hit.id)) return true;
    if (hit.parentGameId || hit.versionParentId) return true;
    const hitNorm = normalizeTitle(hit.title);
    for (const peer of cataloguePeers) {
      if (normalizeTitle(peer.title) !== hitNorm) continue;
      const hitYear = hit.releaseYear;
      const catYear = peer.releaseYear;
      if (hitYear == null || catYear == null || hitYear === catYear) return false;
    }
    const peers = peersByTitle.get(hitNorm) ?? [];
    for (const peer of peers) {
      if (peer.id === hit.id) continue;
      if (isUnlinkedPortAgainstPeer(hit, peer, catalogueIds)) return false;
    }
    return true;
  });
}
import type { ContentRef } from "@/data/games";
import { igdbSearchCacheControl } from "@/lib/igdb/search-api";
import { enrichSimilarGamesForApi } from "@/lib/igdb/similar-games-api";

export const runtime = "nodejs";

function parseRefs(value: unknown): ContentRef[] | null {
  if (!Array.isArray(value)) return null;
  const refs: ContentRef[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const { id, title, cover } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof title !== "string") return null;
    const ref: ContentRef = { id, title };
    if (cover !== undefined) {
      if (!cover || typeof cover !== "object") return null;
      const url = (cover as { url?: unknown }).url;
      if (typeof url !== "string") return null;
      ref.cover = { url };
    }
    refs.push(ref);
  }
  return refs;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const refs = parseRefs((body as { refs?: unknown })?.refs);
  if (!refs) {
    return Response.json({ error: "refs required" }, { status: 400 });
  }
  if (refs.length > 500) {
    return Response.json({ error: "too many refs" }, { status: 400 });
  }

  const { refs: enriched, hasLiveHits } = await enrichSimilarGamesForApi(refs);

  return Response.json(
    { refs: enriched },
    {
      status: 200,
      headers: {
        "Cache-Control": igdbSearchCacheControl(hasLiveHits ? 1 : 0),
      },
    },
  );
}
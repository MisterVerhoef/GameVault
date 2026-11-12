import { searchIgdbLive, IGDB_SEARCH_CACHE_CONTROL } from "@/lib/igdb/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const games = await searchIgdbLive(q);
  return Response.json(
    { games },
    {
      status: 200,
      headers: {
        "Cache-Control": IGDB_SEARCH_CACHE_CONTROL,
      },
    },
  );
}

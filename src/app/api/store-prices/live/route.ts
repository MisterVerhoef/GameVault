import { allGames } from "@/data/games";
import type { CachedStoreOffer } from "@/data/store-offer-index";
import { liveStoreOffersForGames } from "@/data/store-offers";

export const dynamic = "force-dynamic";

const MAX_IDS = 40;

export async function POST(request: Request) {
  let gameIds: unknown;
  try {
    const body = await request.json() as { gameIds?: unknown };
    gameIds = body.gameIds;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    return Response.json({ error: "gameIds must be a non-empty array." }, { status: 400 });
  }
  if (gameIds.length > MAX_IDS) {
    return Response.json({ error: `At most ${MAX_IDS} gameIds are allowed.` }, { status: 400 });
  }
  const normalized = [...new Set(gameIds.map((id) => String(id)).filter(Boolean))];
  const games = normalized
    .map((id) => allGames.find((game) => game.id === id))
    .filter((game): game is NonNullable<typeof game> => Boolean(game));
  const offersByGame = await liveStoreOffersForGames(games);
  const offers: Record<string, CachedStoreOffer[]> = {};
  for (const [gameId, gameOffers] of offersByGame) offers[gameId] = [...gameOffers];
  return Response.json({ offers });
}
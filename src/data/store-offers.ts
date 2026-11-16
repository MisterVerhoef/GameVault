import type { Game } from "./games";
import rawCatalogue from "../../public/catalog/store-offers.json";
import { applyFills, type StoreFills, type StoreOffer } from "./store-match";
import { overlayXboxOffersForGame, overlayXboxOffersForGames } from "./xbox-live-overlay";
import {
  formatEuro,
  formatOfferPrice,
  indexStoreOffers,
  offersForGame,
  type CachedStoreOffer,
} from "./store-offer-index";

export type { StoreFills, CachedStoreOffer };
export { formatEuro, formatOfferPrice };

interface StoreGameEntry {
  fills?: StoreFills;
}

interface StoreCatalogueFile {
  schemaVersion?: number;
  games?: Record<string, StoreGameEntry>;
}

const catalogue = rawCatalogue as StoreCatalogueFile;
const offerIndex = indexStoreOffers(rawCatalogue);

export function storeOffersFor(game: Pick<Game, "id" | "platforms">): CachedStoreOffer[] {
  return [...offersForGame(offerIndex, game.id, game.platforms)];
}

export function presentCatalogueGame(game: Game): { game: Game; offers: CachedStoreOffer[]; captions: string[] } {
  const fills = catalogue.schemaVersion === 1 ? catalogue.games?.[game.id]?.fills : undefined;
  const applied = applyFills(game, fills);
  return { game: applied.game, offers: storeOffersFor(game), captions: applied.captions };
}

function rawOffersForGame(gameId: string): StoreOffer[] | undefined {
  const entry = catalogue.games?.[gameId] as { offers?: unknown } | undefined;
  const offers = entry?.offers;
  if (!Array.isArray(offers)) return undefined;
  return offers as StoreOffer[];
}

/** Game detail prices, with live Microsoft Store prices overlaid on the cached catalogue. */
export async function presentCatalogueGameLive(
  game: Game,
): Promise<{ game: Game; offers: CachedStoreOffer[]; captions: string[] }> {
  const base = presentCatalogueGame(game);
  const offers = await overlayXboxOffersForGame(game, base.offers, rawOffersForGame(game.id));
  return { ...base, offers };
}

export async function liveStoreOffersForGames(
  games: readonly Pick<Game, "id" | "title" | "platforms" | "websites" | "externalIds">[],
): Promise<Map<string, CachedStoreOffer[]>> {
  const entries = games.map((game) => ({
    game,
    offers: storeOffersFor(game),
    rawOffers: rawOffersForGame(game.id),
  }));
  return overlayXboxOffersForGames(entries);
}

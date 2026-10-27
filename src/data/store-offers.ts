import type { Game } from "./games";
import rawCatalogue from "../../public/catalog/store-offers.json";
import { applyFills, type StoreFills } from "./store-match";
import {
  formatEuro,
  indexStoreOffers,
  offersForGame,
  type CachedStoreOffer,
} from "./store-offer-index";

export type { StoreFills, CachedStoreOffer };
export { formatEuro };

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

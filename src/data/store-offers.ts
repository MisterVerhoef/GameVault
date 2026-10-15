import type { Game, StoreId } from "./games";
import rawCatalogue from "../../public/catalog/store-offers.json";
import { applyFills, storePlatform, type StoreFills, type StoreOffer } from "./store-match";

export type { StoreFills, StoreOffer };

interface StoreGameEntry {
  offers?: StoreOffer[];
  fills?: StoreFills;
}

interface StoreCatalogueFile {
  schemaVersion?: number;
  region?: string;
  currency?: string;
  generatedAt?: string | null;
  games?: Record<string, StoreGameEntry>;
}

const catalogue = rawCatalogue as StoreCatalogueFile;

function isStore(value: unknown): value is StoreId {
  return value === "xbox" || value === "playstation" || value === "nintendo";
}

function isOffer(value: unknown): value is StoreOffer {
  if (!value || typeof value !== "object") return false;
  const offer = value as StoreOffer;
  return isStore(offer.store)
    && offer.platform === storePlatform(offer.store)
    && typeof offer.url === "string"
    && typeof offer.title === "string"
    && (offer.price === null || typeof offer.price === "number");
}

export function storeOffersFor(game: Game): StoreOffer[] {
  if (catalogue.schemaVersion !== 1) return [];
  const offers = catalogue.games?.[game.id]?.offers ?? [];
  return offers.filter((offer) => isOffer(offer) && game.platforms.includes(offer.platform));
}

export function presentCatalogueGame(game: Game): { game: Game; offers: StoreOffer[]; captions: string[] } {
  const fills = catalogue.schemaVersion === 1 ? catalogue.games?.[game.id]?.fills : undefined;
  const applied = applyFills(game, fills);
  return { game: applied.game, offers: storeOffersFor(game), captions: applied.captions };
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

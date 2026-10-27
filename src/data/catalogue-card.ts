/** Fields a row, wall, or hero needs. Detail pages keep the full catalogue record. */
export interface CatalogueCard {
  id: string;
  title: string;
  cover?: { url: string };
  platforms?: readonly string[];
  platformVariants?: readonly string[];
  releaseYear?: number;
  rating?: number;
}

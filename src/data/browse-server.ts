import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createBrowseCatalogue, type BrowseCatalogue, type BrowseIndexFile, type SearchIndexFile } from "./library-view";

let catalogue: BrowseCatalogue | null = null;

// Server-only: this reads the catalogue from disk. Client list pages fetch the same files.

function readCatalog(fileName: "browse-index.json" | "search-index.json") {
  const path = fileName === "browse-index.json"
    ? join(process.cwd(), "public/catalog/browse-index.json")
    : join(process.cwd(), "public/catalog/search-index.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Card and search records for list pages. The full games index stays off this path. */
export function getBrowseCatalogue(): BrowseCatalogue {
  if (!catalogue) {
    catalogue = createBrowseCatalogue(
      readCatalog("browse-index.json") as BrowseIndexFile,
      readCatalog("search-index.json") as SearchIndexFile,
    );
  }
  return catalogue;
}

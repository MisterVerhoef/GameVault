import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./load-ts-module.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outPath = join(root, "public/catalog/playstation-deals-snapshot.json");
const fromFixture = process.argv.includes("--from-fixture");

const { assertCategoryGridRetrieve } = loadTsModule("src/data/playstation-deals-schema.ts");
const { playStationDealsFromCategoryGrid } = loadTsModule("src/data/playstation-deals-normalize.ts");
const { buildPlayStationStoreIdGameIndex } = loadTsModule("src/data/playstation-deals-match.ts");
const { fetchPlayStationDealsLive } = loadTsModule("src/data/playstation-deals-fetch.ts");

async function main() {
  let deals;
  let generatedAt = new Date().toISOString();

  if (fromFixture) {
    const page = JSON.parse(
      readFileSync(join(root, "test/fixtures/playstation-category-grid-page1.json"), "utf8"),
    );
    const grid = assertCategoryGridRetrieve(page);
    deals = playStationDealsFromCategoryGrid(grid, buildPlayStationStoreIdGameIndex());
    generatedAt = "2026-11-18T06:30:00.000Z";
    console.log(`Wrote ${deals.length} deals from fixture to ${outPath}`);
  } else {
    const payload = await fetchPlayStationDealsLive();
    deals = payload.deals;
    generatedAt = payload.lastUpdated ?? payload.updatedAt;
    console.log(`Wrote ${deals.length} live deals to ${outPath}`);
  }

  const file = {
    schemaVersion: 1,
    region: "NL",
    generatedAt,
    deals,
  };
  writeFileSync(outPath, `${JSON.stringify(file)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
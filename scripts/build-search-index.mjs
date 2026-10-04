import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = path.join(root, "public", "catalog", "games-index.json");
const outputPath = path.join(root, "public", "catalog", "search-index.json");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const index = catalogue.games
  .map((game) => ({
    id: game.id,
    title: game.title,
    terms: [...game.genres, ...game.themes, ...game.platforms, ...game.franchises, ...game.collections]
      .join(" ")
      .toLowerCase(),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: 1, games: index }, null, 2)}\n`);
console.log(`Built search index for ${index.length} games.`);

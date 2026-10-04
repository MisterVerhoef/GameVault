import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cataloguePath = path.join(root, "public", "catalog", "games-index.json");
const outputPath = path.join(root, "public", "catalog", "search-index.json");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const index = catalogue.games
  .map((game) => {
    const terms = new Set([
      game.id,
      game.slug,
      game.title,
      game.summary ?? "",
      game.description ?? "",
      ...(game.genres ?? []),
      ...(game.themes ?? []),
      ...(game.platforms ?? []),
      ...(game.developers ?? []).map((company) => company.name),
      ...(game.publishers ?? []).map((company) => company.name),
      ...(game.franchises ?? []),
      ...(game.collections ?? []),
    ].flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)));

    return {
      id: game.id,
      title: game.title,
      terms: Array.from(terms).join(" "),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: 1, games: index }, null, 2)}\n`);
console.log(`Built search index for ${index.length} games.`);

import path from "node:path";

export const gamesIndexRelative = "data/catalog/games-index.json";

export function gamesIndexPath(root) {
  return path.join(root, gamesIndexRelative);
}
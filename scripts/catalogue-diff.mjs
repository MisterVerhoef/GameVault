import fs from "node:fs";

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) throw new Error("Usage: node scripts/catalogue-diff.mjs <before.json> <after.json>");
const before = JSON.parse(fs.readFileSync(beforePath, "utf8").replace(/^\uFEFF/, ""));
const after = JSON.parse(fs.readFileSync(afterPath, "utf8").replace(/^\uFEFF/, ""));
const beforeIds = new Set(before.games.map((game) => game.id));
const afterIds = new Set(after.games.map((game) => game.id));
const added = [...afterIds].filter((id) => !beforeIds.has(id)).sort();
const removed = [...beforeIds].filter((id) => !afterIds.has(id)).sort();
const changed = [...afterIds].filter((id) => beforeIds.has(id) &&
  JSON.stringify(before.games.find((game) => game.id === id)) !== JSON.stringify(after.games.find((game) => game.id === id))).sort();
console.log(JSON.stringify({ added, removed, changed, summary: { added: added.length, removed: removed.length, changed: changed.length } }, null, 2));

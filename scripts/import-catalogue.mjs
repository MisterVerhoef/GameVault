import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const providerIndex = args.indexOf("--provider");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
const provider = providerIndex >= 0 ? args[providerIndex + 1] : "import";

if (!inputPath) {
  throw new Error("Usage: npm run catalogue:import -- --input <path> [--provider <name>]");
}

const resolvedInputPath = path.resolve(process.cwd(), inputPath);
const input = JSON.parse(fs.readFileSync(resolvedInputPath, "utf8").replace(/^\uFEFF/, ""));
const records = Array.isArray(input) ? input : input?.games;
if (!Array.isArray(records)) {
  throw new Error("Import input must be a JSON array or an object containing a games array.");
}

const cataloguePath = path.join(root, "src", "data", "catalogue.ts");
const source = fs.readFileSync(cataloguePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
Module._extensions[".ts"] = (loadedModule, filename) => {
  const tsSource = fs.readFileSync(filename, "utf8");
  const tsCompiled = ts.transpileModule(tsSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  loadedModule._compile(tsCompiled, filename);
};
const catalogueModule = new Module(cataloguePath);
catalogueModule.filename = cataloguePath;
catalogueModule.paths = Module._nodeModulePaths(root);
catalogueModule._compile(compiled, cataloguePath);

const { normalizeExternalGame, isGame } = catalogueModule.exports;
const updatedAt = new Date().toISOString().slice(0, 10);
const games = records.map((record, index) => {
  try {
    const game = normalizeExternalGame(record, provider, updatedAt);
    if (!isGame(game)) throw new Error("normalization produced an invalid canonical game");
    return game;
  } catch (error) {
    throw new Error(`Invalid imported game at index ${index}: ${error.message}`, { cause: error });
  }
});

const ids = new Set();
for (const game of games) {
  if (ids.has(game.id)) throw new Error(`Duplicate imported game id: "${game.id}".`);
  ids.add(game.id);
}

const outputPath = path.join(root, "public", "catalog", "games-index.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), games }, null, 2)}\n`,
);
console.log(`Imported ${games.length} games from ${path.relative(root, resolvedInputPath)}`);

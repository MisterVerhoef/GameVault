import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import crypto from "node:crypto";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const providerIndex = args.indexOf("--provider");
const versionIndex = args.indexOf("--source-version");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
const provider = providerIndex >= 0 ? args[providerIndex + 1] : "import";
const sourceVersion = versionIndex >= 0 ? args[versionIndex + 1] : undefined;
const outputIndex = args.indexOf("--output");
const reportIndex = args.indexOf("--report");
const outputPathArg = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const reportPathArg = reportIndex >= 0 ? args[reportIndex + 1] : undefined;

if (!inputPath) {
  throw new Error("Usage: npm run catalogue:import -- --input <path> [--provider <name>]");
}

const resolvedInputPath = path.resolve(process.cwd(), inputPath);
const inputText = fs.readFileSync(resolvedInputPath, "utf8").replace(/^\uFEFF/, "");
const input = JSON.parse(inputText);
const providerModule = provider === "igdb"
  ? await import("./providers/igdb.mjs")
  : { normalizeExport: (value) => Array.isArray(value) ? value : value?.games };
const records = provider === "igdb"
  ? providerModule.normalizeIgdbExport(input)
  : providerModule.normalizeExport(input);
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

const { normalizeExternalGame, isGame, auditCatalogue } = catalogueModule.exports;
const updatedAt = new Date().toISOString().slice(0, 10);
const warnings = records.flatMap((record) => record.warnings ?? []);
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
const quality = auditCatalogue(games);
quality.warnings = warnings;
const reportPath = reportPathArg
  ? path.resolve(process.cwd(), reportPathArg)
  : path.join(root, "reports", "catalogue-quality.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(quality, null, 2)}\n`);

const outputPath = outputPathArg
  ? path.resolve(process.cwd(), outputPathArg)
  : path.join(root, "public", "catalog", "games-index.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const sourceChecksum = crypto.createHash("sha256").update(inputText).digest("hex");
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    provenance: {
      provider,
      importedAt: new Date().toISOString(),
      ...(sourceVersion ? { sourceVersion } : {}),
      sourceChecksum,
    },
    games,
  }, null, 2)}\n`,
);
console.log(`Imported ${games.length} games from ${path.relative(root, resolvedInputPath)}`);
console.log(`Quality report written to ${path.relative(root, reportPath)}`);

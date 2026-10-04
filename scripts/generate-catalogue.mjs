import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "data", "games.ts");
const source = fs.readFileSync(sourcePath, "utf8");
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

const loadedModule = new Module(sourcePath);
loadedModule.filename = sourcePath;
loadedModule.paths = Module._nodeModulePaths(root);
loadedModule._compile(compiled, sourcePath);

const games = loadedModule.exports.fallbackGames ?? loadedModule.exports.allGames;
if (!Array.isArray(games) || games.length === 0) {
  throw new Error("The canonical catalogue did not produce any games.");
}

const outputPath = path.join(root, "public", "catalog", "games-index.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const sourceChecksum = crypto.createHash("sha256").update(source).digest("hex");
let generatedAt = "canonical-source";
if (fs.existsSync(outputPath)) {
  const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  generatedAt = existing.generatedAt ?? generatedAt;
}
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    provenance: { provider: "demo", sourceVersion: "canonical-source", sourceChecksum },
    games,
  }, null, 2)}\n`,
);
console.log(`Generated ${games.length} games at ${path.relative(root, outputPath)}`);

import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveTsAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(root, "src", request.slice(2));
  }
  return defaultResolveFilename.call(this, request, parent, isMain, options);
};

Module._extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  }).outputText;
  loadedModule._compile(compiled, filename);
};

export function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  }).outputText;
  const loadedModule = new Module(sourcePath);
  loadedModule.filename = sourcePath;
  loadedModule.paths = Module._nodeModulePaths(root);
  loadedModule._compile(compiled, sourcePath);
  return loadedModule.exports;
}

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadTsx(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const loaded = new Module(sourcePath);
  loaded.filename = sourcePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  const previous = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (typeof request === "string" && request.startsWith("@/")) {
      request = path.join(root, "src", request.slice(2));
    }
    return previous.call(this, request, ...rest);
  };
  try {
    loaded._compile(compiled, sourcePath);
  } finally {
    Module._resolveFilename = previous;
  }
  return loaded.exports;
}

const { GameStorePrice } = loadTsx("src/components/GameStorePrice.tsx");
const { formatRating } = loadTsModule("src/data/format-rating.ts");
const { formatCount } = loadTsModule("src/data/game-facts.ts");

test("formatRating returns an empty string for missing or invalid ratings", () => {
  assert.equal(formatRating(undefined), "");
  assert.equal(formatRating(null), "");
  assert.equal(formatRating(Number.NaN), "");
  assert.equal(formatRating(Number.POSITIVE_INFINITY), "");
  assert.equal(formatRating(Number.NEGATIVE_INFINITY), "");
});

test("formatRating shows exactly one decimal for whole scores, zero, and fractions", () => {
  assert.equal(formatRating(90), "90.0");
  assert.equal(formatRating(100), "100.0");
  assert.equal(formatRating(0), "0.0");
  assert.equal(formatRating(85.5), "85.5");
  assert.equal(formatRating(9.7), "9.7");
  assert.equal(formatRating(9), "9.0");
});

test("formatRating rounds to one decimal and keeps the original scale", () => {
  assert.equal(formatRating(87.34), "87.3");
  assert.equal(formatRating(87.35), "87.4");
  assert.equal(formatRating(72.456), "72.5");
  assert.equal(formatRating(85.004), "85.0");
  assert.equal(formatRating(85.85), "85.9");
});

test("formatCount returns an empty string for invalid or non-positive counts", () => {
  assert.equal(formatCount(undefined), "");
  assert.equal(formatCount(0), "");
  assert.equal(formatCount(-1), "");
  assert.equal(formatCount(Number.POSITIVE_INFINITY), "");
});

test("formatCount rounds and formats counts using en-GB separators", () => {
  assert.equal(formatCount(2324), "2,324");
  assert.equal(formatCount(12.6), "13");
});

test("game page shows Price unavailable when a matched store offer has no price", () => {
  const html = renderToStaticMarkup(
    React.createElement(GameStorePrice, { price: null }),
  );
  assert.match(html, /class="text-muted"/);
  assert.match(html, />Price unavailable</);
  assert.doesNotMatch(html, /font-semibold/);
});

test("game page still shows Free and euro amounts when a store offer has a price", () => {
  const free = renderToStaticMarkup(
    React.createElement(GameStorePrice, { price: 0 }),
  );
  assert.match(free, /class="font-semibold text-foreground"/);
  assert.match(free, />Free</);
  const paid = renderToStaticMarkup(
    React.createElement(GameStorePrice, { price: 24.5 }),
  );
  assert.match(paid, />€\u00a024,50</);
  assert.doesNotMatch(paid, /Price unavailable/);
});

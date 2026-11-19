import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  indexPlayAnywhere,
  catalogueJsonModule,
  normalizeXboxBigId,
  playAnywhereForGame,
  productSupportsXboxPlayAnywhere,
  resolvePlayAnywhereForGame,
  xboxExternalIds,
} = loadTsModule("src/data/play-anywhere.ts");

const {
  gameHasXboxSeries,
  hasKnownXboxSeriesFeature,
  xboxCloudGamingAvailability,
  xboxPlayAnywhereAvailability,
  xboxSeriesFeatureStatus,
} = loadTsModule("src/data/xbox-series-features.ts");

const { indexCloudStreaming } = loadTsModule("src/data/cloud-streaming.ts");

test("catalogueJsonModule unwraps default JSON imports", () => {
  const body = { schemaVersion: 1, region: "NL", generatedAt: "2026-01-01", games: {} };
  assert.equal(catalogueJsonModule(body), body);
  assert.equal(catalogueJsonModule({ default: body }), body);
});

test("normalizeXboxBigId uppercases Microsoft product ids", () => {
  assert.equal(normalizeXboxBigId("9n8cd0xzklp4"), "9N8CD0XZKLP4");
});

test("productSupportsXboxPlayAnywhere reads the XPA attribute", () => {
  const withXpa = {
    Properties: { Attributes: [{ Name: "XPA" }, { Name: "SinglePlayer" }] },
  };
  const withoutXpa = {
    Properties: { Attributes: [{ Name: "SinglePlayer" }] },
  };
  assert.equal(productSupportsXboxPlayAnywhere(withXpa), true);
  assert.equal(productSupportsXboxPlayAnywhere(withoutXpa), false);
});

test("resolvePlayAnywhereForGame matches by external store id", () => {
  const game = {
    externalIds: [
      { store: "xbox", id: "9N8CD0XZKLP4" },
      { store: "steam", id: "123" },
    ],
  };
  const products = new Map([["9N8CD0XZKLP4", true]]);
  const resolved = resolvePlayAnywhereForGame(game, products);
  assert.deepEqual(resolved, {
    playAnywhere: true,
    xboxProductId: "9N8CD0XZKLP4",
    match: "external-id",
  });
});

test("xboxSeriesFeatureStatus combines Play Anywhere and Cloud Gaming", () => {
  const playIndex = indexPlayAnywhere({
    schemaVersion: 1,
    region: "NL",
    generatedAt: "2026-01-01",
    games: {
      "42": { playAnywhere: true, xboxProductId: "BIGID", match: "external-id", checkedAt: "2026-01-01" },
    },
  });
  const cloudIndex = indexCloudStreaming({
    schemaVersion: 1,
    region: "NL",
    generatedAt: "2026-01-01",
    games: {
      "42": {
        services: [{ id: "xbox-cloud", name: "Xbox Cloud Gaming", url: "https://www.xbox.com/play", match: "external-id", checkedAt: "2026-01-01" }],
      },
    },
  });
  const game = {
    id: "42",
    platformVariants: ["Xbox Series X|S"],
    externalIds: [{ store: "xbox", id: "BIGID" }],
  };
  const status = xboxSeriesFeatureStatus(game, playIndex, cloudIndex);
  assert.deepEqual(status, {
    playAnywhere: "supported",
    cloudGaming: "supported",
  });
  assert.equal(hasKnownXboxSeriesFeature(status), true);
  assert.equal(gameHasXboxSeries(game.platformVariants), true);
  assert.equal(xboxPlayAnywhereAvailability(playIndex, "42"), "supported");
  assert.equal(xboxCloudGamingAvailability(cloudIndex, "42", game), "supported");
  assert.equal(xboxExternalIds(game).join(","), "BIGID");
  assert.equal(playAnywhereForGame(playIndex, "42")?.playAnywhere, true);
});
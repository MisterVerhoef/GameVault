import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  collectPublishers,
  describePublisher,
  publisherHref,
  publisherMetadata,
  sortPublisherGames,
} = loadTsModule("src/data/publisher-profile.ts");

const root = fileURLToPath(new URL("..", import.meta.url));

test("collectPublishers keeps only published titles", () => {
  const publishers = collectPublishers([
    {
      id: "a",
      title: "Developed only",
      developers: [{ id: "1", name: "DevCo" }],
      publishers: [{ id: "2", name: "PubCo" }],
    },
    {
      id: "b",
      title: "Published title",
      publishers: [{ id: "2", name: "PubCo" }],
      releaseYear: 2020,
    },
  ]);
  const pubCo = publishers.find((entry) => entry.id === "2");
  assert.ok(pubCo);
  assert.deepEqual(pubCo.gameIds, ["a", "b"]);
  assert.match(pubCo.summary, /PubCo is a publisher/);
  assert.equal(publishers.some((entry) => entry.id === "1"), false);
});

test("publisher helpers format links and sorting", () => {
  assert.equal(publisherHref("70"), "/publisher/70");
  assert.equal(
    publisherMetadata({ gameCount: 2, yearStart: 2010, yearEnd: 2024 }),
    "Publisher · 2 games · 2010–2024",
  );
  assert.match(
    describePublisher({
      name: "Example",
      publishedCount: 1,
      notableTitles: ["Solo"],
    }),
    /Example is a publisher/,
  );
  const sorted = sortPublisherGames([
    { title: "Beta", releaseYear: 2010 },
    { title: "Alpha", releaseYear: 2020 },
    { title: "Gamma", releaseYear: 2020 },
  ]);
  assert.deepEqual(sorted.map((game) => game.title), ["Alpha", "Gamma", "Beta"]);
});

test("catalogue includes Nintendo publisher record", () => {
  const catalogue = JSON.parse(readFileSync(`${root}/public/catalog/games-index.json`, "utf8"));
  const publishers = collectPublishers(catalogue.games);
  const nintendo = publishers.find((entry) => entry.id === "70");
  assert.ok(nintendo);
  assert.ok(nintendo.gameIds.length > 50);
});
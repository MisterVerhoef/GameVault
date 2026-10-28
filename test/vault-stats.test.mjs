import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  buildVaultStats,
  completionPie,
  formatCompletion,
  formatShare,
  formatVaultUpdated,
  vaultCatalogueFacts,
  vaultPlatformLabel,
} = loadTsModule("src/data/vault-stats.ts");

const catalogue = {
  hades: {
    id: "113112",
    title: "Hades",
    genres: ["Adventure", "RPG", "rpg"],
    platforms: ["PC", "PS5"],
  },
  celeste: {
    id: "26226",
    title: "Celeste",
    genres: ["Platform", "Indie"],
    platforms: ["PC"],
  },
  portal: {
    id: "72",
    title: "Portal 2",
    genres: ["Puzzle"],
    platforms: ["PC", "Switch"],
  },
  mario: {
    id: "26764",
    title: "Mario Kart 8 Deluxe",
    genres: ["Racing"],
    platforms: ["Switch"],
  },
  wish: {
    id: "1877",
    title: "Cyberpunk 2077",
    genres: ["Shooter"],
    platforms: ["Xbox"],
  },
  blankGenre: {
    id: "1",
    title: "No Genre",
    genres: ["  ", ""],
    platforms: [],
  },
};

function lookup(gameId) {
  return vaultCatalogueFacts(catalogue[gameId]);
}

function entry(status, updatedAt) {
  return { status, progress: 0, updatedAt };
}

test("labels catalogue families the same way as the rest of the app", () => {
  assert.equal(vaultPlatformLabel("PC"), "PC");
  assert.equal(vaultPlatformLabel("PS5"), "PlayStation");
  assert.equal(vaultPlatformLabel("Xbox"), "Xbox");
  assert.equal(vaultPlatformLabel("Switch"), "Nintendo");
  assert.equal(vaultPlatformLabel("Other"), "Other");
  assert.equal(vaultPlatformLabel("Stadia"), "Stadia");
});

test("formats completion and shares without hiding a real count", () => {
  assert.equal(formatCompletion(null), "–");
  assert.equal(formatCompletion(Number.NaN), "–");
  assert.equal(formatCompletion(0), "0%");
  assert.equal(formatCompletion(1 / 3), "33%");
  assert.equal(formatCompletion(1), "100%");
  assert.equal(formatShare(0.5, 2), "50%");
  assert.equal(formatShare(1, 4), "100%");
  assert.equal(formatShare(0.004, 1), "<1%");
  assert.equal(formatShare(0, 0), "0%");
});

test("draws completion as an empty disc, a slice, or a full disc", () => {
  assert.deepEqual(completionPie(0), { kind: "empty" });
  assert.deepEqual(completionPie(Number.NaN), { kind: "empty" });
  assert.equal(completionPie(100).kind, "full");
  assert.equal(completionPie(140).kind, "full");

  const third = completionPie(33);
  assert.equal(third.kind, "slice");
  assert.match(third.d, /^M 18 18 L 18\.000 2\.000 A 16 16 0 0 1 /);

  const most = completionPie(75);
  assert.equal(most.kind, "slice");
  assert.match(most.d, /A 16 16 0 1 1 /);
});

test("formats recent updates in the requested locale", () => {
  const now = Date.parse("2026-10-28T12:00:00.000Z");
  assert.equal(formatVaultUpdated("2026-10-28T12:00:00.000Z", now, "en"), "now");
  assert.equal(formatVaultUpdated("2026-10-28T11:00:00.000Z", now, "en"), "1 hour ago");
  assert.equal(formatVaultUpdated("2026-10-25T12:00:00.000Z", now, "en"), "3 days ago");
  assert.equal(formatVaultUpdated("not-a-date", now, "en"), "Unknown date");
  assert.match(formatVaultUpdated("2026-08-01T12:00:00.000Z", now, "en"), /2026/);
});

test("returns an empty dashboard for an empty vault", () => {
  const stats = buildVaultStats({}, lookup);
  assert.equal(stats.total, 0);
  assert.equal(stats.owned, 0);
  assert.equal(stats.completed, 0);
  assert.equal(stats.wishlist, 0);
  assert.equal(stats.completionRate, null);
  assert.deepEqual(stats.genres, []);
  assert.deepEqual(stats.platforms, []);
  assert.equal(stats.missingFromCatalogue, 0);
  assert.deepEqual(stats.recent, []);
  assert.equal(stats.recentTotal, 0);
});

test("keeps wishlist out of the completion rate and still counts it in the mixes", () => {
  const stats = buildVaultStats({
    wish: entry("wishlist", "2026-10-01T00:00:00.000Z"),
  }, lookup);

  assert.equal(stats.completionRate, null);
  assert.equal(stats.owned, 0);
  assert.equal(stats.wishlist, 1);
  assert.equal(stats.total, 1);
  assert.equal(stats.genres[0].label, "Shooter");
  assert.equal(stats.platforms[0].label, "Xbox");
});

test("joins vault entries to catalogue genres and platforms", () => {
  const stats = buildVaultStats({
    hades: entry("completed", "2026-10-01T00:00:00.000Z"),
    celeste: entry("playing", "2026-10-20T00:00:00.000Z"),
    portal: entry("paused", "2026-10-20T00:00:00.000Z"),
    mario: entry("backlog", "2026-09-01T00:00:00.000Z"),
    wish: entry("wishlist", "2026-10-28T00:00:00.000Z"),
    missing: entry("completed", "2026-10-15T00:00:00.000Z"),
    blankGenre: entry("playing", "2026-08-01T00:00:00.000Z"),
    dropped: { status: "dropped", progress: 0, updatedAt: "2026-10-27T00:00:00.000Z" },
  }, lookup, 3);

  assert.equal(stats.total, 7);
  assert.equal(stats.owned, 6);
  assert.equal(stats.completed, 2);
  assert.equal(stats.wishlist, 1);
  assert.equal(stats.completionRate, 2 / 6);
  assert.equal(stats.statusCounts.playing, 2);
  assert.equal(stats.statusCounts.backlog, 1);
  assert.equal(stats.statusCounts.paused, 1);
  assert.equal(stats.missingFromCatalogue, 1);
  assert.equal(stats.genreMatched, 5);
  assert.equal(stats.platformMatched, 5);

  const rpg = stats.genres.find((slice) => slice.key === "rpg");
  assert.equal(rpg.label, "RPG");
  assert.equal(rpg.count, 1);
  assert.equal(rpg.share, 1 / 5);
  const labels = stats.genres.map((slice) => slice.label);
  assert.deepEqual(labels, [...labels].sort((left, right) => left.localeCompare(right)));

  assert.deepEqual(
    stats.platforms.map((slice) => [slice.label, slice.count]),
    [
      ["PC", 3],
      ["Nintendo", 2],
      ["PlayStation", 1],
      ["Xbox", 1],
    ],
  );
  assert.equal(stats.platforms[0].share, 3 / 5);

  assert.equal(stats.recentTotal, 7);
  assert.deepEqual(
    stats.recent.map((item) => item.title),
    ["Cyberpunk 2077", "Celeste", "Portal 2"],
  );
  assert.equal(stats.recent[0].href, "/game/1877");
  assert.equal(stats.recent[0].status, "wishlist");
});

test("lists real platforms before Other even when Other is larger", () => {
  const stats = buildVaultStats({
    a: entry("playing", "2026-10-01T00:00:00.000Z"),
    b: entry("playing", "2026-10-02T00:00:00.000Z"),
    c: entry("completed", "2026-10-03T00:00:00.000Z"),
  }, (gameId) => ({
    id: gameId,
    title: gameId,
    genres: [],
    platforms: gameId === "c" ? ["PC"] : ["Other"],
  }));

  assert.deepEqual(stats.platforms.map((slice) => [slice.label, slice.count]), [
    ["PC", 1],
    ["Other", 2],
  ]);
});

test("sorts a catalogue miss by date and leaves it out of the mixes", () => {
  const stats = buildVaultStats({
    known: entry("playing", "2026-10-01T00:00:00.000Z"),
    missing: entry("completed", "2026-10-02T00:00:00.000Z"),
  }, lookup);

  assert.equal(stats.recent[0].gameId, "missing");
  assert.equal(stats.recent[0].title, "missing");
  assert.equal(stats.recent[0].href, null);
  assert.equal(stats.recent[0].inCatalogue, false);
  assert.equal(stats.genres.some((slice) => slice.label === "missing"), false);
  assert.equal(stats.completionRate, 1 / 2);
});

test("breaks recent ties by title, then id", () => {
  const stats = buildVaultStats({
    b: entry("playing", "2026-10-01T00:00:00.000Z"),
    a: entry("backlog", "2026-10-01T00:00:00.000Z"),
    c: entry("paused", "2026-10-01T00:00:00.000Z"),
  }, (gameId) => {
    if (gameId === "c") return { id: "c", title: "Alpha", genres: [], platforms: ["PC"] };
    return { id: gameId, title: "Same", genres: ["Adventure"], platforms: ["PC"] };
  });

  assert.deepEqual(stats.recent.map((item) => item.gameId), ["c", "a", "b"]);
  assert.equal(stats.genres.find((slice) => slice.label === "Adventure").count, 2);
});

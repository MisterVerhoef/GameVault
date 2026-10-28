import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";
import { normalizeIgdbExport } from "../scripts/providers/igdb.mjs";

const { findCatalogueEntry, mergeGames, normalizeExternalGame } = loadTsModule("src/data/catalogue.ts");
const { guideLinks } = loadTsModule("src/data/websites.ts");
const { formatCountLabel, formatPlayTime, formatReleaseDay, multiplayerPhrases } = loadTsModule("src/data/game-facts.ts");
const { gameIsPlatformExclusive, gameMatchesPlatformVariant, isPcPlatformBrowse, resolveIgdbPlatform } = loadTsModule("src/data/platforms.ts");
const { browseQuery, gameMatchesGenre } = loadTsModule("src/data/browse.ts");
const { collapsedLineCount, visibleLineCount } = loadTsModule("src/components/description-clamp.ts");
const { collectDownloadableIds, partitionDownloadableContent } = loadTsModule("src/data/downloadable.ts");
const { matchesSearchTerms } = loadTsModule("src/data/search-terms.ts");
const { collectStudios, describeStudio, studioInitials, studioMetadata } = loadTsModule("src/data/studio-profile.ts");
const { catalogueCompanyLogo, resolveStudioLogo } = loadTsModule("src/data/studio-logo.ts");
const {
  collectSeries,
  describeSeries,
  seriesInitials,
  seriesMetadata,
  seriesPath,
  seriesSlug,
} = loadTsModule("src/data/series-profile.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/igdb-export.json", import.meta.url), "utf8"),
);

test("normalizes IGDB records into the provider-neutral import shape", () => {
  const [game] = normalizeIgdbExport(fixture);

  assert.equal(game.id, "1942");
  assert.equal(game.title, "Baldur's Gate 3");
  assert.deepEqual([...game.platforms].sort(), ["Other", "PC", "PS5"]);
  assert.deepEqual([...game.platformVariants].sort(), ["PS5", "Stadia", "Windows"]);
  assert.equal(game.releaseYear, 2023);
  assert.equal(game.cover, "https://images.igdb.com/igdb/image/upload/t_cover_big/bg3.jpg");
  assert.equal(game.ratingCount, 2500);
  assert.equal(game.aggregatedRating, 94.2);
  assert.equal(game.aggregatedRatingCount, 38);
  assert.deepEqual(game.ageRatings, [
    { board: "PEGI", label: "18" },
    { board: "ESRB", label: "M" },
  ]);
  assert.deepEqual(game.gameModes, ["Single player", "Multiplayer", "Co-operative"]);
  assert.deepEqual(game.playerPerspectives, ["Third person"]);
  assert.deepEqual(game.keywords, ["Fantasy", "Romance", "Choices Matter"]);
  assert.deepEqual(game.multiplayer, {
    campaignCoop: true,
    dropIn: true,
    onlineCoop: true,
    onlineCoopMax: 4,
  });
  assert.deepEqual(game.releases, [
    { platform: "Windows", date: "2023-08-06" },
    { platform: "PS5", date: "2023-08-07" },
  ]);
  assert.deepEqual(game.timeToBeat, {
    hastily: 180000,
    normally: 270000,
    completely: 432000,
    count: 150,
  });
  assert.deepEqual(game.developers, [{
    id: "1",
    name: "Larian Studios",
    logo: {
      url: "https://images.igdb.com/igdb/image/upload/t_logo_med/cllarian.png",
      width: 400,
      height: 100,
    },
  }]);
  assert.deepEqual(game.publishers, [{ id: "2", name: "Larian Studios" }]);
  assert.equal(game.themes[0], "Fantasy");
  assert.deepEqual(game.franchises, ["Baldur's Gate"]);
  assert.deepEqual(game.collections, []);
  assert.equal(game.screenshots[0].width, 1920);
  assert.equal(game.videos[0].url, "https://www.youtube.com/watch?v=abc123");
  assert.deepEqual(game.websites, [{
    label: "Official website",
    url: "https://example.com/bg3",
    category: "website",
  }]);
  assert.deepEqual(game.dlc, [{ id: "2001", title: "DLC One" }]);
  assert.deepEqual(game.warnings, []);
});

test("keeps detail fields compact and skips companies that are not publishers", () => {
  const keywords = Array.from({ length: 14 }, (_, index) => ({ name: `Keyword ${String(index).padStart(2, "0")}` }));
  keywords.push({ name: "Keyword 00" });
  keywords.push({ name: "x".repeat(41) });
  const [game] = normalizeIgdbExport([
    {
      id: 7,
      name: "Compact",
      slug: "compact",
      platforms: [{ name: "PC" }],
      involved_companies: [
        {
          developer: true,
          publisher: true,
          company: {
            id: 4,
            name: "Both",
            logo: { url: "//images.igdb.com/igdb/image/upload/t_thumb/clboth.jpg", width: 200, height: 50 },
          },
        },
        { developer: true, company: { id: 6, name: "Animated", logo: { image_id: "clani", animated: true, width: 0, height: -1 } } },
        { developer: false, company: { id: 5, name: "Supporting only", logo: 8 } },
      ],
      keywords,
      game_time_to_beats: [{ hastily: 0, normally: 90, completely: 0, count: 0 }],
      release_dates: [
        { date: 1609459200, human: "2021" },
        { platform: { name: "Linux" }, human: "TBD" },
      ],
      age_ratings: [{ organization: { id: 2 }, rating_category: 9 }],
    },
  ]);

  assert.equal(game.keywords.length, 12);
  assert.equal(game.keywords[0], "Keyword 00");
  assert.equal(game.keywords.includes("x".repeat(41)), false);
  assert.deepEqual(game.developers, [
    {
      id: "4",
      name: "Both",
      logo: {
        url: "https://images.igdb.com/igdb/image/upload/t_logo_med/clboth.jpg",
        width: 200,
        height: 50,
      },
    },
    { id: "6", name: "Animated", logo: { url: "https://images.igdb.com/igdb/image/upload/t_logo_med/clani.gif" } },
  ]);
  assert.deepEqual(game.publishers, [{
    id: "4",
    name: "Both",
    logo: {
      url: "https://images.igdb.com/igdb/image/upload/t_logo_med/clboth.jpg",
      width: 200,
      height: 50,
    },
  }]);
  assert.deepEqual(game.timeToBeat, { normally: 90 });
  assert.deepEqual(game.releases, [{ platform: "Linux", label: "TBD" }]);
  assert.equal(game.ageRatings, undefined);
});

test("catalogue import keeps sanitized detail fields and drops empty ones", () => {
  const game = normalizeExternalGame({
    id: "details",
    title: "Details",
    platforms: ["PC"],
    aggregatedRating: 88.2,
    aggregatedRatingCount: 0,
    ageRatings: [
      { board: "PEGI", label: "12" },
      { board: "PEGI", label: "16" },
      { board: " ", label: "M" },
    ],
    keywords: ["Open world", "open world", ...Array.from({ length: 20 }, (_, index) => `Tag ${index}`)],
    multiplayer: { onlineCoop: true, onlineMax: 1, offlineMax: 4, campaignCoop: "yes" },
    releases: [
      { platform: "Windows", date: "2022-02-25", label: "ignored when dated" },
      { platform: "Windows", date: "2020-01-01" },
      { platform: "Switch", label: "Q4 2026" },
    ],
    timeToBeat: { hastily: 3600, normally: 0 },
  }, "igdb", "2026-01-01");

  assert.equal(game.aggregatedRating, 88.2);
  assert.equal(game.aggregatedRatingCount, undefined);
  assert.deepEqual(game.ageRatings, [{ board: "PEGI", label: "12" }]);
  assert.equal(game.keywords.length, 12);
  assert.deepEqual(game.multiplayer, { onlineCoop: true, offlineMax: 4 });
  assert.deepEqual(game.releases, [
    { platform: "Windows", date: "2022-02-25" },
    { platform: "Switch", label: "Q4 2026" },
  ]);
  assert.deepEqual(game.timeToBeat, { hastily: 3600 });
  assert.equal(formatPlayTime(180000), "50h");
  assert.equal(formatPlayTime(5400), "1.5h");
  assert.equal(formatPlayTime(90), "2m");
  assert.equal(formatPlayTime(0), "");
  assert.equal(formatReleaseDay("2022-02-25"), "25 Feb 2022");
  assert.equal(formatReleaseDay("2022-02-31"), "");
  assert.equal(formatCountLabel(1, "ratings"), "1 rating");
  assert.equal(formatCountLabel(2324, "reviews"), "2,324 reviews");
  assert.deepEqual(multiplayerPhrases(game.multiplayer), ["Online co-op", "Up to 4 players offline"]);
});

test("maps IGDB website types into wiki, guide, community, store, and official links", () => {
  const [game] = normalizeIgdbExport([
    {
      id: 9,
      name: "Linked",
      slug: "linked",
      platforms: [{ name: "PC" }],
      websites: [
        { name: "Official site", url: "https://example.com/game", category: 1 },
        { url: "https://store.steampowered.com/app/1", category: 13 },
        { url: "https://bulbapedia.bulbagarden.net/wiki/Pikachu", type: { id: 2, type: "wikia" } },
        { url: "https://en.wikipedia.org/wiki/Linked", category: 3 },
        { url: "https://www.reddit.com/r/linked", type: 14 },
        { url: "https://discord.gg/linked", category: 18 },
        { url: "https://example.com/guides", type: { id: 40, type: "GameFAQs" } },
        { url: "https://itch.io/embed-upload/1", category: 15 },
        { url: "https://bsky.app/profile/example", category: 19 },
        { url: "javascript:alert(1)" },
        { url: "https://en.wikipedia.org/wiki/Linked" },
      ],
    },
  ]);

  assert.deepEqual(game.websites, [
    { label: "Official website", url: "https://example.com/game", category: "website" },
    { label: "Steam", url: "https://store.steampowered.com/app/1", category: "store" },
    { label: "Wikia", url: "https://bulbapedia.bulbagarden.net/wiki/Pikachu", category: "wiki" },
    { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Linked", category: "wiki" },
    { label: "Reddit", url: "https://www.reddit.com/r/linked", category: "community" },
    { label: "Discord", url: "https://discord.gg/linked", category: "community" },
    { label: "GameFAQs", url: "https://example.com/guides", category: "guide" },
    { label: "itch.io", url: "https://itch.io/embed-upload/1", category: "store" },
    { label: "Bluesky", url: "https://bsky.app/profile/example", category: "website" },
  ]);
  assert.deepEqual(guideLinks(game.websites).map((link) => link.label), [
    "Wikia",
    "Wikipedia",
    "GameFAQs",
    "Discord",
    "Reddit",
  ]);
});

test("catalogue import classifies stored wiki and community urls", () => {
  const websites = [
    { label: "Official website", url: "https://en.wikipedia.org/wiki/Example", category: "website" },
    { label: "Official website", url: "https://example.fandom.com/wiki/Example", category: "website" },
    { label: "Official website", url: "http://witcher.wikia.com/wiki/Example", category: "website" },
    { label: "Official website", url: "https://eldenring.wiki.gg/", category: "website" },
    { label: "Official website", url: "https://discord.gg/example", category: "website" },
    { label: "Official website", url: "https://www.reddit.com/r/example", category: "website" },
    { label: "Official website", url: "https://store.steampowered.com/app/1", category: "website" },
    { label: "Press kit", url: "https://example.com/press", category: "website" },
    { label: "Bulbapedia", url: "https://bulbapedia.bulbagarden.net/wiki/Pikachu", category: "wiki" },
    { label: "Walkthrough", url: "https://example.com/walkthrough", category: "guide" },
    { label: "Nope", url: "notaurl" },
    { label: "Official website", url: "https://en.wikipedia.org/wiki/Example/", category: "website" },
  ];
  const overflow = Array.from({ length: 30 }, (_, index) => ({
    label: "Official website",
    url: `https://example.com/page-${index}`,
    category: "website",
  }));
  const game = normalizeExternalGame({
    id: "links",
    title: "Links",
    platforms: ["PC"],
    websites,
  }, "igdb", "2026-01-01");
  const capped = normalizeExternalGame({
    id: "capped",
    title: "Capped",
    platforms: ["PC"],
    websites: [
      ...overflow,
      { label: "Official website", url: "https://en.wikipedia.org/wiki/Kept", category: "website" },
    ],
  }, "igdb", "2026-01-01");

  assert.deepEqual(game.websites, [
    { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Example", category: "wiki" },
    { label: "Fandom", url: "https://example.fandom.com/wiki/Example", category: "wiki" },
    { label: "Wikia", url: "http://witcher.wikia.com/wiki/Example", category: "wiki" },
    { label: "Wiki", url: "https://eldenring.wiki.gg/", category: "wiki" },
    { label: "Discord", url: "https://discord.gg/example", category: "community" },
    { label: "Reddit", url: "https://www.reddit.com/r/example", category: "community" },
    { label: "Steam", url: "https://store.steampowered.com/app/1", category: "store" },
    { label: "Press kit", url: "https://example.com/press", category: "website" },
    { label: "Bulbapedia", url: "https://bulbapedia.bulbagarden.net/wiki/Pikachu", category: "wiki" },
    { label: "Walkthrough", url: "https://example.com/walkthrough", category: "guide" },
  ]);
  assert.deepEqual(guideLinks(game.websites).map((link) => [link.category, link.label]), [
    ["wiki", "Bulbapedia"],
    ["wiki", "Fandom"],
    ["wiki", "Wiki"],
    ["wiki", "Wikia"],
    ["wiki", "Wikipedia"],
    ["guide", "Walkthrough"],
    ["community", "Discord"],
    ["community", "Reddit"],
  ]);
  assert.equal(capped.websites.length, 24);
  assert.equal(capped.websites.some((link) => link.url === "https://en.wikipedia.org/wiki/Kept"), true);
  assert.equal(guideLinks([{ label: "Press kit", url: "https://example.com/press", category: "website" }]).length, 0);
});

test("maps navbar platform chips to IGDB platform variant labels", () => {
  assert.equal(resolveIgdbPlatform("PC (Microsoft Windows)").variant, "Windows");
  assert.equal(resolveIgdbPlatform("Nintendo Switch").family, "Switch");
  assert.equal(resolveIgdbPlatform("Sega Dreamcast").family, "Other");

  assert.equal(
    gameMatchesPlatformVariant({ platformVariants: ["PC (Microsoft Windows)", "Windows"] }, "Windows"),
    true,
  );
  assert.equal(
    gameMatchesPlatformVariant({ platformVariants: ["Nintendo Switch"] }, "Switch"),
    true,
  );
});

test("treats a single platform as exclusive and keeps other releases out", () => {
  const ps2 = { platforms: ["PS5"], platformVariants: ["PS2"] };
  const ps2AndPs3 = { platforms: ["PS5"], platformVariants: ["PS2", "PS3"] };
  const xboxGenerations = { platforms: ["Xbox"], platformVariants: ["Xbox One", "Xbox Series"] };
  const dreamcast = { platforms: ["Other"], platformVariants: ["Dreamcast"] };
  const segaPair = { platforms: ["Other"], platformVariants: ["Dreamcast", "Genesis"] };
  const windows = { platforms: ["PC"], platformVariants: ["Windows"] };
  const gameBoyAdvance = { platforms: ["Switch"], platformVariants: ["Game Boy Advance"] };

  assert.equal(gameIsPlatformExclusive(ps2, { platform: "PS5", variant: "PS2" }), true);
  assert.equal(gameIsPlatformExclusive(ps2AndPs3, { platform: "PS5", variant: "PS2" }), false);
  assert.equal(gameIsPlatformExclusive(ps2, { platform: "PS5", variant: null }), true);
  assert.equal(gameIsPlatformExclusive(ps2AndPs3, { platform: "PS5", variant: null }), true);
  assert.equal(gameIsPlatformExclusive(xboxGenerations, { platform: "Xbox", variant: "Xbox One" }), false);
  assert.equal(gameIsPlatformExclusive(xboxGenerations, { platform: "Xbox", variant: null }), true);
  assert.equal(gameIsPlatformExclusive(dreamcast, { platform: "Other", variant: "Dreamcast" }), true);
  assert.equal(gameIsPlatformExclusive(dreamcast, { platform: "Other", variant: "Sega" }), true);
  assert.equal(gameIsPlatformExclusive(segaPair, { platform: "Other", variant: "Dreamcast" }), false);
  assert.equal(gameIsPlatformExclusive(segaPair, { platform: "Other", variant: "Sega" }), true);
  assert.equal(gameIsPlatformExclusive(windows, { platform: "PC", variant: null }), false);
  assert.equal(gameIsPlatformExclusive(windows, { platform: "PC", variant: "Windows" }), false);
  assert.equal(gameIsPlatformExclusive(gameBoyAdvance, { platform: "Switch", variant: "Game Boy" }), true);
  assert.equal(isPcPlatformBrowse("PC", null), true);
  assert.equal(isPcPlatformBrowse("PS5", "PS2"), false);
  assert.equal(browseQuery({ family: "PlayStation", platform: "PS5", variant: "PS2", genre: "action" }), "/?family=PlayStation&platform=PS5&variant=PS2&genre=action");
});

test("description collapse is about 25 percent on desktop and 50 percent on mobile", () => {
  assert.equal(collapsedLineCount(8, true), 6);
  assert.equal(collapsedLineCount(8, false), 4);
  assert.equal(collapsedLineCount(1, true), 1);
  assert.equal(collapsedLineCount(1, false), 1);
  assert.equal(collapsedLineCount(3, false), 2);
  assert.equal(collapsedLineCount(2, true), 2);
  assert.equal(visibleLineCount(10, true, false), 10);
  assert.equal(visibleLineCount(10, false, false), 5);
});

test("studio pages group developed and published catalogue games", () => {
  const studios = collectStudios([
    {
      id: "1",
      title: "Alpha",
      rating: 90,
      releaseYear: 2001,
      developers: [{ id: "9", name: "Studio Nine" }],
      publishers: [{ id: "9", name: "Studio Nine" }],
      background: { url: "https://images.igdb.com/example.jpg" },
    },
    {
      id: "2",
      title: "Beta",
      rating: 70,
      releaseYear: 2010,
      publishers: [{ id: "9", name: "Studio Nine" }],
    },
  ]);
  assert.equal(studios.length, 1);
  assert.equal(studios[0].id, "9");
  assert.deepEqual(studios[0].gameIds, ["1", "2"]);
  assert.deepEqual(studios[0].notableTitles, ["Alpha"]);
  assert.equal(studios[0].backgroundUrl, "https://images.igdb.com/example.jpg");
  assert.equal(studioInitials("Studio Nine"), "SN");
  assert.equal(studioInitials("Nintendo"), "NI");
  assert.equal(studioMetadata({
    developedCount: 1,
    publishedCount: 2,
    gameCount: 2,
    yearStart: 2001,
    yearEnd: 2010,
  }), "Developer · Publisher · 2 games · 2001–2010");
  assert.match(describeStudio({
    name: "Studio Nine",
    developedCount: 1,
    publishedCount: 2,
    yearStart: 2001,
    yearEnd: 2010,
    notableTitles: ["Alpha"],
  }), /Studio Nine is a developer and publisher/);

  const catalogue = JSON.parse(readFileSync(path.join(root, "public/catalog/games-index.json"), "utf8"));
  const nintendo = collectStudios(catalogue.games).find((studio) => studio.id === "70");
  assert.ok(nintendo);
  assert.equal(nintendo.name, "Nintendo");
  assert.ok(nintendo.gameIds.length > 100);
  assert.match(nintendo.summary, /Nintendo is a developer and publisher/);
});

test("studio logos prefer a synced IGDB image and keep the local mark as fallback", () => {
  const logo = {
    url: "https://images.igdb.com/igdb/image/upload/t_logo_med/clnintendo.png",
    width: 400,
    height: 100,
  };
  const studios = collectStudios([
    {
      id: "1",
      title: "First",
      developers: [{ id: "70", name: "Nintendo" }],
    },
    {
      id: "2",
      title: "Second",
      publishers: [{ id: "70", name: "Nintendo", logo }],
    },
    {
      id: "3",
      title: "Third",
      developers: [{ id: "8", name: "Obscure Studio", logo: { url: "https://evil.example/logo.png" } }],
    },
  ]);
  const nintendo = studios.find((studio) => studio.id === "70");
  const obscure = studios.find((studio) => studio.id === "8");
  assert.deepEqual(nintendo.logo, logo);
  assert.equal(obscure.logo, undefined);

  const synced = resolveStudioLogo({ name: "Nintendo", logo });
  assert.equal(synced.source, "catalogue");
  assert.equal(synced.src, logo.url);
  assert.equal(synced.aspect, 4);

  const fallback = resolveStudioLogo({ name: "Nintendo" });
  assert.equal(fallback.source, "fallback");
  assert.equal(fallback.src, "/platforms/nintendo.svg");

  const rejected = resolveStudioLogo({
    name: "Nintendo",
    logo: { url: "https://evil.example/logo.png", width: 10, height: 10 },
  });
  assert.equal(rejected.source, "fallback");
  assert.equal(resolveStudioLogo({ name: "Obscure Studio" }), null);
  assert.equal(resolveStudioLogo({
    name: "Square",
    logo: { url: "//images.igdb.com/igdb/image/upload/t_thumb/clsq.jpg", width: 1, height: 10000 },
  }).aspect, 284 / 160);
  assert.deepEqual(
    catalogueCompanyLogo({ url: "//images.igdb.com/igdb/image/upload/t_thumb/clsq.jpg", width: 0 }),
    { url: "https://images.igdb.com/igdb/image/upload/t_logo_med/clsq.jpg" },
  );

  const imported = normalizeExternalGame({
    id: "logo-game",
    title: "Logo Game",
    platforms: ["PC"],
    developers: [
      { id: "70", name: "Nintendo", logo: { url: "//images.igdb.com/igdb/image/upload/t_thumb/clnintendo.png", width: 400, height: 100 } },
      { id: "8", name: "Obscure Studio", logo: { url: "javascript:alert(1)" } },
    ],
    publishers: [{ id: "9", name: "Plain" }],
  }, "igdb", "2026-01-01");
  assert.deepEqual(imported.developers, [
    { id: "70", name: "Nintendo", logo },
    { id: "8", name: "Obscure Studio" },
  ]);
  assert.deepEqual(imported.publishers, [{ id: "9", name: "Plain" }]);

  const shell = { genres: [], themes: [], platforms: [], source: [] };
  const merged = mergeGames(
    [{
      ...shell,
      id: "1",
      developers: [{ id: "70", name: "Nintendo", logo }],
      publishers: [{ id: "70", name: "Nintendo" }],
    }],
    [{
      ...shell,
      id: "1",
      developers: [{ id: "70", name: "Nintendo Co., Ltd." }],
      publishers: [{ id: "70", name: "Nintendo", logo: { url: "https://images.igdb.com/igdb/image/upload/t_logo_med/newer.png" } }],
    }],
  );
  assert.deepEqual(merged[0].developers, [{ id: "70", name: "Nintendo Co., Ltd.", logo }]);
  assert.deepEqual(merged[0].publishers, [{
    id: "70",
    name: "Nintendo",
    logo: { url: "https://images.igdb.com/igdb/image/upload/t_logo_med/newer.png" },
  }]);
});

test("franchise and collection pages group catalogue series", () => {
  const games = [
    {
      id: "1",
      title: "Alpha",
      rating: 90,
      releaseYear: 2001,
      franchises: ["Halo"],
      collections: ["Halo"],
      background: { url: "https://images.igdb.com/example.jpg" },
    },
    {
      id: "2",
      title: "Beta",
      rating: 70,
      releaseYear: 2010,
      franchises: ["Halo"],
      collections: ["Halo Wars"],
    },
  ];
  const franchises = collectSeries(games, "franchise");
  assert.equal(franchises.length, 1);
  assert.equal(franchises[0].id, "halo");
  assert.equal(franchises[0].kind, "franchise");
  assert.deepEqual(franchises[0].gameIds, ["1", "2"]);
  assert.deepEqual(franchises[0].notableTitles, ["Alpha", "Beta"]);
  assert.equal(franchises[0].backgroundUrl, "https://images.igdb.com/example.jpg");
  assert.equal(seriesSlug("Pokémon"), "pokemon");
  assert.equal(seriesSlug("Mario Bros."), "mario-bros");
  assert.equal(seriesSlug("The Legend of Zelda: Breath of the Wild"), "the-legend-of-zelda-breath-of-the-wild");
  assert.equal(seriesInitials("The Legend of Zelda"), "TL");
  assert.equal(seriesInitials("Halo"), "HA");
  assert.equal(seriesPath("franchise", "halo"), "/franchise/halo");
  assert.equal(seriesPath("collection", "halo-wars"), "/collection/halo-wars");
  assert.equal(seriesMetadata({
    kind: "franchise",
    gameCount: 2,
    yearStart: 2001,
    yearEnd: 2010,
  }), "Franchise · 2 games · 2001–2010");
  assert.match(describeSeries({
    name: "Halo",
    kind: "franchise",
    gameCount: 2,
    yearStart: 2001,
    yearEnd: 2010,
    notableTitles: ["Alpha", "Beta"],
  }), /Halo is a franchise in the GameVault catalogue, with 2 games/);

  const collections = collectSeries(games, "collection");
  assert.deepEqual(collections.map((series) => series.name), ["Halo", "Halo Wars"]);
  assert.deepEqual(collections.find((series) => series.name === "Halo")?.gameIds, ["1"]);

  const catalogue = JSON.parse(readFileSync(path.join(root, "public/catalog/games-index.json"), "utf8"));
  const catalogueFranchises = collectSeries(catalogue.games, "franchise");
  const catalogueCollections = collectSeries(catalogue.games, "collection");
  const halo = catalogueFranchises.find((series) => series.name === "Halo");
  const haloCollection = catalogueCollections.find((series) => series.name === "Halo");
  const zelda = catalogueFranchises.find((series) => series.name === "The Legend of Zelda");
  const breath = catalogueCollections.find((series) => series.name === "The Legend of Zelda: Breath of the Wild");
  assert.ok(halo);
  assert.ok(haloCollection);
  assert.ok(zelda);
  assert.ok(breath);
  assert.equal(halo.id, "halo");
  assert.equal(zelda.id, "the-legend-of-zelda");
  assert.equal(breath.id, "the-legend-of-zelda-breath-of-the-wild");
  assert.ok(halo.gameIds.length > haloCollection.gameIds.length);
  assert.ok(breath.gameIds.includes("7346"));
  assert.match(halo.summary, /Halo is a franchise/);
  assert.match(breath.summary, /The Legend of Zelda: Breath of the Wild is a collection/);
  for (const group of [catalogueFranchises, catalogueCollections]) {
    const ids = group.map((series) => series.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(group.every((series) => series.id === seriesSlug(series.name) || series.id.startsWith(`${seriesSlug(series.name)}-`)));
  }
});

test("search treats catalogue entries listed as DLC or expansions as DLC", () => {
  const catalogue = JSON.parse(readFileSync(path.join(root, "public/catalog/games-index.json"), "utf8"));
  const ids = collectDownloadableIds(catalogue.games);
  const byTitle = (title) => catalogue.games.find((game) => game.title === title);
  const citadel = byTitle("Mass Effect 3: Citadel");
  const phantom = byTitle("Cyberpunk 2077: Phantom Liberty");
  const cyberpunk = byTitle("Cyberpunk 2077");
  const bloodborne = byTitle("Bloodborne");

  assert.ok(citadel);
  assert.ok(phantom);
  assert.ok(cyberpunk);
  assert.ok(bloodborne);
  assert.equal(ids.has(citadel.id), true);
  assert.equal(ids.has(phantom.id), true);
  assert.equal(ids.has(cyberpunk.id), false);
  assert.equal(ids.has(bloodborne.id), false);

  const split = partitionDownloadableContent([cyberpunk, citadel, bloodborne, phantom], ids);
  assert.deepEqual(split.games.map((game) => game.id), [cyberpunk.id, bloodborne.id]);
  assert.deepEqual(split.dlc.map((game) => game.id), [citadel.id, phantom.id]);

  const gamesOnly = partitionDownloadableContent([cyberpunk, bloodborne], ids);
  assert.equal(gamesOnly.dlc.length, 0);
  assert.deepEqual(gamesOnly.games.map((game) => game.id), [cyberpunk.id, bloodborne.id]);
});

test("genre browse uses catalogue tags and keeps plot text out of action", () => {
  assert.equal(gameMatchesGenre({ title: "A", genres: ["Shooter"], themes: ["Action"] }, "action"), true);
  assert.equal(gameMatchesGenre({ title: "B", genres: ["Puzzle"], themes: [], summary: "fast action" }, "action"), false);
  assert.equal(gameMatchesGenre({ title: "C", genres: ["Role-playing (RPG)"], themes: [] }, "rpg"), true);
  assert.equal(gameMatchesGenre({ title: "D", genres: ["Indie"], themes: [] }, "Indie Favorites"), true);
  assert.equal(gameMatchesGenre({ title: "E", genres: ["Adventure"], themes: [], summary: "online co-op" }, "multiplayer"), true);
  assert.equal(gameMatchesGenre({ title: "F", genres: ["Quiz/Trivia"], themes: [] }, "Quiz/Trivia"), true);
});

test("imports sega-only IGDB platforms into the Other family", () => {
  const [game] = normalizeIgdbExport([
    {
      id: 42,
      name: "Sonic Adventure",
      slug: "sonic-adventure",
      platforms: [{ name: "Dreamcast" }],
    },
  ]);

  assert.equal(game.id, "42");
  assert.deepEqual(game.platforms, ["Other"]);
  assert.deepEqual(game.platformVariants, ["Dreamcast"]);
  assert.deepEqual(game.warnings, []);
});

test("search terms keep phrase matches and hyphenated words", () => {
  assert.equal(matchesSearchTerms("halo infinite chief", "halo"), true);
  assert.equal(matchesSearchTerms("god of war", "god of war"), true);
  assert.equal(matchesSearchTerms("role playing rpg", "role-playing"), true);
  assert.equal(matchesSearchTerms("castle action", "god of war"), false);
});

test("browse index stays a light card catalogue", () => {
  const catalogue = JSON.parse(readFileSync(path.join(root, "public/catalog/games-index.json"), "utf8"));
  const browse = JSON.parse(readFileSync(path.join(root, "public/catalog/browse-index.json"), "utf8"));
  assert.equal(browse.schemaVersion, 1);
  assert.equal(browse.games.length, catalogue.games.length);
  assert.deepEqual(browse.games.map((game) => game.id), catalogue.games.map((game) => game.id));
  const heavy = ["description", "summary", "screenshots", "similarGames", "videos", "websites", "dlc", "keywords", "releases", "timeToBeat", "ageRatings", "aggregatedRating"];
  for (const field of heavy) assert.equal(browse.games.some((game) => field in game), false, field);
  const bytes = readFileSync(path.join(root, "public", "catalog", "browse-index.json")).length;
  assert.ok(bytes < 2_500_000, `browse index is ${bytes} bytes`);

  const byId = new Map(browse.games.map((game) => [game.id, game]));
  const downloadable = collectDownloadableIds(catalogue.games);
  for (const game of catalogue.games) {
    const card = byId.get(game.id);
    assert.equal(Boolean(card.downloadable), downloadable.has(game.id));
    assert.equal(Boolean(card.multiplayer), gameMatchesGenre(game, "multiplayer"));
  }
});

test("search index rebuild is idempotent against the committed catalogue", () => {
  const searchIndexPath = path.join(root, "public", "catalog", "search-index.json");
  const browseIndexPath = path.join(root, "public", "catalog", "browse-index.json");
  const searchBefore = readFileSync(searchIndexPath, "utf8");
  const browseBefore = readFileSync(browseIndexPath, "utf8");
  const result = spawnSync(process.execPath, ["scripts/build-search-index.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(searchIndexPath, "utf8"), searchBefore);
  assert.equal(readFileSync(browseIndexPath, "utf8"), browseBefore);
});

test("demo catalogue generation does not overwrite the published IGDB index", () => {
  const publishedPath = path.join(root, "public", "catalog", "games-index.json");
  const before = readFileSync(publishedPath, "utf8");
  const result = spawnSync(process.execPath, ["scripts/generate-catalogue.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(publishedPath, "utf8"), before);
});

test("resolves similar-game ids to catalogue entries without guessing by title", () => {
  const catalogue = [
    { id: "7346", title: "Breath of the Wild", source: [{ id: "7346" }] },
    { id: "222486", title: "Silent Hill 3", source: [{ id: "igdb-remaster" }] },
    { id: "other", title: "Silent Hill 3", source: [{ id: "unused" }] },
  ];

  assert.equal(findCatalogueEntry(catalogue, "7346")?.id, "7346");
  assert.equal(findCatalogueEntry(catalogue, "igdb-remaster")?.id, "222486");
  assert.equal(findCatalogueEntry(catalogue, "482"), undefined);
  assert.equal(
    findCatalogueEntry(
      [
        { id: "canonical", title: "Shared", source: [{ id: "canonical" }] },
        { id: "other", title: "Shared", source: [{ id: "canonical" }] },
      ],
      "canonical",
    )?.id,
    "canonical",
  );
});

test("normalizes protocol-relative media URLs before they are rendered", () => {
  const game = normalizeExternalGame({
    id: "protocol-relative",
    title: "Protocol Relative",
    platforms: ["PC"],
    cover: "//images.igdb.com/igdb/image/upload/t_cover_big/example.jpg",
    screenshots: [{ url: "//images.igdb.com/igdb/image/upload/t_screenshot_big/example.jpg", width: 1920, height: 1080 }],
  }, "igdb", "2026-01-01");

  assert.equal(game.cover.url, "https://images.igdb.com/igdb/image/upload/t_cover_big/example.jpg");
  assert.equal(game.screenshots[0].url, "https://images.igdb.com/igdb/image/upload/t_screenshot_big/example.jpg");
});

test("rejects malformed provider exports", () => {
  assert.throws(() => normalizeIgdbExport({ games: "not-an-array" }), /games array/);
});

test("imports an IGDB fixture through the CLI and records provenance", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gamevault-catalogue-"));
  const outputPath = path.join(directory, "index.json");
  const reportPath = path.join(directory, "quality.json");
  const result = spawnSync(process.execPath, [
    "scripts/import-catalogue.mjs",
    "--input",
    "test/fixtures/igdb-export.json",
    "--provider",
    "igdb",
    "--source-version",
    "fixture-2026",
    "--output",
    outputPath,
    "--report",
    reportPath,
  ], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  const imported = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(imported.provenance.provider, "igdb");
  assert.equal(imported.provenance.sourceVersion, "fixture-2026");
  assert.equal(imported.provenance.sourceChecksum.length, 64);
  assert.equal(imported.games[0].aggregatedRating, 94.2);
  assert.equal(imported.games[0].ageRatings[0].board, "PEGI");
  assert.equal(imported.games[0].timeToBeat.normally, 270000);
  assert.deepEqual(imported.games[0].websites, [{
    label: "Official website",
    url: "https://example.com/bg3",
    category: "website",
  }]);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.deepEqual(report.warnings, []);
  await rm(directory, { recursive: true, force: true });
});

test("rejects duplicate IDs through the CLI", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gamevault-catalogue-"));
  const inputPath = path.join(directory, "duplicates.json");
  await writeFile(inputPath, JSON.stringify([
    { id: "duplicate", title: "One", platforms: ["PC"] },
    { id: "duplicate", title: "Two", platforms: ["PC"] },
  ]));
  const result = spawnSync(process.execPath, [
    "scripts/import-catalogue.mjs",
    "--input",
    inputPath,
    "--output",
    path.join(directory, "index.json"),
  ], { encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate imported game id/);
  await rm(directory, { recursive: true, force: true });
});

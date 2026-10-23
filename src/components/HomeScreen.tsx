"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import GameWall from "@/components/GameWall";
import {
  Platform,
  Game,
  allGames,
  getGamesByPlatform,
  recentlyPlayed,
  searchGames,
} from "@/data/games";
import { gameMatchesPlatformVariant, isPcPlatformBrowse, gameIsPlatformExclusive } from "@/data/platforms";
import { GENRE_DEFINITIONS, browseQuery, byRatingThenTitle, gameMatchesGenre, genreLabel } from "@/data/browse";
import { useLibrary } from "@/context/LibraryContext";

const catalogueHasVariants = allGames.some((game) => (game.platformVariants?.length ?? 0) > 0);
const platforms: readonly Platform[] = ["PC", "PS5", "Xbox", "Switch", "Other"];

function readPlatform(value: string | null): Platform | null {
  return platforms.find((platform) => platform === value) ?? null;
}

function onThisPlatform(game: Game, platform: Platform | null, variant: string | null) {
  if (variant && catalogueHasVariants) return gameMatchesPlatformVariant(game, variant);
  if (platform) return game.platforms.includes(platform);
  return true;
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const urlSearch = params.get("search") ?? "";
  const [draftSearch, setDraftSearch] = useState(urlSearch);
  const [trackedUrlSearch, setTrackedUrlSearch] = useState(urlSearch);
  if (urlSearch !== trackedUrlSearch) {
    setTrackedUrlSearch(urlSearch);
    if (urlSearch === "" || !(draftSearch.startsWith(urlSearch) || urlSearch.startsWith(draftSearch))) {
      setDraftSearch(urlSearch);
    }
  }
  const searchQuery = draftSearch;
  const family = params.get("family");
  const variant = params.get("variant");
  const platform = readPlatform(params.get("platform"));
  const genreKey = params.get("genre");
  const exclusivesRequested = params.get("exclusives") === "1";
  const { entries } = useLibrary();

  useEffect(() => {
    const next = draftSearch.trim();
    if (next === urlSearch) return;
    const handle = window.setTimeout(() => {
      const current = new URLSearchParams(window.location.search);
      if (current.get("genre") || current.get("exclusives")) return;
      router.replace(browseQuery({
        search: next,
        family: current.get("family"),
        platform: current.get("platform"),
        variant: current.get("variant"),
      }), { scroll: false });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draftSearch, router, urlSearch]);

  const playing = Object.entries(entries)
    .filter(([, entry]) => entry.status === "playing")
    .map(([gameId]) => allGames.find((game) => game.id === gameId))
    .filter((game): game is Game => Boolean(game));
  const continueGames = playing.length > 0 ? playing : recentlyPlayed;

  const place = variant || family || platform;
  const pcBrowse = isPcPlatformBrowse(platform, variant);
  const libraryHref = browseQuery({ family, platform, variant });
  const trimmedSearch = searchQuery.trim();

  const exclusiveList = trimmedSearch || genreKey || pcBrowse || (!platform && !variant)
    ? []
    : allGames
        .filter((game) => gameIsPlatformExclusive(game, { platform, variant }))
        .sort(byRatingThenTitle);

  const genreGames = trimmedSearch || !genreKey
    ? []
    : allGames
        .filter((game) => gameMatchesGenre(game, genreKey) && onThisPlatform(game, platform, variant))
        .sort(byRatingThenTitle);

  const genreRows = trimmedSearch || genreKey
    ? []
    : GENRE_DEFINITIONS.map((definition) => {
        const matches = allGames
          .filter((game) => gameMatchesGenre(game, definition.key) && onThisPlatform(game, platform, variant))
          .sort(byRatingThenTitle);
        return { definition, preview: matches.slice(0, 12) };
      });

  const platformGames = variant
    ? allGames.filter((game) => gameMatchesPlatformVariant(game, variant))
    : platform
      ? getGamesByPlatform(platform)
      : [];

  const topGames = [...platformGames].sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));

  const searchResults = (() => {
    if (!trimmedSearch) return [];
    const matches = new Set(searchGames(trimmedSearch).map((game) => game.id));
    return allGames.filter((game) => matches.has(game.id) && onThisPlatform(game, platform, variant));
  })();

  const catalogueLabel = place;
  const searching = trimmedSearch.length > 0;
  const wall = searching
    ? {
        key: `search:${searchQuery}:${place ?? ""}`,
        title: `Search results for "${searchQuery.trim()}"`,
        games: searchResults,
      }
    : genreKey
      ? {
          key: `genre:${genreKey}:${place ?? ""}`,
          title: place ? `${genreLabel(genreKey)} on ${place}` : genreLabel(genreKey),
          games: genreGames,
        }
      : exclusivesRequested && !pcBrowse
        ? {
            key: `exclusives:${place ?? ""}`,
            title: place ? `${place} Exclusives` : "Exclusives",
            games: exclusiveList,
          }
        : null;

  const featuredGame = platformGames[0] || continueGames[0];

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Navbar searchQuery={urlSearch} onSearch={setDraftSearch} />

      <main id="main-content" className="flex-1">
        {wall ? (
          <GameWall
            key={wall.key}
            title={wall.title}
            games={wall.games}
            resetKey={wall.key}
            backHref={libraryHref}
            backLabel={place ? `Back to ${place}` : "All games"}
          />
        ) : (
          <>
            <Hero
              featuredGame={featuredGame}
              featuredGames={variant ? platformGames.slice(0, 8) : continueGames.filter((game) => onThisPlatform(game, platform, variant))}
              selectedPlatform={platform}
            />
            {catalogueLabel && (
              topGames.length > 0 ? (
                <GameRow title={`${catalogueLabel} Top Games`} games={topGames} />
              ) : (
                <p className="mx-auto mb-10 max-w-[1920px] px-4 text-sm text-muted sm:px-6 lg:px-8">
                  No games in the catalogue match {catalogueLabel}.
                </p>
              )
            )}
            {!pcBrowse && exclusiveList.length > 0 && place && (
              <GameRow
                title={`${place} Exclusives`}
                games={exclusiveList.slice(0, 12)}
                titleHref={browseQuery({ family, platform, variant, exclusives: true })}
              />
            )}
            <GameRow
              title="Featured Games"
              games={continueGames.filter((game) => onThisPlatform(game, platform, variant))}
              size="lg"
            />
            {genreRows.map((row) => (
              <GameRow
                key={row.definition.key}
                title={row.definition.label}
                games={row.preview}
                titleHref={browseQuery({ family, platform, variant, genre: row.definition.key })}
              />
            ))}
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-white/5 px-4 py-6 text-center text-sm text-muted sm:mt-16 sm:py-8">
        <p className="px-2 text-xs opacity-60 sm:text-sm">
          Built with Next.js + Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

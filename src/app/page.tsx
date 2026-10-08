"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import { Platform, Game, allGames, getGamesByPlatform, recentlyPlayed, actionGames, rpgGames, indieGames, multiplayerGames, searchGames } from "@/data/games";
import LibraryToolbar from "@/components/LibraryToolbar";

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("search");
    if (query) {
      // Hydrate search links after the server-rendered homepage is mounted.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(query);
    }
  }, []);

  // Filter games based on selected platform and search query.
  const filterGames = (games: Game[]) => {
    let filtered = [...games];

    if (selectedPlatform) {
      filtered = filtered.filter((game) => game.platforms.includes(selectedPlatform));
    }

    if (searchQuery.trim()) {
      const matches = new Set(searchGames(searchQuery).map((game) => game.id));
      filtered = filtered.filter((game) => matches.has(game.id));
    }

    return filtered;
  };

  // Get featured game based on selected platform
  const getFeaturedGame = () => {
    if (selectedPlatform) {
      return getGamesByPlatform(selectedPlatform)[0] || recentlyPlayed[0];
    }
    return recentlyPlayed[0];
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Navbar onPlatformSelect={setSelectedPlatform} onSearch={setSearchQuery} />

      <main id="main-content" className="flex-1">
        <LibraryToolbar />
        {!searchQuery.trim() && (
          <Hero featuredGame={getFeaturedGame()} selectedPlatform={selectedPlatform} />
        )}

        {searchQuery.trim() ? (
          <>
            <GameRow
              title={`Search results for "${searchQuery.trim()}"`}
              games={filterGames(allGames)}
              size="lg"
            />
            {filterGames(allGames).length === 0 && (
              <p className="mx-auto mb-10 max-w-[1920px] px-4 text-sm text-muted sm:px-6 lg:px-8">
                No games in the imported catalogue match that search.
              </p>
            )}
          </>
        ) : (
          <>
            <GameRow
              title="Featured Games"
              games={filterGames(recentlyPlayed)}
              size="lg"
            />

            <GameRow title="Action" games={filterGames(actionGames)} />

            <GameRow title="RPG" games={filterGames(rpgGames)} />

            <GameRow title="Indie Favorites" games={filterGames(indieGames)} />

            <GameRow title="Multiplayer" games={filterGames(multiplayerGames)} />

            {selectedPlatform && (
              <GameRow
                title={`${selectedPlatform} Top Games`}
                games={filterGames(getGamesByPlatform(selectedPlatform))}
              />
            )}
          </>
        )}
      </main>

      {/* Responsive footer: smaller on mobile, sticks to bottom on tall screens */}
      <footer className="mt-12 border-t border-white/5 px-4 py-6 text-center text-sm text-muted sm:mt-16 sm:py-8">
        <p className="px-2 leading-relaxed">
          GameVault — Jellyfin / Emby style game library
        </p>
        <p className="mt-1 px-2 text-xs opacity-60 sm:text-sm">
          Built with Next.js + Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

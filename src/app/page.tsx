"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import { Platform, Game, allGames, getGamesByPlatform, getGamesByPlatformLabel, recentlyPlayed, actionGames, rpgGames, indieGames, multiplayerGames, searchGames } from "@/data/games";

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedPlatformFamily, setSelectedPlatformFamily] = useState<string | null>(null);
  const [selectedPlatformVariant, setSelectedPlatformVariant] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasPlatformVariantData = allGames.some((game) => (game.platformVariants?.length ?? 0) > 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("search");
    const platform = params.get("platform");
    const family = params.get("family");
    const variant = params.get("variant");
    if (query) {
      // Hydrate links opened from a game page after the homepage is mounted.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(query);
    }
    if (platform === "PC" || platform === "PS5" || platform === "Xbox" || platform === "Switch") {
      setSelectedPlatform(platform);
    }
    if (family) setSelectedPlatformFamily(family);
    if (variant) setSelectedPlatformVariant(variant);
  }, []);

  // Filter games based on selected platform and search query.
  const filterGames = (games: Game[]) => {
    let filtered = [...games];

    if (selectedPlatformVariant && hasPlatformVariantData) {
      const variantIds = new Set(getGamesByPlatformLabel(selectedPlatformVariant).map((game) => game.id));
      filtered = filtered.filter((game) => variantIds.has(game.id));
    } else if (selectedPlatform) {
      filtered = filtered.filter((game) => game.platforms.includes(selectedPlatform));
    }

    if (searchQuery.trim()) {
      const matches = new Set(searchGames(searchQuery).map((game) => game.id));
      filtered = filtered.filter((game) => matches.has(game.id));
    }

    return filtered;
  };

  const variantGames = selectedPlatformVariant ? getGamesByPlatformLabel(selectedPlatformVariant) : [];
  const platformLabel = selectedPlatformVariant ?? selectedPlatform ?? selectedPlatformFamily;
  const topGames = [...(selectedPlatformVariant
    ? variantGames
    : selectedPlatform
      ? filterGames(getGamesByPlatform(selectedPlatform))
      : selectedPlatformFamily
        ? filterGames(allGames)
        : [])].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  // Get featured game based on selected platform
  const getFeaturedGame = () => {
    if (selectedPlatformVariant && variantGames.length > 0) return variantGames[0];
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

      <Navbar
        onPlatformFamilySelect={setSelectedPlatformFamily}
        onPlatformSelect={(platform) => {
          setSelectedPlatform(platform);
          setSelectedPlatformVariant(null);
        }}
        onPlatformVariantSelect={setSelectedPlatformVariant}
        onSearch={setSearchQuery}
      />

      <main id="main-content" className="flex-1">
        {platformLabel && !searchQuery.trim() && (
          topGames.length > 0 ? (
            <div className="pt-6">
              <GameRow title={`${platformLabel} Top Games`} games={topGames} />
            </div>
          ) : (
            <p className="mx-auto mb-10 max-w-[1920px] px-4 pt-6 text-sm text-muted sm:px-6 lg:px-8">
              No games in the catalogue match {platformLabel}.
            </p>
          )
        )}
        {!searchQuery.trim() && (
          <Hero
            featuredGame={getFeaturedGame()}
            featuredGames={selectedPlatformVariant ? variantGames.slice(0, 8) : filterGames(recentlyPlayed)}
            selectedPlatform={selectedPlatform}
          />
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
          </>
        )}
      </main>

      {/* Responsive footer: smaller on mobile, sticks to bottom on tall screens */}
      <footer className="mt-12 border-t border-white/5 px-4 py-6 text-center text-sm text-muted sm:mt-16 sm:py-8">
        <p className="px-2 text-xs opacity-60 sm:text-sm">
          Built with Next.js + Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

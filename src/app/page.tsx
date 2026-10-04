"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import { Platform, PLATFORM_COLORS, Game, getGamesByPlatform, recentlyPlayed, actionGames, rpgGames, indieGames, multiplayerGames } from "@/data/games";
import LibraryToolbar from "@/components/LibraryToolbar";

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter games based on selected platform and search query
  const filterGames = (games: Game[]) => {
    let filtered = [...games];
    
    // Filter by platform
    if (selectedPlatform) {
      filtered = filtered.filter(game => game.platforms.includes(selectedPlatform));
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game => 
        game.title.toLowerCase().includes(query) ||
        game.genres.some((genre) => genre.toLowerCase().includes(query)) ||
        game.themes.some((theme) => theme.toLowerCase().includes(query)) ||
        game.developers.some((company) => company.name.toLowerCase().includes(query)) ||
        game.publishers.some((company) => company.name.toLowerCase().includes(query)) ||
        game.franchises.some((franchise) => franchise.toLowerCase().includes(query)) ||
        game.collections.some((collection) => collection.toLowerCase().includes(query))
      );
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

  // Apply platform theme color to document
  const themeColor = selectedPlatform ? PLATFORM_COLORS[selectedPlatform] : PLATFORM_COLORS.PC;

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
        <Hero featuredGame={getFeaturedGame()} selectedPlatform={selectedPlatform} />

        <GameRow
          title="Featured Games"
          games={filterGames(recentlyPlayed)}
          size="lg"
        />

        <GameRow title="Action" games={filterGames(actionGames)} />

        <GameRow title="RPG" games={filterGames(rpgGames)} />

        <GameRow title="Indie Favorites" games={filterGames(indieGames)} />

        <GameRow title="Multiplayer" games={filterGames(multiplayerGames)} />
        
        {/* Platform-specific sections */}
        {selectedPlatform && (
          <GameRow 
            title={`${selectedPlatform} Top Games`} 
            games={filterGames(getGamesByPlatform(selectedPlatform))}
            size="lg"
          />
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

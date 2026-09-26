import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import {
  recentlyPlayed,
  actionGames,
  rpgGames,
  indieGames,
  multiplayerGames,
} from "@/data/games";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" className="flex-1">
        <Hero />

        <GameRow
          title="Continue Playing"
          games={recentlyPlayed}
          showProgress
          size="lg"
        />

        <GameRow title="Action" games={actionGames} />

        <GameRow title="RPG" games={rpgGames} />

        <GameRow title="Indie Favorites" games={indieGames} />

        <GameRow title="Multiplayer" games={multiplayerGames} />
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

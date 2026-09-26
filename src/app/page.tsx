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
    <div className="min-h-screen">
      <Navbar />

      <main>
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

      <footer className="mt-10 border-t border-white/5 py-6 text-center text-xs text-muted sm:mt-16 sm:py-8 sm:text-sm">
        <p>GameVault — Jellyfin / Emby style landscape game library</p>
        <p className="mt-1 opacity-60">Built with Next.js + Tailwind CSS</p>
      </footer>
    </div>
  );
}

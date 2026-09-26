"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import { allGames } from "@/data/games";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pb-16">
        <Hero />

        <GameRow
          title="Continue Playing"
          games={allGames.filter((g) => g.progress !== undefined)}
          showProgress
          size="lg"
        />

        <GameRow title="All Games" games={allGames} />
      </main>

      <footer className="mt-16 border-t border-white/5 py-8 text-center text-sm text-muted">
        <p>GameVault — Jellyfin / Emby style landscape game library</p>
        <p className="mt-1 opacity-60">Built with Next.js + Tailwind CSS</p>
      </footer>
    </div>
  );
}

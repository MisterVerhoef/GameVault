"use client";

import Image from "next/image";
import Link from "next/link";
import { Game, recentlyPlayed, Platform, PLATFORM_COLORS, formatRating } from "@/data/games";
import { useState, useSyncExternalStore } from "react";

interface HeroProps {
  featuredGame?: Game;
  featuredGames?: Game[];
  selectedPlatform?: Platform | null;
}

function getHighQualityCoverUrl(url: string) {
  return url.includes("images.igdb.com/igdb/image/upload/")
    ? url.replace(/\/t_[^/]+\//, "/t_cover_big_2x/")
    : url;
}

export default function Hero({ featuredGame, featuredGames = recentlyPlayed, selectedPlatform }: HeroProps) {
  const availableGames = featuredGames.length > 0 ? featuredGames : [featuredGame || recentlyPlayed[0]];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const featured = availableGames[Math.min(selectedIndex, availableGames.length - 1)];
  const coverUrl = featured.cover?.url ? getHighQualityCoverUrl(featured.cover.url) : undefined;
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  
  // Get primary platform for theming (use selected platform or first platform of the game)
  const primaryPlatform: Platform = selectedPlatform || featured.platforms[0];
  const themeColor = PLATFORM_COLORS[primaryPlatform];

  return (
    <section className="relative mb-10 overflow-hidden">
      {/* Background blur of cover */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
        <div className="relative h-full w-full overflow-hidden">
          {isHydrated && coverUrl && (
            <Image
              src={coverUrl}
              alt=""
              fill
              className="object-cover opacity-30 blur-2xl scale-110"
              unoptimized
              priority
            />
          )}
        </div>
      </div>

      <div className="relative mx-auto flex max-w-[1920px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-[30px] lg:flex-row lg:items-end lg:gap-10 lg:px-8 lg:py-12">
        {/* Cover art — centered on mobile, side on desktop */}
      <Link
        href={`/game/${featured.id}`}
        aria-label={`Open ${featured.title} details`}
        className="group relative mx-auto block h-[156px] w-[108px] flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 transition hover:ring-2 hover:ring-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-[216px] sm:w-36 lg:mx-0 lg:h-60 lg:w-[168px]"
        style={{ borderColor: `${themeColor}33` }}
      >
        {isHydrated && coverUrl && (
          <Image
            src={coverUrl}
            alt={featured.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
            priority
          />
        )}
      </Link>

        {/* Info */}
        <div className="relative z-10 flex flex-1 flex-col gap-3 text-center lg:text-left">
          <p className="text-sm font-medium uppercase tracking-wider" style={{ color: themeColor }}>
            Featured Game
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {featured.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted lg:justify-start">
            <span>{featured.releaseYear}</span>
            <span aria-hidden="true">2</span>
            <span className="text-yellow-400" aria-label={`Rating ${formatRating(featured.rating)} out of 10`}>
              <span aria-hidden="true">★ </span>
              {formatRating(featured.rating)}
            </span>
            <span aria-hidden="true">2</span>
            <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
              {Array.from(new Set(featured.platforms)).map((p: Platform) => (
                <span
                  key={p}
                  className="rounded bg-white/10 px-2 py-0.5 text-xs"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background" style={{ borderColor: `${themeColor}33` }}>
              Details
            </button>
          </div>
        </div>

        {availableGames.length > 1 && (
          <div className="flex items-center justify-center gap-2 lg:absolute lg:bottom-6 lg:right-8" aria-label="Featured title selector">
            <button
              type="button"
              onClick={() => setSelectedIndex((index) => (index - 1 + availableGames.length) % availableGames.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Previous featured title"
            >
              <span aria-hidden="true">←</span>
            </button>
            <div className="flex max-w-[min(60vw,28rem)] gap-1 overflow-x-auto px-1 py-1">
              {availableGames.map((game, index) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`Show featured title ${index + 1}: ${game.title}`}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  className={`max-w-32 truncate rounded-full px-2.5 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    index === selectedIndex
                      ? "bg-accent text-white"
                      : "bg-card/70 text-muted hover:text-foreground"
                  }`}
                >
                  {game.title}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelectedIndex((index) => (index + 1) % availableGames.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Next featured title"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

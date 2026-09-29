"use client";

import Image from "next/image";
import { Game, recentlyPlayed, Platform, PLATFORM_COLORS } from "@/data/games";

interface HeroProps {
  featuredGame?: Game;
  selectedPlatform?: Platform | null;
}

export default function Hero({ featuredGame, selectedPlatform }: HeroProps) {
  const featured = featuredGame || recentlyPlayed[0];
  
  // Get primary platform for theming (use selected platform or first platform of the game)
  const primaryPlatform: Platform = selectedPlatform || featured.platforms[0];
  const themeColor = PLATFORM_COLORS[primaryPlatform];

  return (
    <section className="relative mb-10 overflow-hidden">
      {/* Background blur of cover */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      </div>
      
      {/* Background image container - relative for Image fill */}
      <div className="relative h-full w-full">
        <Image
          src={featured.cover}
          alt=""
          fill
          className="object-cover opacity-30 blur-2xl scale-110"
          unoptimized
          priority
        />
      </div>

      <div className="relative mx-auto flex max-w-[1920px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-end lg:gap-10 lg:px-8 lg:py-16">
        {/* Cover art — centered on mobile, side on desktop */}
        <div className="mx-auto h-52 w-36 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:h-72 sm:w-48 lg:mx-0 lg:h-80 lg:w-56" style={{ borderColor: `${themeColor}33` }}>
          <Image
            src={featured.cover}
            alt={featured.title}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-3 text-center lg:text-left">
          <p className="text-sm font-medium uppercase tracking-wider" style={{ color: themeColor }}>
            Featured Game
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {featured.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted lg:justify-start">
            <span>{featured.year}</span>
            <span aria-hidden="true">•</span>
            <span className="text-yellow-400" aria-label={`Rating ${featured.rating} out of 10`}>
              <span aria-hidden="true">★ </span>
              {featured.rating}
            </span>
            <span aria-hidden="true">•</span>
            <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
              {featured.platforms.map((p: Platform) => (
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
      </div>
    </section>
  );
}

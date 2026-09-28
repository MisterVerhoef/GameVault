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
        <Image
          src={featured.cover}
          alt=""
          fill
          className="object-cover opacity-30 blur-2xl scale-110"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
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
            Continue Playing
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

          {/* Progress */}
          {featured.progress !== undefined && (
            <div className="mt-1 mx-auto w-full max-w-xs lg:mx-0">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span id="hero-progress-label">Progress</span>
                <span aria-hidden="true">{featured.progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-labelledby="hero-progress-label"
                aria-valuenow={featured.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${featured.progress}%`, backgroundColor: themeColor }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background" style={{ backgroundColor: themeColor }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
            <button className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background" style={{ borderColor: `${themeColor}33` }}>
              Details
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

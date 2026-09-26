"use client";

import Image from "next/image";
import { recentlyPlayed } from "@/data/games";

export default function Hero() {
  const featured = recentlyPlayed[0];

  return (
    <section className="relative mb-10 overflow-hidden">
      {/* Background blur of cover */}
      <div className="absolute inset-0">
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
        <div className="mx-auto h-52 w-36 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:h-72 sm:w-48 lg:mx-0 lg:h-80 lg:w-56">
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
          <p className="text-sm font-medium uppercase tracking-wider text-accent">
            Continue Playing
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {featured.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted lg:justify-start">
            <span>{featured.year}</span>
            <span>•</span>
            <span className="text-yellow-400">★ {featured.rating}</span>
            <span>•</span>
            <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
              {featured.platforms.map((p) => (
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
                <span>Progress</span>
                <span>{featured.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${featured.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
            <button className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium transition hover:bg-white/10">
              Details
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

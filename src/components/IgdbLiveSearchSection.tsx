"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogueCard } from "@/data/catalogue-card";

interface IgdbLiveSearchSectionProps {
  loading: boolean;
  games: CatalogueCard[];
}

export default function IgdbLiveSearchSection({ loading, games }: IgdbLiveSearchSectionProps) {
  if (!loading && games.length === 0) return null;

  return (
    <section aria-labelledby="igdb-live-search" className="border-t border-white/10 pt-8">
      <div className="mb-4 px-4 sm:px-6 lg:px-8">
        <h2 id="igdb-live-search" className="text-lg font-bold tracking-tight text-foreground">
          Meer op IGDB
        </h2>
        {loading ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent"
              aria-hidden="true"
            />
            Zoeken…
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">{games.length === 1 ? "1 resultaat" : `${games.length} resultaten`}</p>
        )}
      </div>
      {loading && games.length === 0 ? (
        <div className="px-4 sm:px-6 lg:px-8">
          <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 sm:gap-x-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className="min-w-0">
                <span className="relative block aspect-[3/4] animate-pulse overflow-hidden rounded-md bg-card ring-1 ring-white/10" />
                <span className="mt-1 block h-8 rounded bg-card/80" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8">
          <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 sm:gap-x-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
            {games.map((game) => (
              <li key={game.id} className="min-w-0">
                <Link
                  href={`/game/${game.id}`}
                  className="group block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-md bg-card shadow-md ring-1 ring-white/10 transition group-hover:ring-accent/60">
                    <span className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
                    {game.cover?.url ? (
                      <Image
                        src={game.cover.url}
                        alt=""
                        fill
                        unoptimized
                        loading="lazy"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 10vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] font-medium text-zinc-300">
                        {game.title}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-foreground/90 sm:text-xs">
                    {game.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogueCard } from "@/data/catalogue-card";
import { searchCardLabel } from "@/data/search-card-label";
import { GameCoverPlaceholder } from "./cover-placeholder";

const PUBLISHER_GAMES_PAGE_SIZE = 48;

interface PublisherGamesWallProps {
  title: string;
  games: CatalogueCard[];
  resetKey: string;
}

export default function PublisherGamesWall({ title, games, resetKey }: PublisherGamesWallProps) {
  const [visibleCount, setVisibleCount] = useState(PUBLISHER_GAMES_PAGE_SIZE);
  const total = games.length;
  const displayed = games.slice(0, visibleCount);
  const canLoadMore = visibleCount < total;

  useEffect(() => {
    setVisibleCount(PUBLISHER_GAMES_PAGE_SIZE);
  }, [resetKey]);

  return (
    <section aria-labelledby="publisher-games-heading" className="mb-10">
      <div className="mb-4 flex flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h2
            id="publisher-games-heading"
            className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {title}
          </h2>
          {total > 0 ? (
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              Showing {displayed.length} of {total} games
            </p>
          ) : null}
        </div>
      </div>

      {total === 0 ? (
        <div className="mx-auto max-w-[1920px] px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-white/10 bg-card p-8 text-center text-sm text-muted">
            No published games are listed for this publisher yet.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {displayed.map((game) => {
              const label = searchCardLabel(game, games);
              return (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="group block min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={label}
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-md bg-card shadow-md ring-1 ring-black/10 transition group-hover:ring-accent/60 dark:ring-white/10">
                    {!game.cover?.url ? (
                      <span className="absolute inset-0">
                        <GameCoverPlaceholder title={game.title} />
                      </span>
                    ) : (
                      <>
                        <span
                          className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"
                          aria-hidden="true"
                        />
                        <Image
                          src={game.cover.url}
                          alt=""
                          fill
                          unoptimized
                          loading="lazy"
                          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 10vw"
                          className="object-cover"
                        />
                      </>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-foreground/90 sm:text-xs">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
          {canLoadMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PUBLISHER_GAMES_PAGE_SIZE)}
                className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-card px-6 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-card/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
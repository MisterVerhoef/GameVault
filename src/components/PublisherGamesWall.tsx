"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogueCard } from "@/data/catalogue-card";
import { formatAllShown, formatShowingOf } from "@/data/pluralize";
import { searchCardLabel } from "@/data/search-card-label";
import { GameCoverPlaceholder } from "./cover-placeholder";

const PUBLISHER_GAMES_PAGE_SIZE = 48;
/** Up to the widest grid (2xl: 8 cols); eager-load the first row after Load more. */
const NEW_BATCH_EAGER_COVERS = 8;

interface PublisherGamesWallProps {
  title: string;
  games: CatalogueCard[];
}

export default function PublisherGamesWall({ title, games }: PublisherGamesWallProps) {
  const [visibleCount, setVisibleCount] = useState(PUBLISHER_GAMES_PAGE_SIZE);
  const [loadMoreCount, setLoadMoreCount] = useState(0);
  const [eagerFromIndex, setEagerFromIndex] = useState<number | null>(null);
  const total = games.length;
  const displayed = games.slice(0, visibleCount);
  const canLoadMore = visibleCount < total;
  const showAllShownNote =
    !canLoadMore
    && total > 0
    && (loadMoreCount > 0 || total > PUBLISHER_GAMES_PAGE_SIZE);

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
              {formatShowingOf(displayed.length, total, "games")}
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
            {displayed.map((game, index) => {
              const label = searchCardLabel(game, games);
              const loadEager =
                eagerFromIndex != null
                && index >= eagerFromIndex
                && index < eagerFromIndex + NEW_BATCH_EAGER_COVERS;
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
                      <Image
                        src={game.cover.url}
                        alt=""
                        fill
                        unoptimized
                        loading={loadEager ? "eager" : "lazy"}
                        fetchPriority={loadEager ? "high" : undefined}
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 10vw"
                        className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                        onLoad={(event) => {
                          event.currentTarget.style.opacity = "1";
                        }}
                        style={{ opacity: 0 }}
                      />
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
                onClick={() => {
                  setEagerFromIndex(visibleCount);
                  setLoadMoreCount((count) => count + 1);
                  setVisibleCount((count) => count + PUBLISHER_GAMES_PAGE_SIZE);
                }}
                className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-card px-6 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-card/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Load more
              </button>
            </div>
          ) : showAllShownNote ? (
            <p className="mt-8 text-center text-sm text-muted" aria-live="polite">
              {formatAllShown(total, "games")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
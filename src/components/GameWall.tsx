"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/data/games";

const PAGE_SIZE = 48;

interface GameWallProps {
  title: string;
  games: Game[];
  resetKey: string;
  backHref: string;
  backLabel: string;
  emptyLabel?: string;
}

export default function GameWall({ title, games, resetKey, backHref, backLabel, emptyLabel }: GameWallProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (resetKey.startsWith("search:")) return;
    headingRef.current?.focus();
  }, [resetKey]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visible >= games.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible((current) => Math.min(games.length, current + PAGE_SIZE));
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [games.length, visible]);

  const shown = games.slice(0, visible);

  return (
    <section aria-labelledby="game-wall-heading" className="mb-10">
      <div className="mb-4 flex flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h1
            id="game-wall-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold tracking-tight text-foreground focus:outline-none sm:text-2xl"
          >
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {games.length === 1 ? "1 game" : `${games.length} games`}
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center self-start rounded-full px-3 text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {backLabel}
        </Link>
      </div>

      {games.length === 0 ? (
        <p className="mx-auto max-w-[1920px] px-4 text-sm text-muted sm:px-6 lg:px-8">
          No games in the catalogue match {emptyLabel ?? title}.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-x-2 gap-y-3 px-4 sm:grid-cols-4 sm:gap-x-3 sm:px-6 md:grid-cols-6 lg:grid-cols-8 lg:px-8 xl:grid-cols-10 2xl:grid-cols-12">
            {shown.map((game) => (
              <li key={game.id} className="min-w-0">
                <Link
                  href={`/game/${game.id}`}
                  className="group block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-md bg-card shadow-md ring-1 ring-white/10 transition group-hover:ring-accent/60">
                    <span className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
                    {game.cover?.url && (
                      <Image
                        src={game.cover.url}
                        alt=""
                        fill
                        unoptimized
                        loading="lazy"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 10vw"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-foreground/90 sm:text-xs">
                    {game.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {visible < games.length && (
            <div ref={sentinelRef} className="mt-6 flex justify-center px-4">
              <button
                type="button"
                onClick={() => setVisible((current) => Math.min(games.length, current + PAGE_SIZE))}
                className="min-h-11 rounded-full bg-card px-5 text-sm font-medium text-foreground transition hover:bg-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Load more games
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/data/games";

const PAGE_SIZE = 48;

export interface GameWallSection {
  id: string;
  title: string;
  games: Game[];
  kind: "games" | "dlc";
}

interface GameWallProps {
  title: string;
  games: Game[];
  resetKey: string;
  backHref: string;
  backLabel: string;
  emptyLabel?: string;
  /** Present only when a search mix of base games and DLC should render as separate grids. */
  sections?: GameWallSection[];
}

function countLabel(count: number, kind: "games" | "dlc" | "results") {
  if (kind === "dlc") return count === 1 ? "1 DLC" : `${count} DLC`;
  if (kind === "results") return count === 1 ? "1 result" : `${count} results`;
  return count === 1 ? "1 game" : `${count} games`;
}

function CoverGrid({ games, loadMoreLabel }: { games: Game[]; loadMoreLabel: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = games.slice(0, visible);

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

  return (
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
            {loadMoreLabel}
          </button>
        </div>
      )}
    </>
  );
}

export default function GameWall({ title, games, resetKey, backHref, backLabel, emptyLabel, sections }: GameWallProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const split = sections && sections.length > 0 ? sections : null;
  const total = split ? split.reduce((count, section) => count + section.games.length, 0) : games.length;

  useEffect(() => {
    if (resetKey.startsWith("search:")) return;
    headingRef.current?.focus();
  }, [resetKey]);

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
            {countLabel(total, split ? "results" : "games")}
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center self-start rounded-full px-3 text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {backLabel}
        </Link>
      </div>

      {total === 0 ? (
        <p className="mx-auto max-w-[1920px] px-4 text-sm text-muted sm:px-6 lg:px-8">
          No games in the catalogue match {emptyLabel ?? title}.
        </p>
      ) : split ? (
        <div className="flex flex-col gap-10">
          {split.map((section) => (
            <section key={section.id} aria-labelledby={`game-wall-${section.id}`} className="border-t border-white/10 pt-8 first:border-t-0 first:pt-0">
              <div className="mb-4 px-4 sm:px-6 lg:px-8">
                <h2 id={`game-wall-${section.id}`} className="text-lg font-bold tracking-tight text-foreground">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{countLabel(section.games.length, section.kind)}</p>
              </div>
              <CoverGrid
                games={section.games}
                loadMoreLabel={section.kind === "dlc" ? "Load more DLC" : "Load more games"}
              />
            </section>
          ))}
        </div>
      ) : (
        <CoverGrid games={games} loadMoreLabel="Load more games" />
      )}
    </section>
  );
}

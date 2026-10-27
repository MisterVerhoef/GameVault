"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogueCard } from "@/data/catalogue-card";
import { PlatformIcon } from "./platform-icons";

const PAGE_SIZE = 48;
/** Title block plus the grid's vertical gap, added under each cover. */
const CELL_EXTRA = 48;

export interface GameWallSection {
  id: string;
  title: string;
  games: CatalogueCard[];
  kind: "games" | "dlc";
}

interface GameWallProps {
  title: string;
  games: CatalogueCard[];
  resetKey: string;
  backHref?: string;
  backLabel?: string;
  emptyLabel?: string;
  titleLevel?: "h1" | "h2";
  focusTitle?: boolean;
  /** Console or family label drawn beside the wall title and back link. */
  platformLabel?: string | null;
  /** Present only when a search mix of base games and DLC should render as separate grids. */
  sections?: GameWallSection[];
}

function countLabel(count: number, kind: "games" | "dlc" | "results") {
  if (kind === "dlc") return count === 1 ? "1 DLC" : `${count} DLC`;
  if (kind === "results") return count === 1 ? "1 result" : `${count} results`;
  return count === 1 ? "1 game" : `${count} games`;
}

function columnCount() {
  if (window.matchMedia("(min-width: 1536px)").matches) return 12;
  if (window.matchMedia("(min-width: 1280px)").matches) return 10;
  if (window.matchMedia("(min-width: 1024px)").matches) return 8;
  if (window.matchMedia("(min-width: 768px)").matches) return 6;
  if (window.matchMedia("(min-width: 640px)").matches) return 4;
  return 3;
}

interface GridWindow {
  columns: number;
  start: number;
  end: number;
  padTop: number;
  padBottom: number;
}

function CoverGrid({ games }: { games: CatalogueCard[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [gridWindow, setGridWindow] = useState<GridWindow | null>(null);
  const fallback = games.slice(0, Math.min(games.length, PAGE_SIZE));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let frame = 0;
    const measure = () => {
      const columns = columnCount();
      const style = window.getComputedStyle(host);
      const horizontalPad = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const gap = window.matchMedia("(min-width: 640px)").matches ? 12 : 8;
      const contentWidth = Math.max(0, host.clientWidth - horizontalPad);
      const cellWidth = columns > 0 ? (contentWidth - gap * (columns - 1)) / columns : contentWidth;
      const rowStride = cellWidth * (4 / 3) + CELL_EXTRA;
      const rowCount = Math.ceil(games.length / columns);
      const top = host.getBoundingClientRect().top;
      const startRow = Math.max(0, Math.floor(-top / rowStride) - 2);
      const endRow = Math.min(rowCount, Math.ceil((-top + window.innerHeight) / rowStride) + 2);
      const next: GridWindow = {
        columns,
        start: startRow * columns,
        end: Math.min(games.length, endRow * columns),
        padTop: startRow * rowStride,
        padBottom: Math.max(0, (rowCount - endRow) * rowStride),
      };
      setGridWindow((current) => (
        current
        && current.columns === next.columns
        && current.start === next.start
        && current.end === next.end
        && Math.abs(current.padTop - next.padTop) < 1
        && Math.abs(current.padBottom - next.padBottom) < 1
          ? current
          : next
      ));
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(host);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
    };
  }, [games.length]);

  const shown = gridWindow ? games.slice(gridWindow.start, gridWindow.end) : fallback;
  const columnsClass = gridWindow ? undefined : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12";

  return (
    <div ref={hostRef} className="px-4 sm:px-6 lg:px-8" style={{ overflowAnchor: "none" }}>
      {gridWindow && gridWindow.padTop > 0 ? <div style={{ height: gridWindow.padTop }} /> : null}
      <ul
        className={`grid gap-x-2 gap-y-3 sm:gap-x-3 ${columnsClass ?? ""}`}
        style={gridWindow ? { gridTemplateColumns: `repeat(${gridWindow.columns}, minmax(0, 1fr))` } : undefined}
      >
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
      {gridWindow && gridWindow.padBottom > 0 ? <div style={{ height: gridWindow.padBottom }} /> : null}
    </div>
  );
}

export default function GameWall({
  title,
  games,
  resetKey,
  backHref,
  backLabel,
  emptyLabel,
  sections,
  titleLevel = "h1",
  focusTitle = true,
  platformLabel,
}: GameWallProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const split = sections && sections.length > 0 ? sections : null;
  const total = split ? split.reduce((count, section) => count + section.games.length, 0) : games.length;
  const HeadingTag = titleLevel === "h2" ? "h2" : "h1";

  useEffect(() => {
    if (!focusTitle || resetKey.startsWith("search:")) return;
    headingRef.current?.focus();
  }, [resetKey, focusTitle]);

  return (
    <section aria-labelledby="game-wall-heading" className="mb-10">
      <div className="mb-4 flex flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
        <div>
          <HeadingTag
            id="game-wall-heading"
            ref={headingRef}
            tabIndex={-1}
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground focus:outline-none sm:text-2xl"
          >
            {platformLabel ? <PlatformIcon name={platformLabel} className="h-6 w-6 shrink-0" /> : null}
            {title}
          </HeadingTag>
          <p className="mt-1 text-sm text-muted">
            {countLabel(total, split ? "results" : "games")}
          </p>
        </div>
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-3 text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {platformLabel ? <PlatformIcon name={platformLabel} className="h-4 w-4 shrink-0" /> : null}
            {backLabel}
          </Link>
        ) : null}
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
              <CoverGrid games={section.games} />
            </section>
          ))}
        </div>
      ) : (
        <CoverGrid games={games} />
      )}
    </section>
  );
}

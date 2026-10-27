"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { CatalogueCard } from "@/data/catalogue-card";
import GameCard from "./GameCard";
import { PlatformIcon } from "./platform-icons";

/** Past this length a horizontal row only mounts the cards in view. */
const VIRTUALIZE_AFTER = 24;

const CARD_SIZE = {
  sm: { width: 112, height: 160, largeWidth: 144, largeHeight: 208 },
  md: { width: 128, height: 192, largeWidth: 176, largeHeight: 256 },
  lg: { width: 160, height: 224, largeWidth: 224, largeHeight: 320 },
} as const;

interface RowWindow {
  start: number;
  end: number;
  cardWidth: number;
  cardHeight: number;
  stride: number;
  padLeft: number;
  padRight: number;
  innerWidth: number;
}

function measureRow(node: HTMLDivElement, size: "sm" | "md" | "lg", count: number): RowWindow {
  const large = window.matchMedia("(min-width: 1024px)").matches;
  const small = window.matchMedia("(min-width: 640px)").matches;
  const dims = CARD_SIZE[size];
  const cardWidth = large ? dims.largeWidth : dims.width;
  const cardHeight = large ? dims.largeHeight : dims.height;
  const gap = small ? 16 : 12;
  const padLeft = large ? 32 : small ? 24 : 16;
  const stride = cardWidth + gap;
  const start = Math.max(0, Math.floor((node.scrollLeft - padLeft) / stride) - 3);
  const end = Math.min(count, Math.ceil((node.scrollLeft + node.clientWidth - padLeft) / stride) + 4);
  return {
    start,
    end,
    cardWidth,
    cardHeight,
    stride,
    padLeft,
    padRight: padLeft,
    innerWidth: padLeft + Math.max(count, 1) * stride - gap + padLeft,
  };
}

interface GameRowProps {
  title: string;
  games: CatalogueCard[];
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
  titleHref?: string;
  /** Console or family label drawn beside the row title. */
  platformLabel?: string | null;
}

export default function GameRow({
  title,
  games,
  showProgress = false,
  size = "md",
  titleHref,
  platformLabel,
}: GameRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const virtualize = games.length > VIRTUALIZE_AFTER;
  const [rowWindow, setRowWindow] = useState<RowWindow | null>(null);

  useEffect(() => {
    if (!virtualize) return;
    const node = scrollRef.current;
    if (!node) return;
    let frame = 0;
    const measure = () => {
      const next = measureRow(node, size, games.length);
      setRowWindow((current) => (
        current
        && current.start === next.start
        && current.end === next.end
        && current.cardWidth === next.cardWidth
        && current.innerWidth === next.innerWidth
        && current.padLeft === next.padLeft
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
    node.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    const large = window.matchMedia("(min-width: 1024px)");
    const small = window.matchMedia("(min-width: 640px)");
    large.addEventListener("change", schedule);
    small.addEventListener("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      node.removeEventListener("scroll", schedule);
      resize.disconnect();
      large.removeEventListener("change", schedule);
      small.removeEventListener("change", schedule);
    };
  }, [games.length, size, virtualize]);

  if (games.length === 0) {
    return null;
  }

  const visibleGames = rowWindow ? games.slice(rowWindow.start, rowWindow.end) : games.slice(0, virtualize ? 8 : games.length);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -600 : 600;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      scrollRef.current.scrollBy({
        left: amount,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  };

  return (
    <section aria-labelledby={headingId} className="relative mb-8">
      {/* Title */}
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 id={headingId} className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl">
          {platformLabel ? <PlatformIcon name={platformLabel} className="h-6 w-6 shrink-0" /> : null}
          {titleHref ? (
            <Link
              href={titleHref}
              className="inline-block rounded-sm py-2 transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {/* Scroll buttons: only on desktop */}
        <div className="hidden gap-2 lg:flex">
          <button
            onClick={() => scroll("left")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted transition hover:bg-card-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Scroll ${title} left`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted transition hover:bg-card-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Scroll ${title} right`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={virtualize && rowWindow
          ? "scrollbar-hide overflow-x-auto pb-4"
          : "row-scroll scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-4 sm:gap-4 sm:px-6 lg:px-8"}
        style={virtualize && rowWindow ? { overflowAnchor: "none" } : undefined}
      >
        {rowWindow ? (
          <div className="relative" style={{ width: rowWindow.innerWidth, height: rowWindow.cardHeight }}>
            {visibleGames.map((game, index) => (
              <div
                key={game.id}
                className="absolute top-0"
                style={{ left: rowWindow.padLeft + (rowWindow.start + index) * rowWindow.stride }}
              >
                <GameCard game={game} showProgress={showProgress} size={size} />
              </div>
            ))}
          </div>
        ) : (
          visibleGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              showProgress={showProgress}
              size={size}
            />
          ))
        )}
      </div>
    </section>
  );
}

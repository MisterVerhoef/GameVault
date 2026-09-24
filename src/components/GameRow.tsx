"use client";

import { useRef } from "react";
import { Game } from "@/data/games";
import GameCard from "./GameCard";

interface GameRowProps {
  title: string;
  games: Game[];
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function GameRow({
  title,
  games,
  showProgress = false,
  size = "md",
}: GameRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -600 : 600;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section className="relative mb-8">
      {/* Title */}
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted transition hover:bg-card-hover hover:text-foreground"
            aria-label="Scroll left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted transition hover:bg-card-hover hover:text-foreground"
            aria-label="Scroll right"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
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

      {/* Horizontal scroll row */}
      <div
        ref={scrollRef}
        className="row-scroll scrollbar-hide flex gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8"
      >
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            showProgress={showProgress}
            size={size}
          />
        ))}
      </div>
    </section>
  );
}

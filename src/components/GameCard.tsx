"use client";

import Image from "next/image";
import { Game } from "@/data/games";

interface GameCardProps {
  game: Game;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

const platformColors: Record<string, string> = {
  PC: "bg-blue-600",
  PS5: "bg-indigo-600",
  Xbox: "bg-green-600",
  Switch: "bg-red-600",
  "Steam Deck": "bg-cyan-600",
};

export default function GameCard({
  game,
  showProgress = false,
  size = "md",
}: GameCardProps) {
  // Responsive sizes: compact on portrait/mobile, full size from lg and up
  const sizes = {
    sm: "w-28 h-40 lg:w-36 lg:h-52",
    md: "w-32 h-48 lg:w-44 lg:h-64",
    lg: "w-40 h-56 lg:w-56 lg:h-80",
  };

  return (
    <button
      type="button"
      aria-label={`Open ${game.title}`}
      className={`group relative flex-shrink-0 cursor-pointer text-left focus:outline-none ${sizes[size]}`}
    >
      {/* Cover */}
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-accent/60 group-hover:shadow-2xl group-hover:shadow-accent/20 group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {/* Placeholder gradient if image fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />

        <Image
          src={game.cover}
          alt={`${game.title} cover art`}
          fill
          className="object-cover transition-opacity duration-500 group-hover:opacity-90"
          sizes="(max-width: 1024px) 128px, 224px"
          unoptimized
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-3">
          <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow-md sm:text-sm lg:text-sm">
            {game.title}
          </h3>

          {/* Platforms */}
          <div className="mt-1 flex flex-wrap gap-1">
            {game.platforms.slice(0, 3).map((p) => (
              <span
                key={p}
                className={`rounded px-1 py-0.5 text-[9px] font-medium text-white sm:px-1.5 sm:text-[10px] ${platformColors[p] || "bg-zinc-600"}`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Hover play overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/90 text-white shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="h-6 w-6 ml-0.5"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

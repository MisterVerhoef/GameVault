"use client";

import Image from "next/image";
import type { Game } from "@/data/games";
import { familyForVariantLabel, listedSystemNames, PLATFORM_COLORS, resolveIgdbPlatform, type Platform } from "@/data/platforms";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import StarRating from "./StarRating";
import { PlatformIcon, platformIconKind } from "./platform-icons";

interface GameCardProps {
  game: Game;
  showProgress?: boolean;
  /** Personal 1–5 score, drawn on the cover when set. */
  personalRating?: number;
  /** Library progress, 0–100. A bar is drawn when this is above zero. */
  progress?: number;
  size?: "sm" | "md" | "lg";
}

function badgeBackground(name: string) {
  if (name in PLATFORM_COLORS) return PLATFORM_COLORS[name as Platform];
  const resolved = resolveIgdbPlatform(name);
  if (!resolved.unmapped) return PLATFORM_COLORS[resolved.family];
  const family = familyForVariantLabel(name);
  if (family?.platform) return PLATFORM_COLORS[family.platform];
  return "#3f3f46";
}

export default function GameCard({
  game,
  personalRating,
  progress,
  size = "md",
}: GameCardProps) {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleClick = () => {
    router.push(`/game/${game.id}`);
  };

  const details = [
    personalRating ? `your rating ${personalRating} out of 5` : "",
    typeof progress === "number" && progress > 0 ? `${progress}% progress` : "",
  ].filter(Boolean);

  // Responsive sizes: compact on portrait/mobile, full size from lg and up
  const sizes = {
    sm: "w-28 h-40 lg:w-36 lg:h-52",
    md: "w-32 h-48 lg:w-44 lg:h-64",
    lg: "w-40 h-56 lg:w-56 lg:h-80",
  };

  return (
    <button
      type="button"
      aria-label={details.length > 0 ? `Open ${game.title}, ${details.join(", ")}` : `Open ${game.title}`}
      onClick={handleClick}
      className={`group relative flex-shrink-0 cursor-pointer text-left focus:outline-none ${sizes[size]}`}
    >
      {/* Cover */}
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-accent/60 group-hover:shadow-2xl group-hover:shadow-accent/20 group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {/* Placeholder gradient if image fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />

        {isHydrated && game.cover?.url && (
          <Image
            src={game.cover.url}
            alt={`${game.title} cover art`}
            fill
            className="object-cover transition-opacity duration-500 group-hover:opacity-90"
            sizes="(max-width: 1024px) 128px, 224px"
            unoptimized
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {personalRating ? (
          <span className="absolute left-1.5 top-1.5 z-20 rounded bg-black/70 px-1.5 py-1 shadow-sm" aria-hidden="true">
            <StarRating value={personalRating} readOnly />
          </span>
        ) : null}

        {typeof progress === "number" && progress > 0 && (
          <span className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/50" aria-hidden="true">
            <span className="block h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </span>
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2 lg:p-3">
          <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow-md sm:text-sm lg:text-sm">
            {game.title}
          </h3>

          {/* Platforms */}
          <div className="mt-1 flex flex-wrap gap-1">
            {listedSystemNames(game).slice(0, 3).map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium text-white sm:px-1.5 sm:text-[10px]"
                style={{ backgroundColor: badgeBackground(name) }}
              >
                <PlatformIcon name={name} className={platformIconKind(name) === "logo" ? "h-4 w-4" : "h-3 w-3"} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

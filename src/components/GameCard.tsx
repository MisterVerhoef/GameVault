"use client";

import Image from "next/image";
import type { CatalogueCard } from "@/data/catalogue-card";
import {
  cardPlatformLabels,
  familyForVariantLabel,
  PLATFORM_COLORS,
  resolveIgdbPlatform,
  type Platform,
} from "@/data/platforms";
import { useRouter } from "next/navigation";
import StarRating from "./StarRating";
import { PlatformIcon, platformIconKind } from "./platform-icons";

interface GameCardProps {
  game: CatalogueCard;
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

export default function GameCard({ game, personalRating, progress, size = "md" }: GameCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/game/${game.id}`);
  };

  const details = [
    personalRating ? `your rating ${personalRating} out of 5` : "",
    typeof progress === "number" && progress > 0 ? `${progress}% progress` : "",
    game.cloudServices?.length ? `cloud streaming via ${game.cloudServices.join(", ")}` : "",
  ].filter(Boolean);

  // Responsive sizes: compact on portrait/mobile, full size from lg and up
  const sizes = {
    sm: "w-28 h-40 lg:w-36 lg:h-52",
    md: "w-32 h-48 lg:w-44 lg:h-64",
    lg: "w-40 h-56 lg:w-56 lg:h-80",
  };

  const platformLabels = cardPlatformLabels(game);
  const platformPreview = platformLabels.slice(0, 2);
  const hiddenPlatformCount = Math.max(0, platformLabels.length - platformPreview.length);

  return (
    <button
      type="button"
      data-roving-card=""
      data-card-id={game.id}
      aria-label={
        details.length > 0 ? `Open ${game.title}, ${details.join(", ")}` : `Open ${game.title}`
      }
      onClick={handleClick}
      className={`group relative min-h-11 min-w-11 flex-shrink-0 cursor-pointer touch-manipulation scroll-mt-24 text-left focus:outline-none focus-visible:z-10 ${sizes[size]}`}
    >
      {/* Cover */}
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-accent/60 group-hover:shadow-2xl group-hover:shadow-accent/20 group-focus-visible:ring-2 group-focus-visible:ring-accent group-active:ring-2 group-active:ring-accent">
        {/* Placeholder gradient if image fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />

        {game.cover?.url && (
          <Image
            src={game.cover.url}
            alt={`${game.title} cover art`}
            fill
            className="object-cover transition-opacity duration-500 group-hover:opacity-90"
            sizes="(max-width: 1024px) 128px, 224px"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {game.cloudServices && game.cloudServices.length > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 z-20 inline-flex items-center justify-center rounded-full bg-black/75 p-1.5 text-white shadow-sm"
            title={`Cloud streaming: ${game.cloudServices.join(", ")}`}
            aria-label={`Cloud streaming available via ${game.cloudServices.join(", ")}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7.5 18.5h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5-1.2A4.4 4.4 0 0 0 7.5 18.5Z" />
            </svg>
          </span>
        ) : null}

        {personalRating ? (
          <span
            className="absolute left-1.5 top-1.5 z-20 rounded bg-black/70 px-1.5 py-1 shadow-sm"
            aria-hidden="true"
          >
            <StarRating value={personalRating} readOnly />
          </span>
        ) : null}

        {typeof progress === "number" && progress > 0 && (
          <span className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/50" aria-hidden="true">
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[58%] flex-col justify-end p-2 lg:p-3">
          <div className="mb-1 flex max-h-9 flex-wrap items-center gap-1 overflow-hidden">
            {platformPreview.map((name) => {
              const iconKind = platformIconKind(name);
              return (
                <span
                  key={name}
                  className="inline-flex max-w-[5.25rem] items-center gap-0.5 truncate rounded px-1 py-0.5 text-[9px] font-medium text-white sm:max-w-none sm:px-1.5 sm:text-[10px]"
                  style={{ backgroundColor: badgeBackground(name) }}
                  aria-label={name}
                  title={name}
                >
                  <PlatformIcon
                    name={name}
                    className={iconKind === "logo" ? "h-4 w-4" : "h-3 w-3"}
                  />
                  {iconKind === "logo" ? (
                    <span className="sr-only">{name}</span>
                  ) : (
                    <span className="truncate">{name}</span>
                  )}
                </span>
              );
            })}
            {hiddenPlatformCount > 0 ? (
              <span className="rounded bg-black/50 px-1 py-0.5 text-[9px] font-semibold text-white sm:text-[10px]">
                +{hiddenPlatformCount}
              </span>
            ) : null}
          </div>
          <h3 className="relative z-10 line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow-md sm:text-sm lg:text-sm">
            {game.title}
          </h3>
        </div>
      </div>
    </button>
  );
}

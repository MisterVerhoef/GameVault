import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import GameDescription from "@/components/GameDescription";
import { StudioLogo } from "@/components/studio-logos";
import { formatRating, PLATFORM_COLORS } from "@/data/games";
import { formatReleaseDay } from "@/data/game-facts";
import { listedSystemNames } from "@/data/platforms";
import { PlatformName } from "@/components/platform-icons";
import type { IgdbLiveGame } from "@/lib/igdb/types";
import type { Platform } from "@/data/platforms";

function ScoreCard({ label, value }: { label: string; value: number }) {
  const formatted = formatRating(value);
  if (!formatted) return null;
  return (
    <div
      className="min-w-36 rounded-xl bg-card px-4 py-3 ring-1 ring-white/10"
      aria-label={`${label} score ${formatted} out of 100`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-yellow-400" aria-hidden="true">
          ★
        </span>
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {formatted}
        </span>
        <span className="text-xs text-muted">/ 100</span>
      </div>
    </div>
  );
}

export default function IgdbOnlyGameDetail({ game }: { game: IgdbLiveGame }) {
  const primaryPlatform: Platform = game.platforms[0] ?? "Other";
  const themeColor = PLATFORM_COLORS[primaryPlatform];
  const displayPlatforms = listedSystemNames({
    platforms: game.platforms,
    platformVariants: game.platformVariants,
  });
  const hasScores = game.rating != null || game.aggregatedRating != null;

  return (
    <div className="relative min-h-screen">
      <a
        href="#game-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `${themeColor}1a` }}
      />

      <div className="relative">
        <Navbar />
        <div className="border-b border-white/5 bg-background/80">
          <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:h-9 md:w-9"
              aria-label="Back to home"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </Link>
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {game.title}
            </h1>
          </div>
        </div>
      </div>

      <main
        id="game-content"
        tabIndex={-1}
        className="relative mx-auto max-w-[1920px] scroll-mt-20 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        <section className="relative mb-12 flex flex-col gap-6 lg:flex-row lg:gap-12">
          <div
            className="relative mx-auto h-64 w-44 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:h-80 sm:w-56 lg:mx-0 lg:h-96 lg:w-64"
            style={{ borderColor: `${themeColor}33` }}
          >
            {game.cover?.url ? (
              <Image
                src={game.cover.url}
                alt={game.title}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-700 via-zinc-900 to-black px-3 text-center text-xs font-medium text-zinc-300">
                {game.title}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  {game.title}
                </h2>
                <span className="rounded-full border border-foreground/15 bg-card px-3 py-1 text-sm font-semibold text-foreground dark:border-white/15 dark:bg-white/5">
                  Niet in catalogus
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {game.releaseYear != null && <span>{game.releaseYear}</span>}
                {game.releaseYear != null && game.genres.length > 0 && (
                  <span aria-hidden="true">•</span>
                )}
                <span>{game.genres.join(", ")}</span>
              </div>
              {hasScores ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {game.rating != null ? (
                    <ScoreCard label="Community" value={game.rating} />
                  ) : null}
                  {game.aggregatedRating != null ? (
                    <ScoreCard label="Critics" value={game.aggregatedRating} />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {displayPlatforms.map((name) => (
                <span
                  key={name}
                  className="rounded bg-white/10 px-2.5 py-1 text-sm font-medium"
                >
                  <PlatformName
                    name={name}
                    iconClassName="h-5 w-5"
                    className="gap-1.5"
                  />
                </span>
              ))}
            </div>

            {game.description ? (
              <GameDescription text={game.description} />
            ) : null}

            <p className="text-sm text-muted">
              Prijzen en vault nog niet beschikbaar voor deze game.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">
            About {game.title}
          </h2>
          <dl className="flex flex-wrap gap-x-6 gap-y-3">
            {game.developers.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Developers
                </dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground/90">
                  {game.developers.map((company, index) => (
                    <span
                      key={company.id}
                      className="inline-flex items-center gap-1.5"
                    >
                      <StudioLogo name={company.name} />
                      {company.name}
                      {index < game.developers.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {game.publishers.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Publishers
                </dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground/90">
                  {game.publishers.map((company, index) => (
                    <span
                      key={company.id}
                      className="inline-flex items-center gap-1.5"
                    >
                      <StudioLogo name={company.name} />
                      {company.name}
                      {index < game.publishers.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {game.releases.length > 0 && (
          <section className="mb-12" aria-labelledby="igdb-releases">
            <h2
              id="igdb-releases"
              className="mb-4 text-lg font-bold tracking-tight text-foreground"
            >
              Release dates
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {game.releases.map((release) => (
                <li
                  key={`${release.platform}-${release.date ?? release.label}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2.5 text-sm"
                >
                  <PlatformName
                    name={release.platform}
                    iconClassName="h-5 w-5"
                  />
                  <span className="shrink-0 text-muted">
                    {formatReleaseDay(release.date) || release.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { allGames, findGameByProviderId, formatRating, Platform, PLATFORM_COLORS, type ContentRef, type Game } from "@/data/games";
import { listedSystemNames } from "@/data/platforms";
import { PlatformName } from "@/components/platform-icons";
import { StudioLogo } from "@/components/studio-logos";
import { formatEuro, presentCatalogueGame } from "@/data/store-offers";
import { storeName } from "@/data/store-match";
import { collectionHref, franchiseHref } from "@/data/series";
import Image from "next/image";
import GameDescription from "@/components/GameDescription";
import LibraryControls from "@/components/LibraryControls";
import Navbar from "@/components/Navbar";

interface GameDetailPageProps {
  params: Promise<{ id: string }>;
}

function getYouTubeThumbnail(url: string) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : undefined;
}

function NamedCatalogueLinks({
  names,
  hrefFor,
}: {
  names: readonly string[];
  hrefFor: (name: string) => string | undefined;
}) {
  return (
    <dd className="mt-0.5 flex flex-wrap gap-x-1 text-sm text-foreground/90">
      {names.map((name, index) => {
        const href = hrefFor(name);
        return (
          <span key={name}>
            {href ? (
              <Link
                href={href}
                className="rounded transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {name}
              </Link>
            ) : (
              name
            )}
            {index < names.length - 1 ? ", " : ""}
          </span>
        );
      })}
    </dd>
  );
}

function LabeledContentGrid({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, title]) => (
        <div key={`${label}-${title}`} className="rounded-lg bg-card p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
          <p className="mt-1 text-sm text-foreground/80">{title}</p>
        </div>
      ))}
    </div>
  );
}

function SimilarGameCard({ item }: { item: ContentRef }) {
  const catalogueGame: Game | undefined = findGameByProviderId(item.id);
  const coverUrl = catalogueGame?.cover?.url ?? item.cover?.url;
  const className = catalogueGame
    ? "group relative flex h-64 min-w-40 cursor-pointer flex-col justify-end overflow-hidden rounded-lg bg-card px-4 py-4 transition hover:ring-1 hover:ring-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-w-44"
    : "relative flex h-64 min-w-40 cursor-default flex-col justify-end overflow-hidden rounded-lg bg-card px-4 py-4 opacity-75 sm:min-w-44";
  const content = (
    <>
      {coverUrl && (
        <Image
          src={coverUrl}
          alt=""
          fill
          className={`object-cover${catalogueGame ? " transition duration-300 group-hover:scale-105" : ""}`}
          sizes="176px"
          unoptimized
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
      <div className="relative">
        <span className="text-xs font-medium uppercase tracking-wider text-white/70">
          {catalogueGame ? "Similar" : "Not in catalogue"}
        </span>
        <span className="mt-1 line-clamp-2 text-sm font-medium text-white">{item.title}</span>
      </div>
    </>
  );

  if (!catalogueGame) {
    return (
      <div className={className} aria-label={`${item.title} is not in the catalogue`}>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/game/${catalogueGame.id}`} className={className} aria-label={`Open ${catalogueGame.title}`}>
      {content}
    </Link>
  );
}

export function generateStaticParams() {
  return allGames.map((game) => ({ id: game.id }));
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  // Resolve params promise for SSR compatibility
  const resolvedParams = await params;
  const game = allGames.find(g => g.id === resolvedParams.id);
  
  if (!game) {
    notFound();
  }

  const { game: display, offers, captions } = presentCatalogueGame(game);

  // Get primary platform for theming
  const primaryPlatform: Platform = game.platforms[0];
  const themeColor = PLATFORM_COLORS[primaryPlatform];

  return (
    <div className="relative min-h-screen">
      {/* Background with theme color */}
      <div className="absolute inset-0" style={{ backgroundColor: `${themeColor}1a` }} />

      <div className="relative">
        <Navbar />
        <div className="border-b border-white/5 bg-background/80">
          <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {game.title}
            </h1>
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero section with cover art */}
        <section className="relative mb-12 flex flex-col gap-6 lg:flex-row lg:gap-12">
          {/* Cover art */}
          <div className="relative mx-auto h-64 w-44 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:h-80 sm:w-56 lg:mx-0 lg:h-96 lg:w-64" style={{ borderColor: `${themeColor}33` }}>
            {display.cover?.url ? (
              <Image
                src={display.cover.url}
                alt={game.title}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-card px-3 text-center text-xs text-muted">
                {game.title}
              </div>
            )}
          </div>

          {/* Game info */}
          <div className="flex flex-1 flex-col gap-4">
            {/* Title and rating */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                {game.title}
              </h2>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted">
                <span>{game.releaseYear}</span>
                <span aria-hidden="true">•</span>
                <span className="text-yellow-400" aria-label={`Rating ${formatRating(game.rating)} out of 10`}>
                  <span aria-hidden="true">★ </span>
                  {formatRating(game.rating)}
                </span>
                <span aria-hidden="true">•</span>
                <span className="flex flex-wrap gap-1 font-medium">
                  {game.genres.map((genre, index) => (
                    <span key={genre}>
                      <Link
                        href={`/?genre=${encodeURIComponent(genre)}`}
                        className="rounded transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {genre}
                      </Link>
                      {index < game.genres.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            {/* Platforms */}
            <div className="flex flex-wrap gap-2">
              {listedSystemNames(game).map((name) => (
                <span
                  key={name}
                  className="rounded bg-white/10 px-2.5 py-1 text-sm font-medium"
                >
                  <PlatformName name={name} iconClassName="h-5 w-5" className="gap-1.5" />
                </span>
              ))}
            </div>

            {display.description ? <GameDescription text={display.description} /> : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {offers.map((offer) => (
                <a
                  key={offer.store}
                  href={offer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={{ borderColor: `${themeColor}66`, color: themeColor }}
                  aria-label={`${game.title} on the ${storeName(offer.store)}${offer.price != null ? `, ${formatEuro(offer.price)}` : ""}`}
                >
                  <span>{storeName(offer.store)}</span>
                  {offer.regularPrice != null && offer.price != null && offer.regularPrice > offer.price && (
                    <span className="text-xs text-muted line-through">{formatEuro(offer.regularPrice)}</span>
                  )}
                  {offer.price != null && <span className="font-semibold text-foreground">{formatEuro(offer.price)}</span>}
                </a>
              ))}
              <LibraryControls gameId={game.id} />
            </div>
            {offers.length > 0 && (
              <p className="text-xs text-muted">Prices in EUR for the Netherlands.</p>
            )}
            {captions.length > 0 && (
              <p className="text-xs text-muted">{captions.join(" ")}</p>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">
            About {game.title}
          </h2>
          <dl className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Genre</dt>
              <dd className="mt-0.5 flex flex-wrap gap-x-1 text-sm text-foreground/90">
                {game.genres.map((genre, index) => (
                  <span key={genre}>
                    <Link
                      href={`/?genre=${encodeURIComponent(genre)}`}
                      className="rounded transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {genre}
                    </Link>
                    {index < game.genres.length - 1 ? ", " : ""}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Release year</dt>
              <dd className="mt-0.5 text-sm text-foreground/90">{game.releaseYear}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Rating</dt>
              <dd className="mt-0.5 text-sm text-foreground/90">{formatRating(game.rating)}/10</dd>
            </div>
            {game.developers.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Developers</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-x-1 text-sm text-foreground/90">
                  {game.developers.map((company, index) => (
                    <span key={company.id} className="inline-flex items-center">
                      <Link
                        href={`/studio/${encodeURIComponent(company.id)}`}
                        className="inline-flex items-center gap-1 rounded transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <StudioLogo name={company.name} className="h-4" />
                        {company.name}
                      </Link>
                      {index < game.developers.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {game.publishers.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Publishers</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-x-1 text-sm text-foreground/90">
                  {game.publishers.map((company, index) => (
                    <span key={company.id} className="inline-flex items-center">
                      <Link
                        href={`/studio/${encodeURIComponent(company.id)}`}
                        className="inline-flex items-center gap-1 rounded transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <StudioLogo name={company.name} className="h-4" />
                        {company.name}
                      </Link>
                      {index < game.publishers.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {game.franchises.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Franchises</dt>
                <NamedCatalogueLinks names={game.franchises} hrefFor={franchiseHref} />
              </div>
            )}
            {game.collections.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Collections</dt>
                <NamedCatalogueLinks names={game.collections} hrefFor={collectionHref} />
              </div>
            )}
            {game.themes.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Themes</dt>
                <dd className="mt-0.5 flex flex-wrap gap-x-1 text-sm text-foreground/90">
                  {game.themes.map((theme, index) => (
                    <span key={theme}>
                      <Link
                        href={`/?search=${encodeURIComponent(theme)}`}
                        className="rounded transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {theme}
                      </Link>
                      {index < game.themes.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {display.screenshots.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Screenshots</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {display.screenshots.map((screenshot) => (
                <a
                  key={screenshot.url}
                  href={screenshot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-video overflow-hidden rounded-lg bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Open full-size ${game.title} screenshot`}
                >
                  <Image
                    src={screenshot.url}
                    alt={`${game.title} screenshot`}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {display.videos.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Trailers</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {display.videos.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col overflow-hidden rounded-xl bg-card shadow-lg shadow-black/40 ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50 hover:ring-2 hover:ring-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="relative aspect-video overflow-hidden bg-black/40">
                    {getYouTubeThumbnail(video.url) && (
                      <Image
                        src={getYouTubeThumbnail(video.url) ?? ""}
                        alt=""
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                        loading="lazy"
                      />
                    )}
                    <span
                      className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-black/50 ring-4 ring-black/25 transition duration-300 group-hover:scale-105"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.04-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
                      </svg>
                    </span>
                  </span>
                  <span className="border-t border-white/10 px-3 py-2.5 text-sm font-semibold text-foreground">
                    {video.name || `${game.title} trailer`}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {(game.dlc.length > 0 || game.expansions.length > 0 || game.editions.length > 0 || game.relatedGames.length > 0) && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Related content</h2>
            <LabeledContentGrid
              items={[
                ...game.dlc.map((item) => ["DLC", item.title] as const),
                ...game.expansions.map((item) => ["Expansion", item.title] as const),
                ...game.editions.map((item) => ["Edition", item.title] as const),
                ...game.relatedGames.map((item) => [item.relation, item.title] as const),
              ]}
            />
          </section>
        )}

        {game.similarGames.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Similar games</h2>
            <div className="flex gap-4 overflow-x-auto pb-3">
              {game.similarGames.map((item) => (
                <SimilarGameCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

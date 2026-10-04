import { notFound } from "next/navigation";
import Link from "next/link";
import { allGames, Platform, PLATFORM_COLORS } from "@/data/games";
import Image from "next/image";
import LibraryControls from "@/components/LibraryControls";

interface GameDetailPageProps {
  params: Promise<{ id: string }>;
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

  // Get primary platform for theming
  const primaryPlatform: Platform = game.platforms[0];
  const themeColor = PLATFORM_COLORS[primaryPlatform];

  return (
    <div className="min-h-screen">
      {/* Background with theme color */}
      <div className="absolute inset-0" style={{ backgroundColor: `${themeColor}1a` }} />
      
      {/* Header with back button */}
      <header className="relative sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {game.title}
          </h1>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero section with cover art */}
        <section className="relative mb-12 flex flex-col gap-6 lg:flex-row lg:gap-12">
          {/* Cover art */}
          <div className="relative mx-auto h-64 w-44 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:h-80 sm:w-56 lg:mx-0 lg:h-96 lg:w-64" style={{ borderColor: `${themeColor}33` }}>
            <Image
              src={game.cover?.url ?? ""}
              alt={game.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
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
                <span className="text-yellow-400" aria-label={`Rating ${game.rating} out of 10`}>
                  <span aria-hidden="true">★ </span>
                  {game.rating}
                </span>
                <span aria-hidden="true">•</span>
                <span className="font-medium">{game.genres.join(", ")}</span>
              </div>
            </div>

            {/* Platforms */}
            <div className="flex flex-wrap gap-2">
              {game.platforms.map((p: Platform) => (
                <span
                  key={p}
                  className="rounded bg-white/10 px-3 py-1 text-sm font-medium"
                  style={{ borderColor: PLATFORM_COLORS[p] }}
                >
                  {p}
                </span>
              ))}
            </div>

            {/* Description */}
            {game.description && (
              <div className="mt-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
                  Description
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  {game.description}
                </p>
              </div>
            )}

            {/* Details button (placeholder for future functionality) */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button 
                className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ borderColor: `${themeColor}33`, color: themeColor }}
              >
                View on Store
              </button>
              <LibraryControls gameId={game.id} />
            </div>
          </div>
        </section>

        {/* Additional sections placeholder */}
        <section className="mb-12">
          <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">
            About {game.title}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-card p-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted mb-2">
                Genre
              </h3>
              <p className="text-sm text-foreground/80">{game.genres.join(", ")}</p>
            </div>
            <div className="rounded-lg bg-card p-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted mb-2">
                Release Year
              </h3>
              <p className="text-sm text-foreground/80">{game.releaseYear}</p>
            </div>
            <div className="rounded-lg bg-card p-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted mb-2">
                Rating
              </h3>
              <p className="text-sm text-foreground/80">{game.rating}/10</p>
            </div>
          </div>
        </section>

        {(game.developers.length > 0 || game.publishers.length > 0 || game.themes.length > 0) && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Credits and themes</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {game.developers.length > 0 && (
                <div className="rounded-lg bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted">Developers</h3>
                  <p className="text-sm text-foreground/80">{game.developers.map((company) => company.name).join(", ")}</p>
                </div>
              )}
              {game.publishers.length > 0 && (
                <div className="rounded-lg bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted">Publishers</h3>
                  <p className="text-sm text-foreground/80">{game.publishers.map((company) => company.name).join(", ")}</p>
                </div>
              )}
              {game.themes.length > 0 && (
                <div className="rounded-lg bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted">Themes</h3>
                  <p className="text-sm text-foreground/80">{game.themes.join(", ")}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {game.screenshots.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Screenshots</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {game.screenshots.map((screenshot) => (
                <div key={screenshot.url} className="relative aspect-video overflow-hidden rounded-lg bg-card">
                  <Image src={screenshot.url} alt={`${game.title} screenshot`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </section>
        )}

        {(game.dlc.length > 0 || game.expansions.length > 0 || game.editions.length > 0 || game.relatedGames.length > 0 || game.similarGames.length > 0) && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Related content</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...game.dlc.map((item) => ["DLC", item.title] as const),
                ...game.expansions.map((item) => ["Expansion", item.title] as const),
                ...game.editions.map((item) => ["Edition", item.title] as const),
                ...game.relatedGames.map((item) => [item.relation, item.title] as const),
                ...game.similarGames.map((item) => ["Similar", item.title] as const)].map(([label, title]) => (
                <div key={`${label}-${title}`} className="rounded-lg bg-card p-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
                  <p className="mt-1 text-sm text-foreground/80">{title}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

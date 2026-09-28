import { notFound } from "next/navigation";
import { allGames, Platform, PLATFORM_COLORS } from "@/data/games";
import Image from "next/image";

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const game = allGames.find(g => g.id === params.id);
  
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
          <a
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
          </a>
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {game.title}
          </h1>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero section with cover art */}
        <section className="relative mb-12 flex flex-col gap-6 lg:flex-row lg:gap-12">
          {/* Cover art */}
          <div className="mx-auto h-64 w-44 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:h-80 sm:w-56 lg:mx-0 lg:h-96 lg:w-64" style={{ borderColor: `${themeColor}33` }}>
            <Image
              src={game.cover}
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
                <span>{game.year}</span>
                <span aria-hidden="true">2</span>
                <span className="text-yellow-400" aria-label={`Rating ${game.rating} out of 10`}>
                  <span aria-hidden="true">605 </span>
                  {game.rating}
                </span>
                <span aria-hidden="true">2</span>
                <span className="font-medium">{game.genre}</span>
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
            <div className="mt-4 flex gap-3">
              <button 
                className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ borderColor: `${themeColor}33`, color: themeColor }}
              >
                View on Store
              </button>
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
              <p className="text-sm text-foreground/80">{game.genre}</p>
            </div>
            <div className="rounded-lg bg-card p-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted mb-2">
                Release Year
              </h3>
              <p className="text-sm text-foreground/80">{game.year}</p>
            </div>
            <div className="rounded-lg bg-card p-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted mb-2">
                Rating
              </h3>
              <p className="text-sm text-foreground/80">{game.rating}/10</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

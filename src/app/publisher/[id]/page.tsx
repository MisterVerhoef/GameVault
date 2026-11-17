import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import GameDescription from "@/components/GameDescription";
import PublisherGamesWall from "@/components/PublisherGamesWall";
import type { CatalogueCard } from "@/data/catalogue-card";
import { allPublishers, getPublisher } from "@/data/publishers";
import { describePublisher, publisherMetadata, sortPublisherGames } from "@/data/publisher-profile";
import { StudioLogo } from "@/components/studio-logos";
import {
  fetchIgdbPublisherGames,
  fetchIgdbPublisherProfile,
} from "@/lib/igdb/client";
import type { IgdbBasicGame } from "@/lib/igdb/types";

interface PublisherPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return allPublishers().map((publisher) => ({ id: publisher.id }));
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateMetadata({ params }: PublisherPageProps): Promise<Metadata> {
  const { id } = await params;
  const publisher = getPublisher(id);
  if (publisher) return { title: `${publisher.name} · GameVault` };
  const live = await fetchIgdbPublisherProfile(id);
  return { title: live ? `${live.name} · GameVault` : "Publisher not found · GameVault" };
}

function igdbBasicToCard(game: IgdbBasicGame): CatalogueCard {
  return {
    id: game.id,
    title: game.title,
    platforms: game.platforms?.length ? game.platforms : ["Other"],
    ...(game.releaseYear != null ? { releaseYear: game.releaseYear } : {}),
    ...(game.cover ? { cover: game.cover } : {}),
  };
}

export default async function PublisherPage({ params }: PublisherPageProps) {
  const { id } = await params;
  const cataloguePublisher = getPublisher(id);
  const igdbProfile = cataloguePublisher ? null : await fetchIgdbPublisherProfile(id);
  const igdbGames = await fetchIgdbPublisherGames(id);

  if (!cataloguePublisher && !igdbProfile && igdbGames.length === 0) notFound();

  const name = cataloguePublisher?.name ?? igdbProfile?.name ?? "Publisher";
  const heroUrl = cataloguePublisher?.backgroundUrl
    ?? cataloguePublisher?.games.find((game) => game.cover?.url)?.cover?.url
    ?? igdbGames.find((game) => game.cover?.url)?.cover?.url;

  const catalogueCards: CatalogueCard[] = (cataloguePublisher?.games ?? []).map((game) => ({
    id: game.id,
    title: game.title,
    cover: game.cover ? { url: game.cover.url } : undefined,
    platforms: game.platforms,
    platformVariants: game.platformVariants,
    releaseYear: game.releaseYear,
    rating: game.rating,
  }));

  const catalogueIds = new Set(catalogueCards.map((game) => game.id));
  const mergedGames = sortPublisherGames([
    ...catalogueCards,
    ...igdbGames.filter((game) => !catalogueIds.has(game.id)).map(igdbBasicToCard),
  ]);

  const years = mergedGames
    .map((game) => game.releaseYear)
    .filter((year): year is number => typeof year === "number");
  const yearStart = cataloguePublisher?.yearStart
    ?? (years.length > 0 ? Math.min(...years) : undefined);
  const yearEnd = cataloguePublisher?.yearEnd
    ?? (years.length > 0 ? Math.max(...years) : undefined);

  const gameCount = mergedGames.length;
  const metadata = publisherMetadata({
    gameCount,
    yearStart,
    yearEnd,
  });

  const summary = describePublisher({
    name,
    publishedCount: gameCount,
    yearStart,
    yearEnd,
    notableTitles: mergedGames.slice(0, 3).map((game) => game.title),
  });

  return (
    <div className="relative min-h-screen">
      <a
        href="#publisher-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {name}
            </h1>
          </div>
        </div>
      </div>

      <section className="relative h-44 overflow-hidden sm:h-60" aria-hidden="true">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-600 via-zinc-800 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-black/25" />
      </section>

      <main id="publisher-content" tabIndex={-1} className="scroll-mt-20 focus:outline-none">
        <div className="relative mx-auto -mt-12 max-w-[1920px] px-4 sm:-mt-14 sm:px-6 lg:px-8">
          <div className="flex items-end gap-4">
            <StudioLogo
              name={name}
              logo={cataloguePublisher?.logo}
              variant="badge"
            />
            <div className="min-w-0 pb-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                {name}
              </h2>
              <p className="mt-1 text-sm text-muted">{metadata}</p>
            </div>
          </div>

          <GameDescription
            text={summary}
            showHeading={false}
            inset="quarter"
            collapseDesktop={false}
          />
        </div>

        <div className="mt-10">
          <PublisherGamesWall
            title="Published games"
            games={mergedGames}
            resetKey={`publisher:${id}`}
          />
        </div>
      </main>
    </div>
  );
}
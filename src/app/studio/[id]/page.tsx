import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import GameDescription from "@/components/GameDescription";
import GameWall from "@/components/GameWall";
import { allStudios, getStudio } from "@/data/studios";
import { studioInitials, studioMetadata } from "@/data/studio-profile";

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return allStudios().map((studio) => ({ id: studio.id }));
}

export const dynamicParams = false;

export default async function StudioPage({ params }: StudioPageProps) {
  const { id } = await params;
  const studio = getStudio(id);
  if (!studio) notFound();

  const metadata = studioMetadata({
    developedCount: studio.developedIds.length,
    publishedCount: studio.publishedIds.length,
    gameCount: studio.games.length,
    yearStart: studio.yearStart,
    yearEnd: studio.yearEnd,
  });

  return (
    <div className="relative min-h-screen">
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
              {studio.name}
            </h1>
          </div>
        </div>
      </div>

      <section className="relative h-44 overflow-hidden sm:h-60" aria-hidden="true">
        {studio.backgroundUrl ? (
          <Image
            src={studio.backgroundUrl}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-black/25" />
      </section>

      <div className="relative mx-auto -mt-12 max-w-[1920px] px-4 sm:-mt-14 sm:px-6 lg:px-8">
        <div className="flex items-end gap-4">
          <div
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-card text-xl font-bold tracking-wide text-foreground shadow-xl ring-4 ring-background sm:h-28 sm:w-28 sm:text-3xl"
            aria-hidden="true"
          >
            {studioInitials(studio.name)}
          </div>
          <div className="min-w-0 pb-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              {studio.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{metadata}</p>
          </div>
        </div>

        <GameDescription
          text={studio.summary}
          showHeading={false}
          inset="quarter"
          collapseDesktop={false}
        />
        <p className="mt-2 text-xs text-muted">Summary from the GameVault catalogue.</p>
      </div>

      <div className="mt-10">
        <GameWall
          title="Games"
          games={studio.games}
          resetKey={`studio:${studio.id}`}
          titleLevel="h2"
          focusTitle={false}
        />
      </div>
    </div>
  );
}

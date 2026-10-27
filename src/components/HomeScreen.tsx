"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import GameWall from "@/components/GameWall";
import { useLibrary } from "@/context/LibraryContext";
import { useBrowseCatalogue } from "@/data/load-browse-catalogue";
import { buildLibraryView, readHomeQuery, sameHomeQuery, type LibraryView } from "@/data/library-view";

export default function HomeScreen({ initialView }: { initialView: LibraryView }) {
  const params = useSearchParams();
  const queryString = params.toString();
  const urlSearch = params.get("search") ?? "";
  const [draftSearch, setDraftSearch] = useState(urlSearch);
  const [trackedQuery, setTrackedQuery] = useState(queryString);
  if (queryString !== trackedQuery) {
    setTrackedQuery(queryString);
    setDraftSearch(urlSearch);
  }
  const { catalogue, failed } = useBrowseCatalogue(true);
  const { entries, ready } = useLibrary();
  const playingIds = useMemo(
    () => Object.entries(entries).filter(([, entry]) => entry.status === "playing").map(([gameId]) => gameId),
    [entries],
  );

  const liveQuery = readHomeQuery({
    search: draftSearch,
    family: params.get("family"),
    platform: params.get("platform"),
    variant: params.get("variant"),
    genre: params.get("genre"),
    exclusives: params.get("exclusives"),
  });
  const view = catalogue && (!sameHomeQuery(liveQuery, initialView.query) || (ready && playingIds.length > 0))
    ? buildLibraryView(catalogue, liveQuery, ready ? playingIds : [])
    : initialView;

  const featured = view.heroGames[0] ?? view.featuredGame;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Navbar searchQuery={urlSearch} onSearch={setDraftSearch} />

      <main id="main-content" className="flex-1">
        {failed && !catalogue && !sameHomeQuery(liveQuery, initialView.query) ? (
          <p className="mx-auto max-w-[1920px] px-4 pt-4 text-sm text-muted sm:px-6 lg:px-8">
            The catalogue could not be loaded. This page is showing the last results.
          </p>
        ) : null}
        {view.wall ? (
          <GameWall
            key={view.wall.key}
            title={view.wall.title}
            platformLabel={view.place}
            games={view.wall.games}
            resetKey={view.wall.key}
            backHref={view.wall.backHref}
            backLabel={view.wall.backLabel}
            emptyLabel={view.wall.emptyLabel}
            sections={view.wall.sections}
          />
        ) : (
          <>
            {featured ? (
              <Hero
                featuredGame={featured}
                featuredGames={view.heroGames}
                selectedPlatform={view.query.platform}
              />
            ) : null}
            {view.place && (
              view.topGames.length > 0 ? (
                <GameRow title={`${view.place} Top Games`} platformLabel={view.place} games={view.topGames} />
              ) : (
                <p className="mx-auto mb-10 max-w-[1920px] px-4 text-sm text-muted sm:px-6 lg:px-8">
                  No games in the catalogue match {view.place}.
                </p>
              )
            )}
            {view.exclusivePreview.length > 0 && view.place ? (
              <GameRow
                title={`${view.place} Exclusives`}
                platformLabel={view.place}
                games={view.exclusivePreview}
                titleHref={view.exclusiveHref}
              />
            ) : null}
            <GameRow title="Featured Games" games={view.continueGames} size="lg" />
            {view.genreRows.map((row) => (
              <GameRow
                key={row.key}
                title={row.label}
                games={row.games}
                titleHref={row.href}
              />
            ))}
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-white/5 px-4 py-6 text-center text-sm text-muted sm:mt-16 sm:py-8">
        <p className="px-2 text-xs opacity-60 sm:text-sm">
          Built with Next.js + Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

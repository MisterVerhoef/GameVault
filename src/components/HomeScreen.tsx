"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GameRow from "@/components/GameRow";
import GameWall from "@/components/GameWall";
import { useLibrary } from "@/context/LibraryContext";
import { browseQuery, type GenreSort } from "@/data/browse";
import { useBrowseCatalogue } from "@/data/load-browse-catalogue";
import { buildLibraryView, readHomeQuery, sameHomeQuery, type LibraryView } from "@/data/library-view";
import { useIgdbLiveSearch } from "@/data/use-igdb-live-search";
import IgdbLiveSearchSection from "@/components/IgdbLiveSearchSection";

function HomeMainBody({
  view,
  queryDirty,
  catalogueFailed,
  catalogueReady,
  genreSort,
  onSortChange,
  igdbLive,
}: {
  view: LibraryView;
  queryDirty: boolean;
  catalogueFailed: boolean;
  catalogueReady: boolean;
  genreSort: boolean;
  onSortChange: (sort: GenreSort) => void;
  igdbLive: ReturnType<typeof useIgdbLiveSearch>;
}) {
  const featured = view.heroGames[0] ?? view.featuredGame;

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-20 focus:outline-none">
      {queryDirty && !catalogueReady ? (
        <p className="mx-auto max-w-[1920px] px-4 pt-4 text-sm text-muted sm:px-6 lg:px-8" role="status">
          {catalogueFailed
            ? "The catalogue could not be loaded. This page is showing the last results."
            : "Searching the catalogue."}
        </p>
      ) : null}
      {view.wall ? (
        <>
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
            sortValue={genreSort ? view.query.sort : undefined}
            onSortChange={genreSort ? onSortChange : undefined}
          />
          {view.searching && igdbLive.visible ? (
            <IgdbLiveSearchSection loading={igdbLive.loading} games={igdbLive.games} />
          ) : null}
        </>
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
  );
}

function HomeMain({
  initialView,
  draftSearch,
  setDraftSearch,
  prepareSearch,
}: {
  initialView: LibraryView;
  draftSearch: string;
  setDraftSearch: (search: string) => void;
  prepareSearch: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const urlSearch = params.get("search") ?? "";

  useEffect(() => {
    setDraftSearch(urlSearch);
  }, [urlSearch, setDraftSearch]);

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
    sort: params.get("sort"),
  });
  const queryDirty = !sameHomeQuery(liveQuery, initialView.query);
  const libraryDirty = ready && playingIds.length > 0;
  const loadSearch = prepareSearch || queryDirty;
  const { catalogue, failed } = useBrowseCatalogue(loadSearch, loadSearch || libraryDirty);
  const searchReady = !queryDirty || catalogue?.termsById != null;
  const view = catalogue && searchReady && (queryDirty || libraryDirty)
    ? buildLibraryView(catalogue, liveQuery, ready ? playingIds : [])
    : initialView;

  const catalogueSearchCount = view.wall?.games.length ?? 0;
  const igdbLive = useIgdbLiveSearch(view.trimmedSearch, catalogueSearchCount, Boolean(view.wall && view.searching));
  const genreSort = Boolean(view.query.genre) && !view.searching && view.wall != null;
  const onSortChange = (sort: GenreSort) => {
    router.push(browseQuery({
      search: view.query.search,
      family: view.query.family,
      platform: view.query.platform,
      variant: view.query.variant,
      genre: view.query.genre,
      exclusives: view.query.exclusives,
      sort,
    }));
  };

  return (
    <HomeMainBody
      view={view}
      queryDirty={queryDirty}
      catalogueFailed={failed}
      catalogueReady={Boolean(catalogue?.termsById)}
      genreSort={genreSort}
      onSortChange={onSortChange}
      igdbLive={igdbLive}
    />
  );
}

export default function HomeScreen({ initialView }: { initialView: LibraryView }) {
  const [draftSearch, setDraftSearch] = useState(initialView.query.search);
  const [prepareSearch, setPrepareSearch] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Navbar searchQuery={draftSearch} onSearch={setDraftSearch} onSearchPrepare={() => setPrepareSearch(true)} />

      <Suspense
        fallback={(
          <HomeMainBody
            view={initialView}
            queryDirty={false}
            catalogueFailed={false}
            catalogueReady
            genreSort={false}
            onSortChange={() => {}}
            igdbLive={{ loading: false, games: [], visible: false }}
          />
        )}
      >
        <HomeMain
          initialView={initialView}
          draftSearch={draftSearch}
          setDraftSearch={setDraftSearch}
          prepareSearch={prepareSearch}
        />
      </Suspense>

      <footer className="mt-12 border-t border-white/5 px-4 py-6 text-center text-sm text-muted sm:mt-16 sm:py-8">
        <p className="px-2 text-xs opacity-60 sm:text-sm">
          Built with Next.js + Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

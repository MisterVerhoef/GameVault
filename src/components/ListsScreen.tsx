"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GameCard from "@/components/GameCard";
import Navbar from "@/components/Navbar";
import { useRovingCards } from "@/components/use-roving-cards";
import { useLists } from "@/context/ListsContext";
import { LIST_NAME_LIMIT } from "@/context/game-lists";
import { findBrowseGame, toCard } from "@/data/library-view";
import { useBrowseCatalogue } from "@/data/load-browse-catalogue";

function gameCountLabel(count: number) {
  return `${count} ${count === 1 ? "game" : "games"}`;
}

function ListForm({ onCreate }: { onCreate: (name: string) => { error?: string } }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const result = onCreate(name);
        if (result.error) {
          setError(result.error);
          setAnnouncement(result.error);
          return;
        }
        setName("");
        setError("");
        setAnnouncement("List created");
      }}
      className="rounded-2xl border border-white/10 bg-card p-4 sm:p-5"
    >
      <label htmlFor="create-list-name" className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted">New list</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="create-list-name"
          value={name}
          onChange={(event) => { setName(event.target.value); setError(""); }}
          maxLength={LIST_NAME_LIMIT}
          placeholder="e.g. Couch co-op"
          className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Create list
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </form>
  );
}

function ListNameEditor({ listId, currentName, onSave }: {
  listId: string;
  currentName: string;
  onSave: (name: string) => { error?: string };
}) {
  const [name, setName] = useState(currentName);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Rename list ${currentName}`}
        className="inline-flex min-h-11 items-center rounded-full bg-card px-3 text-xs font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Rename
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const result = onSave(name);
        if (result.error) { setError(result.error); return; }
        setEditing(false);
        setError("");
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label htmlFor={`rename-list-${listId}`} className="sr-only">New name for {currentName}</label>
      <input
        id={`rename-list-${listId}`}
        value={name}
        onChange={(event) => { setName(event.target.value); setError(""); }}
        maxLength={60}
        className="h-11 min-w-0 rounded-lg border border-white/10 bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button type="submit" className="min-h-11 rounded-full bg-accent px-3 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Save</button>
      <button type="button" onClick={() => { setEditing(false); setName(currentName); setError(""); }} className="min-h-11 rounded-full bg-card px-3 text-xs text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Cancel</button>
      {error && <p role="alert" className="basis-full text-xs text-red-500">{error}</p>}
    </form>
  );
}

export default function ListsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedId = params.get("id");
  const { state, ready, create, rename, remove, removeGame } = useLists();
  const { catalogue, failed } = useBrowseCatalogue(false);
  const [announcement, setAnnouncement] = useState("");

  const lists = useMemo(
    () => [...state.lists].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.name.localeCompare(right.name)),
    [state.lists],
  );
  const activeList = requestedId ? state.lists.find((list) => list.id === requestedId) : undefined;
  const knownGames = useMemo(() => {
    if (!catalogue || !activeList) return [];
    return activeList.gameIds.flatMap((gameId) => {
      const game = findBrowseGame(catalogue, gameId);
      return game ? [{ id: gameId, game: toCard(game) }] : [];
    });
  }, [activeList, catalogue]);
  const missingIds = activeList?.gameIds.filter((id) => !knownGames.some((item) => item.id === id)) ?? [];
  const { ref, onFocus } = useRovingCards<HTMLUListElement>(knownGames.length);

  const handleCreate = (name: string) => {
    const result = create(name);
    return "error" in result ? { error: result.error } : {};
  };
  const handleRename = (listId: string, name: string) => {
    const result = rename(listId, name);
    return "error" in result ? { error: result.error } : {};
  };
  const handleDelete = (listId: string, name: string) => {
    if (!window.confirm(`Delete the list “${name}”? Games will remain in your vault.`)) return;
    remove(listId);
    setAnnouncement(`Deleted ${name}`);
    if (requestedId) router.push("/lists");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#lists-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white">Skip to content</a>
      <Navbar />
      <div className="border-b border-white/5 bg-background/80">
        <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          {requestedId && (
            <Link href="/lists" aria-label="Back to lists" className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:h-9 md:w-9">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </Link>
          )}
          <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">{requestedId && activeList ? activeList.name : "Lists"}</h1>
          {requestedId && activeList && <span className="ml-auto text-xs text-muted">{gameCountLabel(activeList.gameIds.length)}</span>}
        </div>
      </div>

      <main id="lists-content" tabIndex={-1} className="mx-auto w-full max-w-[1920px] flex-1 scroll-mt-20 px-4 py-8 focus:outline-none sm:px-6 lg:px-8">
        <span className="sr-only" aria-live="polite">{announcement}</span>
        {!ready || (!catalogue && !failed) ? (
          <p className="text-sm text-muted">Loading your lists…</p>
        ) : failed ? (
          <p className="text-sm text-muted">The game catalogue could not be loaded.</p>
        ) : requestedId && !activeList ? (
          <div className="rounded-2xl border border-white/10 bg-card px-5 py-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground">This list doesn&apos;t exist (anymore)</h2>
            <p className="mt-1 text-sm text-muted">It may have been deleted in this browser.</p>
            <Link href="/lists" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Back to Lists</Link>
          </div>
        ) : requestedId && activeList ? (
          <>
            <p className="mb-5 text-sm text-muted">This list is stored in this browser and is independent of your vault.</p>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <ListNameEditor key={activeList.id + activeList.name} listId={activeList.id} currentName={activeList.name} onSave={(name) => handleRename(activeList.id, name)} />
              <button type="button" onClick={() => handleDelete(activeList.id, activeList.name)} aria-label={`Delete list ${activeList.name}`} className="inline-flex min-h-11 items-center rounded-full bg-card px-3 text-xs font-medium text-muted transition hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Delete list</button>
            </div>
            {activeList.gameIds.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-card px-5 py-8">
                <p className="text-sm text-foreground">This list is empty.</p>
                <p className="mt-1 text-sm text-muted">Open a game and choose “Add to list” to put it here.</p>
                <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Browse games</Link>
              </div>
            ) : (
              <>
                {knownGames.length > 0 && (
                  <ul ref={ref} onFocus={onFocus} className="flex list-none flex-wrap gap-x-4 gap-y-5">
                    {knownGames.map(({ id, game }) => (
                      <li key={id} className="w-32 flex-shrink-0 lg:w-44">
                        <GameCard game={game} />
                        <button type="button" onClick={() => { removeGame(activeList.id, id); setAnnouncement(`Removed ${game.title} from ${activeList.name}`); }} className="mt-2 inline-flex min-h-11 items-center rounded-full bg-card px-3 text-xs font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Remove from list</button>
                      </li>
                    ))}
                  </ul>
                )}
                {missingIds.length > 0 && (
                  <div className={knownGames.length ? "mt-5" : undefined}>
                    <p className="text-xs text-muted">Not in the catalogue</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {missingIds.map((id) => <li key={id}><button type="button" onClick={() => removeGame(activeList.id, id)} className="inline-flex min-h-11 items-center rounded-full bg-accent/15 px-3 text-xs text-accent hover:bg-accent/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Remove {id}</button></li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <p className="mb-5 max-w-2xl text-sm text-muted">Make your own groups of games. Lists are stored in this browser and don&apos;t change your vault status, ratings, notes, or progress.</p>
            <div className="mb-8 max-w-2xl"><ListForm onCreate={handleCreate} /></div>
            {lists.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-card px-5 py-8">
                <p className="text-sm text-foreground">You haven&apos;t made any lists yet.</p>
                <p className="mt-1 text-sm text-muted">Create a list above, or open a game and add it to a list.</p>
                <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/10 bg-background px-4 text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Browse games</Link>
              </div>
            ) : (
              <ul className="grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {lists.map((list) => {
                  const covers = list.gameIds.slice(0, 4).flatMap((id) => {
                    const game = catalogue ? findBrowseGame(catalogue, id) : null;
                    return game?.cover ? [{ id, title: game.title, cover: game.cover }] : [];
                  });
                  return (
                    <li key={list.id} className="rounded-2xl border border-white/10 bg-card p-4">
                      <Link href={`/lists?id=${encodeURIComponent(list.id)}`} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                        {covers.length > 0 ? (
                          <div className="grid h-24 gap-1 overflow-hidden rounded-lg bg-background" style={{ gridTemplateColumns: `repeat(${covers.length}, minmax(0, 1fr))` }}>
                            {covers.map((cover) => (
                              <div key={cover.id} className="relative min-w-0 overflow-hidden">
                                <Image src={cover.cover as string} alt={cover.title} fill sizes="80px" className="object-cover" unoptimized />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded-lg bg-background text-xs text-muted">No covers yet</div>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <h2 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground">{list.name}</h2>
                          <span className="shrink-0 text-xs tabular-nums text-muted">{gameCountLabel(list.gameIds.length)}</span>
                        </div>
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ListNameEditor key={list.id + list.name} listId={list.id} currentName={list.name} onSave={(name) => handleRename(list.id, name)} />
                        <button type="button" onClick={() => handleDelete(list.id, list.name)} aria-label={`Delete list ${list.name}`} className="inline-flex min-h-11 items-center rounded-full bg-background px-3 text-xs font-medium text-muted transition hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Delete</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

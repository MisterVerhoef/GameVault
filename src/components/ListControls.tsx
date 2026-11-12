"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LIST_NAME_LIMIT, listsForGame } from "@/context/game-lists";
import { useLists } from "@/context/ListsContext";

export default function ListControls({
  gameId,
  gameTitle,
}: {
  gameId: string;
  gameTitle: string;
}) {
  const { state, ready, create, toggleGame } = useLists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const list = listsForGame(state, gameId);

  const submitNewList = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = create(name);
    if (!("list" in result)) {
      setError(result.error);
      setAnnouncement(result.error);
      return;
    }
    toggleGame(result.list.id, gameId);
    setName("");
    setError("");
    setAnnouncement(`Created ${result.list.name} and added ${gameTitle}`);
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <button
        ref={triggerRef}
        type="button"
        disabled={!ready}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        aria-label={`Add ${gameTitle} to a list`}
        aria-expanded={open}
        aria-controls={`game-lists-${gameId}`}
        className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
      >
        Add to list
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="ml-2 h-4 w-4"
          aria-hidden="true"
        >
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
      </button>

      {list.map((item) => (
        <Link
          key={item.id}
          href={`/lists?id=${encodeURIComponent(item.id)}`}
          className="inline-flex min-h-11 items-center rounded-full bg-accent/15 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {item.name}
        </Link>
      ))}

      {open && (
        <div
          id={`game-lists-${gameId}`}
          className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-card p-4 shadow-xl shadow-black/30"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <h3 className="text-sm font-semibold text-foreground">
            Add {gameTitle} to a list
          </h3>
          {state.lists.length > 0 ? (
            <div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
              {state.lists.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-foreground hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={item.gameIds.includes(gameId)}
                    onChange={() => {
                      toggleGame(item.id, gameId);
                      setAnnouncement(
                        item.gameIds.includes(gameId)
                          ? `Removed from ${item.name}`
                          : `Added to ${item.name}`,
                      );
                    }}
                    className="h-4 w-4 accent-accent"
                  />
                  <span>{item.name}</span>
                  <span className="ml-auto text-xs text-muted">
                    {item.gameIds.length}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">
              You haven&apos;t made any lists yet.
            </p>
          )}
          <form
            onSubmit={submitNewList}
            className="mt-3 border-t border-white/10 pt-3"
          >
            <label
              htmlFor={`new-list-${gameId}`}
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              New list
            </label>
            <div className="flex gap-2">
              <input
                id={`new-list-${gameId}`}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                maxLength={LIST_NAME_LIMIT}
                placeholder="e.g. Couch co-op"
                className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Create
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-500">
                {error}
              </p>
            )}
          </form>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

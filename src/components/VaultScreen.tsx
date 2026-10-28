"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import GameCard from "@/components/GameCard";
import Navbar from "@/components/Navbar";
import WishlistPrices, { WishlistPriceNote, type WishlistOfferState } from "@/components/WishlistPrices";
import { useRovingCards } from "@/components/use-roving-cards";
import {
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  isLibraryStatus,
  useLibrary,
  type LibraryEntry,
  type LibraryStatus,
} from "@/context/LibraryContext";
import type { CatalogueCard } from "@/data/catalogue-card";
import { useBrowseCatalogue } from "@/data/load-browse-catalogue";
import { findBrowseGame, toCard } from "@/data/library-view";
import { useStoreOfferIndex } from "@/data/load-store-offers";

interface VaultItem {
  gameId: string;
  entry: LibraryEntry;
  game?: CatalogueCard;
}

function compareVaultItems(left: VaultItem, right: VaultItem) {
  const byDate = right.entry.updatedAt.localeCompare(left.entry.updatedAt);
  if (byDate !== 0) return byDate;
  return (left.game?.title ?? left.gameId).localeCompare(right.game?.title ?? right.gameId);
}

function VaultShelf({
  status,
  items,
  offerState,
  onRemove,
}: {
  status: LibraryStatus;
  items: VaultItem[];
  offerState: WishlistOfferState;
  onRemove: (gameId: string) => void;
}) {
  const known = items.filter((item) => item.game);
  const missing = items.filter((item) => !item.game);
  const label = LIBRARY_STATUS_LABELS[status];
  const hintId = useId();
  const { ref, onKeyDown, onFocus } = useRovingCards<HTMLUListElement>();

  return (
    <section aria-labelledby={`vault-${status}`} aria-describedby={hintId} className="mb-10">
      <h2 id={`vault-${status}`} className="mb-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
        {label}
        <span className="ml-2 text-sm font-medium text-muted">{items.length}</span>
      </h2>
      <p id={hintId} className="sr-only">
        Arrow keys move between games in {label}.
      </p>
      {status === "wishlist" && known.length > 0 && <WishlistPriceNote state={offerState} />}
      {known.length > 0 && (
        <ul
          ref={ref}
          aria-labelledby={`vault-${status}`}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          className="flex list-none flex-wrap gap-x-4 gap-y-5"
        >
          {known.map((item) => (
            <li key={item.gameId} className="w-32 flex-shrink-0 lg:w-44">
              <GameCard
                game={item.game as CatalogueCard}
                personalRating={item.entry.rating}
                progress={item.entry.progress}
              />
              {status === "wishlist" && item.game && (
                <WishlistPrices
                  gameId={item.game.id}
                  title={item.game.title}
                  platforms={item.game.platforms}
                  state={offerState}
                />
              )}
              {(item.entry.progress > 0 || item.entry.notes) && (
                <div className="mt-1.5 space-y-0.5">
                  {item.entry.progress > 0 && (
                    <p className="text-[11px] font-medium text-muted" aria-hidden="true">{item.entry.progress}% played</p>
                  )}
                  {item.entry.notes && (
                    <p className="line-clamp-2 text-xs leading-snug text-muted">{item.entry.notes}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <div className={known.length > 0 ? "mt-4" : undefined}>
          <p className="text-xs text-muted">Not in the catalogue</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map((item) => (
              <li key={item.gameId}>
                <button
                  type="button"
                  onClick={() => onRemove(item.gameId)}
                  className="inline-flex min-h-11 items-center rounded-full bg-accent/15 px-3 py-1 text-xs text-accent hover:bg-accent/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0"
                >
                  Remove {item.gameId} ({label.toLowerCase()})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function VaultScreen() {
  const params = useSearchParams();
  const { entries, ready, setStatus } = useLibrary();
  const { catalogue, failed } = useBrowseCatalogue(false);
  const requested = params.get("status");
  const activeStatus = isLibraryStatus(requested) ? requested : null;
  const wishlistCount = useMemo(
    () => Object.values(entries).filter((entry) => entry.status === "wishlist").length,
    [entries],
  );
  const showWishlistPrices = ready && wishlistCount > 0 && (activeStatus == null || activeStatus === "wishlist");
  const storeOffers = useStoreOfferIndex(showWishlistPrices);
  const offerState: WishlistOfferState = !showWishlistPrices
    ? { status: "hidden" }
    : storeOffers.failed
      ? { status: "error" }
      : storeOffers.index
        ? { status: "ready", index: storeOffers.index }
        : { status: "loading" };

  const groups = useMemo(() => {
    return LIBRARY_STATUSES.map((status) => ({
      status,
      items: Object.entries(entries)
        .filter(([, entry]) => entry.status === status)
        .map(([gameId, entry]) => ({
          gameId,
          entry,
          game: catalogue ? (() => {
            const match = findBrowseGame(catalogue, gameId);
            return match ? toCard(match) : undefined;
          })() : undefined,
        }))
        .sort(compareVaultItems),
    }));
  }, [catalogue, entries]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const selected = activeStatus ? groups.filter((group) => group.status === activeStatus) : groups;
  const visible = selected.filter((group) => group.items.length > 0);

  const chipClass = (selected: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 ${
      selected ? "bg-accent text-white" : "bg-card text-muted hover:text-foreground"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#vault-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
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
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
            My vault
          </h1>
          <Link
            href="/stats"
            className="ml-auto inline-flex min-h-11 items-center rounded px-1 text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0"
          >
            Stats
          </Link>
        </div>
      </div>

      <main id="vault-content" tabIndex={-1} className="mx-auto w-full max-w-[1920px] flex-1 scroll-mt-20 px-4 py-8 focus:outline-none sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm text-muted">
          Your personal library, stored in this browser. Filter by status, then open a game to change progress, rating, or notes.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
          <Link href="/vault" aria-current={activeStatus == null ? "page" : undefined} className={chipClass(activeStatus == null)}>
            All
            <span className="ml-1.5 tabular-nums">{ready ? total : "–"}</span>
          </Link>
          {groups.map((group) => (
            <Link
              key={group.status}
              href={`/vault?status=${group.status}`}
              aria-current={activeStatus === group.status ? "page" : undefined}
              className={chipClass(activeStatus === group.status)}
            >
              {LIBRARY_STATUS_LABELS[group.status]}
              <span className="ml-1.5 tabular-nums">{ready ? group.items.length : "–"}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-8">
          {!ready || (!catalogue && !failed) ? (
            <p className="text-sm text-muted">Loading your vault…</p>
          ) : failed ? (
            <p className="text-sm text-muted">The game catalogue could not be loaded.</p>
          ) : total === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-card px-5 py-8">
              <p className="text-sm text-foreground">Nothing in your vault yet.</p>
              <p className="mt-1 text-sm text-muted">Open a game and choose a library status. It will show up here.</p>
              <Link
                href="/"
                className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Browse games
              </Link>
            </div>
          ) : visible.length === 0 && activeStatus ? (
            <p className="text-sm text-muted">
              No games marked as {LIBRARY_STATUS_LABELS[activeStatus].toLowerCase()}.
            </p>
          ) : (
            visible.map((group) => (
              <VaultShelf
                key={group.status}
                status={group.status}
                items={group.items}
                offerState={group.status === "wishlist" ? offerState : { status: "hidden" }}
                onRemove={(gameId) => setStatus(gameId, null)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
